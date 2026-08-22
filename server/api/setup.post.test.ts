import { beforeEach, expect, it, vi } from 'vitest'
import type { H3Event } from 'h3'

const { transactionMock, checkAdminExistsMock, markAdminCreatedMock, hashSharePasswordMock, readBodyMock, setUserSessionMock } = vi.hoisted(() => ({
  transactionMock: vi.fn(),
  checkAdminExistsMock: vi.fn(),
  markAdminCreatedMock: vi.fn(),
  hashSharePasswordMock: vi.fn(),
  readBodyMock: vi.fn(),
  setUserSessionMock: vi.fn(),
}))

vi.mock('../db/index', () => ({ db: { transaction: transactionMock } }))
vi.mock('../db/schema', () => ({
  admin: { id: 'admin.id' },
  settings: {},
}))
vi.mock('../utils/admin-state', () => ({
  checkAdminExists: checkAdminExistsMock,
  markAdminCreated: markAdminCreatedMock,
}))

vi.stubGlobal('defineEventHandler', (handler: (event: H3Event) => unknown) => handler)
vi.stubGlobal('readBody', readBodyMock)
vi.stubGlobal('hashSharePassword', hashSharePasswordMock)
vi.stubGlobal('setUserSession', setUserSessionMock)
vi.stubGlobal('createError', ({ statusCode, message }: { statusCode: number; message: string }) => {
  const error = new Error(message) as Error & { statusCode?: number }
  error.statusCode = statusCode
  return error
})

const { default: setup } = await import('./setup.post')

const makeEvent = () => ({ context: {}, node: { req: {} }, headers: {} }) as H3Event

beforeEach(() => {
  vi.clearAllMocks()
  checkAdminExistsMock.mockResolvedValue(false)
  readBodyMock.mockResolvedValue({ username: 'admin', password: 'secret123' })
  hashSharePasswordMock.mockResolvedValue('hashed')
  setUserSessionMock.mockResolvedValue(undefined)
  transactionMock.mockImplementation(async (callback: (tx: unknown) => Promise<void>) => callback({
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        limit: vi.fn(async () => []),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(async () => undefined),
    })),
  }))
})

it('performs the final admin check inside the transaction', async () => {
  await expect(setup(makeEvent())).resolves.toEqual({ success: true })
  expect(transactionMock).toHaveBeenCalledOnce()
  expect(markAdminCreatedMock).toHaveBeenCalledOnce()
  expect(setUserSessionMock).toHaveBeenCalledOnce()
})

it('does not create an account when another request completed setup first', async () => {
  transactionMock.mockImplementation(async (callback: (tx: unknown) => Promise<void>) => callback({
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        limit: vi.fn(async () => [{ id: 1 }]),
      })),
    })),
    insert: vi.fn(() => ({ values: vi.fn() })),
  }))

  await expect(setup(makeEvent())).rejects.toMatchObject({ statusCode: 403 })
  expect(markAdminCreatedMock).not.toHaveBeenCalled()
  expect(setUserSessionMock).not.toHaveBeenCalled()
})
