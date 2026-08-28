import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { H3Event } from 'h3'

const { getHeaderMock, getRouterParamMock, getClientIpMock, checkRateLimitMock, createErrorMock } = vi.hoisted(() => ({
  getHeaderMock: vi.fn(),
  getRouterParamMock: vi.fn(),
  getClientIpMock: vi.fn(),
  checkRateLimitMock: vi.fn(),
  createErrorMock: vi.fn(),
}))

vi.stubGlobal('getHeader', getHeaderMock)
vi.stubGlobal('getRouterParam', getRouterParamMock)
vi.stubGlobal('getClientIp', getClientIpMock)
vi.stubGlobal('checkRateLimit', checkRateLimitMock)
vi.stubGlobal('createError', createErrorMock.mockImplementation(({ statusCode, message }) => {
  const error = new Error(message) as Error & { statusCode?: number }
  error.statusCode = statusCode
  return error
}))

const cookieJar = new Map<string, string>()
vi.stubGlobal('getCookie', (_event: H3Event, name: string) => cookieJar.get(name))
vi.stubGlobal('setCookie', (_event: H3Event, name: string, value: string) => cookieJar.set(name, value))
vi.stubGlobal('deleteCookie', (_event: H3Event, name: string) => cookieJar.delete(name))

const { hashSharePassword, verifySharePassword } = await import('../../../server/utils/password')

const makeEvent = () => ({ context: {}, node: { req: {} }, headers: {} }) as unknown as H3Event

beforeEach(() => {
  process.env.ENCRYPTION_KEY_SECRET = '33'.repeat(32)
  cookieJar.clear()
  getHeaderMock.mockReturnValue(undefined)
  getRouterParamMock.mockImplementation((_event: H3Event, key: string) => key === 'token' ? 'share-token' : undefined)
  getClientIpMock.mockReturnValue('127.0.0.1')
  checkRateLimitMock.mockReset()
})

describe('share password authentication', () => {
  it('rejects a password supplied only through the query string', async () => {
    const hash = await hashSharePassword('secret123')
    const event = makeEvent()
    await expect(verifySharePassword(event, hash, 'share-token', null)).rejects.toMatchObject({ statusCode: 401 })
  })

  it('authenticates with the header and reuses the encrypted cookie', async () => {
    const hash = await hashSharePassword('secret123')
    getHeaderMock.mockReturnValue('secret123')

    await expect(verifySharePassword(makeEvent(), hash, 'share-token', null)).resolves.toBe('secret123')
    expect(cookieJar.size).toBe(1)

    getHeaderMock.mockReturnValue(undefined)
    await expect(verifySharePassword(makeEvent(), hash, 'share-token', null)).resolves.toBe('secret123')
  })
})
