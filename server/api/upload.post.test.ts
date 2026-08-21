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
  parseUploadFormMock: vi.fn(),
  checkRateLimitMock: vi.fn(),
  getClientIpMock: vi.fn(),
  getHeaderMock: vi.fn(),
  storeEncryptedFileMock: vi.fn(),
  hashSharePasswordMock: vi.fn(),
  nanoidMock: vi.fn(),
}))

const dbMock = { select: selectMock, insert: insertMock }

vi.mock('../db/index', () => ({ db: dbMock }))
vi.mock('../db/schema', () => ({
  shares: { token: 'token', id: 'id' },
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