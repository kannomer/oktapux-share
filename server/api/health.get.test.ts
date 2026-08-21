import { beforeEach, expect, it, vi } from 'vitest'
import type { H3Event } from 'h3'

const { selectMock, loggerErrorMock } = vi.hoisted(() => ({
  selectMock: vi.fn(),
  loggerErrorMock: vi.fn(),
}))

vi.mock('../db/index', () => ({ db: { select: selectMock } }))
vi.mock('../db/schema', () => ({ settings: { id: 'id' } }))
vi.mock('../utils/logger', () => ({ logger: { error: loggerErrorMock } }))

vi.stubGlobal('defineEventHandler', (handler: (event: H3Event) => unknown) => handler)
vi.stubGlobal('createError', ({ statusCode, message }: { statusCode: number, message: string }) => {
  const error = new Error(message) as Error & { statusCode?: number }
  error.statusCode = statusCode
  return error
})
vi.stubGlobal('getHeader', () => undefined)

const { default: health } = await import('./health.get')

const makeEvent = () => ({ context: {}, node: { req: {} }, headers: {} }) as H3Event

beforeEach(() => {
  vi.clearAllMocks()
  selectMock.mockReturnValue({
    from: vi.fn(() => ({
      limit: vi.fn(async () => [{ id: 1 }]),
    })),
  })
})

it('returns ok when the database check succeeds', async () => {
  await expect(health(makeEvent())).resolves.toEqual({ status: 'ok' })
})

it('returns 503 when the database check fails', async () => {
  selectMock.mockReturnValue({
    from: vi.fn(() => ({
      limit: vi.fn(async () => { throw new Error('database unavailable') }),
    })),
  })

  await expect(health(makeEvent())).rejects.toMatchObject({ statusCode: 503 })
  expect(loggerErrorMock).toHaveBeenCalledOnce()
})
