import { beforeEach, expect, it, vi } from 'vitest'
import type { H3Event } from 'h3'

type TestError = Error & {
  statusCode?: number
  statusMessage?: string
}

type CreateErrorInput = {
  statusCode: number
  statusMessage?: string
  message?: string
}

type EventHandler = (...args: unknown[]) => unknown

const {
  selectMock,
  insertMock,
  deleteMock,
  parseUploadFormMock,
  checkRateLimitMock,
  getClientIpMock,
  getHeaderMock,
  storeEncryptedFileMock,
  hashSharePasswordMock,
  nanoidMock,
} = vi.hoisted(() => ({
  selectMock: vi.fn(),
  insertMock: vi.fn(),
  deleteMock: vi.fn(),
  parseUploadFormMock: vi.fn(),
  checkRateLimitMock: vi.fn(),
  getClientIpMock: vi.fn(),
  getHeaderMock: vi.fn(),
  storeEncryptedFileMock: vi.fn(),
  hashSharePasswordMock: vi.fn(),
  nanoidMock: vi.fn(),
}))

const dbMock = { select: selectMock, insert: insertMock, delete: deleteMock }

vi.mock('../db/index', () => ({ db: dbMock }))
vi.mock('../db/schema', () => ({
  shares: { token: 'token', id: 'id' },
  files: { share_id: 'share_id' },
  settings: { id: 'id', max_file_size: 'max_file_size' },
}))
vi.mock('drizzle-orm', () => ({ eq: vi.fn(() => ({ kind: 'eq' })) }))
vi.mock('nanoid', () => ({ nanoid: nanoidMock }))
vi.mock('../utils/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

const createErrorMessage = (statusCode: number, statusMessage: string) => {
  const error = new Error(statusMessage) as TestError
  error.statusCode = statusCode
  error.statusMessage = statusMessage
  return error
}

vi.stubGlobal('defineEventHandler', (handler: EventHandler) => handler)

vi.stubGlobal(
  'createError',
  ({ statusCode, statusMessage, message }: CreateErrorInput) =>
    createErrorMessage(statusCode, statusMessage ?? message ?? ''),
)

vi.stubGlobal('checkRateLimit', checkRateLimitMock)
vi.stubGlobal('getClientIp', getClientIpMock)
vi.stubGlobal('getHeader', getHeaderMock)
vi.stubGlobal('formatBytes', (value: number) => `${value} B`)

vi.stubGlobal('parseUploadForm', parseUploadFormMock)
vi.stubGlobal('hashSharePassword', hashSharePasswordMock)
vi.stubGlobal('storeEncryptedFile', storeEncryptedFileMock)

const { default: upload } = await import('./upload.post')

const configuredSettings = (overrides = {}) => ({
  max_file_size: 1024 * 1024,
  allow_passwordless_shares: true,
  allow_permanent_shares: true,
  max_expiry_days: null,
  cap_download_based_expiry: false,
  ...overrides,
})

const makeEvent = (): H3Event =>
({
	context: {},
    node: { req: {} },
    headers: {},
}) as H3Event

beforeEach(() => {
  vi.clearAllMocks()
  selectMock.mockReset()
  insertMock.mockReset()
  deleteMock.mockReset()

  getClientIpMock.mockReturnValue('127.0.0.1')
  getHeaderMock.mockReturnValue(undefined)
  nanoidMock.mockReturnValue('generated-token')
  hashSharePasswordMock.mockImplementation(async (value) => `hash:${value}`)

  selectMock.mockReturnValue({
    from: vi.fn(() => ({
      limit: vi.fn(async () => [configuredSettings()]),
      where: vi.fn(() => ({
        limit: vi.fn(async () => []),
      })),
    })),
  })

  insertMock.mockReturnValue({
    values: vi.fn(() => ({
      returning: vi.fn(async () => [{
        id: 1,
        token: 'generated-token',
      }]),
    })),
  })

  parseUploadFormMock.mockResolvedValue([
    {},
    { files: [{ size: 10 }] },
  ])

  storeEncryptedFileMock.mockResolvedValue(undefined)
})

it('returns 409 when the requested custom slug already exists', async () => {
  parseUploadFormMock.mockResolvedValue([
    { slug: ['taken-slug'] },
    { files: [{ size: 10 }] },
  ])

  selectMock
    .mockReturnValueOnce({
      from: vi.fn(() => ({
        limit: vi.fn(async () => [configuredSettings()]),
      })),
    })
    .mockReturnValueOnce({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => [{ id: 7 }]),
        })),
      })),
    })

  await expect(upload(makeEvent())).rejects.toMatchObject({
    statusCode: 409,
    statusMessage: 'This URL is taken',
  })
})

