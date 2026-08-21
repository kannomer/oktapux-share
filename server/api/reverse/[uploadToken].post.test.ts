import { beforeEach, expect, it, vi } from 'vitest'
import type { H3Event } from 'h3'

const { selectMock, parseUploadFormMock, getRouterParamMock, verifySharePasswordMock } = vi.hoisted(() => ({
  selectMock: vi.fn(),
  parseUploadFormMock: vi.fn(),
  getRouterParamMock: vi.fn(),
  verifySharePasswordMock: vi.fn(),
}))

vi.mock('../../db/index', () => ({ db: { select: selectMock } }))
vi.mock('../../db/schema', () => ({
  shares: { upload_token: 'upload_token' },
  settings: { id: 'id', max_file_size: 'max_file_size' },
}))
vi.mock('drizzle-orm', () => ({ eq: vi.fn() }))
vi.mock('../../utils/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn() } }))

vi.stubGlobal('defineEventHandler', (handler: (event: H3Event) => unknown) => handler)
vi.stubGlobal('createError', ({ statusCode, message }: { statusCode: number; message: string }) => {
  const error = new Error(message) as Error & { statusCode?: number }
  error.statusCode = statusCode
  return error
})
vi.stubGlobal('checkRateLimit', vi.fn())
vi.stubGlobal('getClientIp', () => '127.0.0.1')
vi.stubGlobal('getHeader', () => undefined)
vi.stubGlobal('getRouterParam', getRouterParamMock)
vi.stubGlobal('verifySharePassword', verifySharePasswordMock)
vi.stubGlobal('parseUploadForm', parseUploadFormMock)
vi.stubGlobal('formatBytes', (value: number) => `${value} B`)
vi.stubGlobal('storeEncryptedFile', vi.fn())

const { default: submitReverse } = await import('./[uploadToken].post')

const makeEvent = () => ({ context: {}, node: { req: {} }, headers: {} }) as H3Event

const mockShareQueries = (
  share: { is_reverse: boolean; expires_at: Date | null; password_hash: string | null } | null,
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
  parseUploadFormMock.mockResolvedValue([{}, { files: [{ size: 10 }] }])
})

it('returns 404 when the reverse share does not exist', async () => {
  mockShareQueries(null)

  await expect(submitReverse(makeEvent())).rejects.toMatchObject({ statusCode: 404 })
})

it('returns 410 when the reverse share has expired', async () => {
  mockShareQueries({
    is_reverse: true,
    expires_at: new Date(Date.now() - 1000),
    password_hash: null,
  })

  await expect(submitReverse(makeEvent())).rejects.toMatchObject({ statusCode: 410 })
})

it('returns 401 when the reverse share password is rejected', async () => {
  mockShareQueries({
    is_reverse: true,
    expires_at: null,
    password_hash: 'hash',
  })

  const error = new Error('Unauthorized') as Error & { statusCode?: number }
  error.statusCode = 401
  verifySharePasswordMock.mockRejectedValue(error)

  await expect(submitReverse(makeEvent())).rejects.toMatchObject({ statusCode: 401 })
})

it('accepts an authenticated reverse upload', async () => {
  mockShareQueries(
    {
      is_reverse: true,
      expires_at: null,
      password_hash: null,
    },
    { max_file_size: 1024 },
  )

  await expect(submitReverse(makeEvent())).resolves.toEqual({
    success: true,
    count: 1,
  })
})
