import { beforeEach, expect, it, vi } from 'vitest'
import type { H3Event } from 'h3'

const { selectMock, deleteSharesMock, getRouterParamMock, requireUserSessionMock } = vi.hoisted(() => ({
  selectMock: vi.fn(),
  deleteSharesMock: vi.fn(),
  getRouterParamMock: vi.fn(),
  requireUserSessionMock: vi.fn(),
}))

vi.mock('../../db/index', () => ({ db: { select: selectMock } }))
vi.mock('../../db/schema', () => ({ shares: { id: 'id' } }))
vi.mock('drizzle-orm', () => ({ eq: vi.fn() }))

vi.stubGlobal('defineEventHandler', (handler: (event: H3Event) => unknown) => handler)
vi.stubGlobal('createError', ({ statusCode, message }: { statusCode: number, message: string }) => {
  const error = new Error(message) as Error & { statusCode?: number }
  error.statusCode = statusCode
  return error
})
vi.stubGlobal('requireUserSession', requireUserSessionMock)
vi.stubGlobal('getRouterParam', getRouterParamMock)
vi.stubGlobal('deleteShares', deleteSharesMock)

const { default: deleteShare } = await import('./shares/[id].delete')

const makeEvent = () => ({ context: {}, node: { req: {} }, headers: {} }) as H3Event

beforeEach(() => {
  vi.clearAllMocks()
  requireUserSessionMock.mockResolvedValue({ user: { id: 1 } })
  getRouterParamMock.mockReturnValue('42')
  deleteSharesMock.mockResolvedValue(undefined)
  selectMock.mockReturnValue({
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        limit: vi.fn(async () => [{ id: 42 }]),
      })),
    })),
  })
})

it('deletes an existing share for an authenticated admin', async () => {
  await expect(deleteShare(makeEvent())).resolves.toEqual({ success: true })
  expect(deleteSharesMock).toHaveBeenCalledWith([42])
})

it('returns 404 when the share does not exist', async () => {
  selectMock.mockReturnValue({
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        limit: vi.fn(async () => []),
      })),
    })),
  })

  await expect(deleteShare(makeEvent())).rejects.toMatchObject({ statusCode: 404 })
})

it('returns 400 when the share id is invalid', async () => {
  getRouterParamMock.mockReturnValue('not-a-number')

  await expect(deleteShare(makeEvent())).rejects.toMatchObject({ statusCode: 400 })
})
it('propagates database errors from the delete lookup', async () => {
  selectMock.mockReturnValue({
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        limit: vi.fn(async () => { throw new Error('database unavailable') }),
      })),
    })),
  })

  await expect(deleteShare(makeEvent())).rejects.toThrow('database unavailable')
})