it('returns 400 when the request contains no files', async () => {
  parseUploadFormMock.mockResolvedValue([
    {},
    { files: [] },
  ])

  await expect(upload(makeEvent())).rejects.toMatchObject({
    statusCode: 400,
    statusMessage: 'Validation failed. No files exist in request',
  })
})

it('returns 400 when passwordless shares are disabled', async () => {
  selectMock.mockReturnValue({
    from: vi.fn(() => ({
      limit: vi.fn(async () => [
        configuredSettings({ allow_passwordless_shares: false }),
      ]),
    })),
  })

  await expect(upload(makeEvent())).rejects.toMatchObject({
    statusCode: 400,
    statusMessage: 'This server requires a password on all shares',
  })
})

it('returns 500 when the server has no configuration', async () => {
  selectMock.mockReturnValue({
    from: vi.fn(() => ({
      limit: vi.fn(async () => []),
    })),
  })

  await expect(upload(makeEvent())).rejects.toMatchObject({
    statusCode: 500,
    statusMessage: 'Server is not configured yet',
  })
})

it('returns 400 for an invalid expiry type', async () => {
  parseUploadFormMock.mockResolvedValue([
    { expiry_type: ['invalid'] },
    { files: [{ size: 10 }] },
  ])

  await expect(upload(makeEvent())).rejects.toMatchObject({
    statusCode: 400,
    statusMessage: 'Invalid expiry type',
  })
})

it('returns 400 for an invalid expiry date', async () => {
  parseUploadFormMock.mockResolvedValue([
    {
      expiry_type: ['date'],
      expires_at: ['not-a-date'],
    },
    { files: [{ size: 10 }] },
  ])

  await expect(upload(makeEvent())).rejects.toMatchObject({
    statusCode: 400,
    statusMessage: 'Invalid date',
  })
})

it('returns 400 for an invalid maximum download count', async () => {
  parseUploadFormMock.mockResolvedValue([
    {
      expiry_type: ['downloads'],
      max_downloads: ['0'],
    },
    { files: [{ size: 10 }] },
  ])

  await expect(upload(makeEvent())).rejects.toMatchObject({
    statusCode: 400,
    statusMessage: 'Invalid maximum download count',
  })
})

it('returns 400 for an invalid custom slug', async () => {
  parseUploadFormMock.mockResolvedValue([
    { slug: ['bad slug'] },
    { files: [{ size: 10 }] },
  ])

  await expect(upload(makeEvent())).rejects.toMatchObject({
    statusCode: 400,
  })
})

it('accepts a short share password', async () => {
  parseUploadFormMock.mockResolvedValue([
    { password: ['x'] },
    { files: [{ size: 10 }] },
  ])

  await expect(upload(makeEvent())).resolves.toEqual({
    token: 'generated-token',
  })
  expect(hashSharePasswordMock).toHaveBeenCalledWith('x')
})

it('returns 400 when a file exceeds the configured size limit', async () => {
  parseUploadFormMock.mockResolvedValue([
    {},
    { files: [{ size: 2048 }] },
  ])

  selectMock.mockReturnValue({
    from: vi.fn(() => ({
      limit: vi.fn(async () => [
        configuredSettings({ max_file_size: 1024 }),
      ]),
    })),
  })

  await expect(upload(makeEvent())).rejects.toMatchObject({
    statusCode: 400,
    statusMessage: 'File exceeds the maximum allowed size of 1024 B',
  })
})

it('returns 400 when permanent shares are disabled', async () => {
  parseUploadFormMock.mockResolvedValue([
    { expiry_type: ['permanent'] },
    { files: [{ size: 10 }] },
  ])

  selectMock.mockReturnValue({
    from: vi.fn(() => ({
      limit: vi.fn(async () => [
        configuredSettings({ allow_permanent_shares: false }),
      ]),
    })),
  })

  await expect(upload(makeEvent())).rejects.toMatchObject({
    statusCode: 400,
    statusMessage: 'Permanent shares are disabled on this server',
  })
})

