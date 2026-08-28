import { beforeEach, expect, it, vi } from 'vitest'
import type { H3Event } from 'h3'

const { selectMock, getRouterParamMock, verifySharePasswordMock } = vi.hoisted(() => ({
  selectMock: vi.fn(),
  getRouterParamMock: vi.fn(),
  verifySharePasswordMock: vi.fn(),
}))

vi.mock('../../../../server/db/index', () => ({ db: { select: selectMock } }))
vi.mock('../../../../server/db/schema', () => ({ shares: { upload_token: 'upload_token' } }))
vi.mock('drizzle-orm', () => ({ eq: vi.fn() }))

vi.stubGlobal('defineEventHandler', (handler: (event: H3Event) => unknown) => handler)
vi.stubGlobal('createError', ({ statusCode, message }: { statusCode: number, message: string }) => {
  const error = new Error(message) as Error & { statusCode?: number }
  error.statusCode = statusCode
  return error
})
vi.stubGlobal('getRouterParam', getRouterParamMock)
vi.stubGlobal('verifySharePassword', verifySharePasswordMock)

const { default: getReverse } = await import('../../../../server/api/reverse/[uploadToken].get')

const makeEvent = () => ({ context: {}, node: { req: {} }, headers: {} }) as H3Event

const mockShareQuery = (share: unknown) => {
  selectMock.mockReturnValue({
    from: vi.fn(() => ({
      where: vi.fn(async () => share ? [share] : []),
    })),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  getRouterParamMock.mockReturnValue('upload-token')
  verifySharePasswordMock.mockResolvedValue(undefined)
})

it('returns 400 when the upload token is missing', async () => {
  getRouterParamMock.mockReturnValue(undefined)

  await expect(getReverse(makeEvent())).rejects.toMatchObject({ statusCode: 400 })
})

it('returns 404 when the token does not identify a reverse share', async () => {
  mockShareQuery(null)

  await expect(getReverse(makeEvent())).rejects.toMatchObject({ statusCode: 404 })
})

it('returns 410 when the reverse share has expired', async () => {
  mockShareQuery({ is_reverse: true, expires_at: new Date(Date.now() - 1000) })

  await expect(getReverse(makeEvent())).rejects.toMatchObject({ statusCode: 410 })
})

it('returns 401 when the share password is rejected', async () => {
  mockShareQuery({ is_reverse: true, expires_at: null, password_hash: 'hash' })
  const error = new Error('Unauthorized') as Error & { statusCode?: number }
  error.statusCode = 401
  verifySharePasswordMock.mockRejectedValue(error)

  await expect(getReverse(makeEvent())).rejects.toMatchObject({ statusCode: 401 })
})

it('returns reverse share metadata when the password is accepted', async () => {
  const share = {
    is_reverse: true,
    expires_at: null,
    password_hash: null,
    name: 'Collect files',
    description: 'Send the project files here',
  }
  mockShareQuery(share)

  await expect(getReverse(makeEvent())).resolves.toEqual({
    name: 'Collect files',
    description: 'Send the project files here',
    is_password_protected: false,
  })
})
