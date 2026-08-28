import { beforeEach, expect, it, vi } from 'vitest'
import type { H3Event } from 'h3'

const {
  selectMock,
  deleteMock,
  parseUploadFormMock,
  getRouterParamMock,
  verifySharePasswordMock,
  storeEncryptedFileMock,
  removeStoredFilesMock,
} = vi.hoisted(() => ({
  selectMock: vi.fn(),
  deleteMock: vi.fn(),
  parseUploadFormMock: vi.fn(),
  getRouterParamMock: vi.fn(),
  verifySharePasswordMock: vi.fn(),
  storeEncryptedFileMock: vi.fn(),
  removeStoredFilesMock: vi.fn(),
}))

vi.mock('../../../../server/db/index', () => ({
  db: {
    select: selectMock,
    delete: deleteMock,
  },
}))

vi.mock('../../../../server/db/schema', () => ({
  shares: {
    upload_token: 'upload_token',
  },
  settings: {
    id: 'id',
    max_file_size: 'max_file_size',
  },
  files: {
    id: 'id',
  },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
}))

vi.mock('../../../../server/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
  },
}))

vi.mock('../../../../server/utils/store-encrypted-file', () => ({
  removeStoredFiles: removeStoredFilesMock,
}))

vi.stubGlobal(
  'defineEventHandler',
  (handler: (event: H3Event) => unknown) => handler,
)

vi.stubGlobal(
  'createError',
  ({ statusCode, message }: { statusCode: number; message: string }) => {
    const error = new Error(message) as Error & { statusCode?: number }
    error.statusCode = statusCode
    return error
  },
)

vi.stubGlobal('checkRateLimit', vi.fn())
vi.stubGlobal('getClientIp', () => '127.0.0.1')
vi.stubGlobal('getHeader', () => undefined)
vi.stubGlobal('getRouterParam', getRouterParamMock)
vi.stubGlobal('verifySharePassword', verifySharePasswordMock)
vi.stubGlobal('parseUploadForm', parseUploadFormMock)
vi.stubGlobal('formatBytes', (value: number) => `${value} B`)
vi.stubGlobal('storeEncryptedFile', storeEncryptedFileMock)

const { default: submitReverse } = await import('../../../../server/api/reverse/[uploadToken].post')

const makeEvent = () =>
  ({
    context: {},
    node: { req: {} },
    headers: {},
  }) as H3Event

const mockShareQueries = (
  share: {
    id?: number
    is_reverse: boolean
    expires_at: Date | null
    password_hash: string | null
  } | null,
  config = { max_file_size: 1024 },
) => {
  selectMock
    .mockReturnValueOnce({
      from: vi.fn(() => ({
        where: vi.fn(async () => (share ? [share] : [])),
      })),
    })
    .mockReturnValueOnce({
      from: vi.fn(() => ({
        limit: vi.fn(async () => [config]),
      })),
    })
}

beforeEach(() => {
  vi.resetAllMocks()

  getRouterParamMock.mockReturnValue('upload-token')
  verifySharePasswordMock.mockResolvedValue(undefined)
  parseUploadFormMock.mockResolvedValue([
    {},
    {
      files: [{ size: 10 }],
    },
  ])

  storeEncryptedFileMock.mockResolvedValue({
    id: 1,
    storedName: 'missing-file',
  })

  removeStoredFilesMock.mockResolvedValue(undefined)

  deleteMock.mockReturnValue({
    where: vi.fn(async () => undefined),
  })
})

it('returns 404 when the reverse share does not exist', async () => {
  mockShareQueries(null)

  await expect(submitReverse(makeEvent())).rejects.toMatchObject({
    statusCode: 404,
  })
})

it('returns 410 when the reverse share has expired', async () => {
  mockShareQueries({
    id: 1,
    is_reverse: true,
    expires_at: new Date(Date.now() - 1000),
    password_hash: null,
  })

  await expect(submitReverse(makeEvent())).rejects.toMatchObject({
    statusCode: 410,
  })
})

it('returns 401 when the reverse share password is rejected', async () => {
  mockShareQueries({
    id: 1,
    is_reverse: true,
    expires_at: null,
    password_hash: 'hash',
  })

  const error = new Error('Unauthorized') as Error & {
    statusCode?: number
  }

  error.statusCode = 401
  verifySharePasswordMock.mockRejectedValue(error)

  await expect(submitReverse(makeEvent())).rejects.toMatchObject({
    statusCode: 401,
  })
})

it('rolls back only the files created by a failed reverse upload', async () => {
  mockShareQueries({
    id: 42,
    is_reverse: true,
    expires_at: null,
    password_hash: null,
  })

  parseUploadFormMock.mockResolvedValue([
    {},
    {
      files: [
        { size: 10 },
        { size: 10 },
      ],
    },
  ])

  const firstStoredFile = {
    id: 10,
    storedName: 'first-file',
  }

  storeEncryptedFileMock
    .mockResolvedValueOnce(firstStoredFile)
    .mockRejectedValueOnce(new Error('disk full'))

  await expect(submitReverse(makeEvent())).rejects.toThrow('disk full')

  expect(removeStoredFilesMock).toHaveBeenCalledOnce()
  expect(removeStoredFilesMock).toHaveBeenCalledWith([
    firstStoredFile,
  ])

  expect(deleteMock).toHaveBeenCalledOnce()
})

it('accepts an authenticated reverse upload', async () => {
  mockShareQueries(
    {
      id: 42,
      is_reverse: true,
      expires_at: null,
      password_hash: null,
    },
    {
      max_file_size: 1024,
    },
  )

  await expect(submitReverse(makeEvent())).resolves.toEqual({
    success: true,
    count: 1,
  })
})