it('rolls back the share and completed files when a later file fails to store', async () => {
  parseUploadFormMock.mockResolvedValue([
    {},
    { files: [{ size: 10 }, { size: 10 }] },
  ])

  let deleteCall = 0
  deleteMock.mockReturnValue({
    where: vi.fn(async () => { deleteCall += 1 }),
  })
  storeEncryptedFileMock
    .mockResolvedValueOnce({ id: 11, storedName: 'missing-file' })
    .mockRejectedValueOnce(new Error('disk full'))

  await expect(upload(makeEvent())).rejects.toMatchObject({
    statusCode: 500,
    statusMessage: 'Failed to store uploaded files',
  })
  expect(deleteCall).toBe(2)
})

it('caps download-based expiry when configured', async () => {
  parseUploadFormMock.mockResolvedValue([
    {
      expiry_type: ['downloads'],
      max_downloads: ['5'],
    },
    { files: [{ size: 10 }] },
  ])

  selectMock.mockReturnValue({
    from: vi.fn(() => ({
      limit: vi.fn(async () => [
        configuredSettings({
          max_expiry_days: 7,
          cap_download_based_expiry: true,
        }),
      ]),
    })),
  })

  const returningMock = vi.fn(async () => [{
    id: 2,
    token: 'generated-token',
  }])

  insertMock.mockReturnValue({
    values: vi.fn((values) => {
      expect(values.max_downloads).toBe(5)
      expect(values.expires_at).toBeInstanceOf(Date)
      return { returning: returningMock }
    }),
  })

  await expect(upload(makeEvent())).resolves.toEqual({
    token: 'generated-token',
  })
})

it('returns 400 when date expiry exceeds the configured maximum', async () => {
  const future = new Date()
  future.setDate(future.getDate() + 30)

  parseUploadFormMock.mockResolvedValue([
    {
      expiry_type: ['date'],
      expires_at: [future.toISOString()],
    },
    { files: [{ size: 10 }] },
  ])

  selectMock.mockReturnValue({
    from: vi.fn(() => ({
      limit: vi.fn(async () => [
        configuredSettings({ max_expiry_days: 7 }),
      ]),
    })),
  })

  await expect(upload(makeEvent())).rejects.toMatchObject({
    statusCode: 400,
  })
})

it('creates a share and stores its files', async () => {
  parseUploadFormMock.mockResolvedValue([
    {
      name: ['Test share'],
      description: ['Description'],
      password: ['password123'],
    },
    {
      files: [
        { size: 10, originalFilename: 'hello.txt' },
        { size: 20, originalFilename: 'world.txt' },
      ],
    },
  ])

  await expect(upload(makeEvent())).resolves.toEqual({
    token: 'generated-token',
  })

  expect(hashSharePasswordMock).toHaveBeenCalledWith('password123')
  expect(insertMock).toHaveBeenCalled()
  expect(storeEncryptedFileMock).toHaveBeenCalledTimes(2)
})

it('returns 409 when a unique token constraint races a custom slug', async () => {
  parseUploadFormMock.mockResolvedValue([
    { slug: ['race-slug'] },
    { files: [{ size: 10 }] },
  ])

  selectMock
    .mockReturnValueOnce({
      from: vi.fn(() => ({
        limit: vi.fn(async () => [configuredSettings()]),
      })),
    })
    .mockReturnValueOnce({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => []),
        })),
      })),
    })

  insertMock.mockReturnValue({
    values: vi.fn(() => ({
      returning: vi.fn(async () => {
        const error = new Error(
          'UNIQUE constraint failed: shares.token',
        ) as Error & { code?: string }
        error.code = 'SQLITE_CONSTRAINT_UNIQUE'
        throw error
      }),
    })),
  })

  await expect(upload(makeEvent())).rejects.toMatchObject({
    statusCode: 409,
    statusMessage: 'This URL is taken',
  })
})

it('returns 500 when share creation fails for an unexpected database error', async () => {
  insertMock.mockReturnValue({
    values: vi.fn(() => ({
      returning: vi.fn(async () => {
        throw new Error('database unavailable')
      }),
    })),
  })

  await expect(upload(makeEvent())).rejects.toMatchObject({
    statusCode: 500,
    statusMessage: 'Failed to create share',
  })
})

it('returns 500 when the insert succeeds without returning a share', async () => {
  insertMock.mockReturnValue({
    values: vi.fn(() => ({
      returning: vi.fn(async () => []),
    })),
  })

  await expect(upload(makeEvent())).rejects.toMatchObject({
    statusCode: 500,
    statusMessage: 'Failed to create share',
  })
})

