import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { H3Event } from 'h3'

const { selectMock, updateMock, requireUserSessionMock } = vi.hoisted(() => ({
  selectMock: vi.fn(),
  updateMock: vi.fn(),
  requireUserSessionMock: vi.fn(),
}))

vi.mock('../db/index', () => ({ db: { select: selectMock, update: updateMock } }))
vi.mock('../db/schema', () => ({ settings: { id: 'id' } }))
vi.mock('drizzle-orm', () => ({ eq: vi.fn() }))

vi.stubGlobal('defineEventHandler', (handler: (event: H3Event) => unknown) => handler)
vi.stubGlobal('requireUserSession', requireUserSessionMock)
const readBodyMock = vi.fn<() => Promise<unknown>>(async () => ({
  max_file_size: 500 * 1024 * 1024,
  allow_passwordless_shares: true,
  allow_permanent_shares: true,
  max_expiry_days: null,
  cap_download_based_expiry: false,
  enable_qr_code: true,
  allow_reverse_shares: true,
  site_name: 'Updated',
}))
vi.stubGlobal('readBody', readBodyMock)
vi.stubGlobal('createError', ({ statusCode, statusMessage }: { statusCode: number; statusMessage: string }) => {
  const error = new Error(statusMessage) as Error & { statusCode?: number; statusMessage?: string }
  error.statusCode = statusCode
  error.statusMessage = statusMessage
  return error
})

const { default: patchConfig } = await import('./config.patch')
const makeEvent = () => ({ context: {}, node: { req: {} }, headers: {} }) as H3Event

beforeEach(() => {
  vi.clearAllMocks()
  readBodyMock.mockReset()
  readBodyMock.mockResolvedValue({
    max_file_size: 500 * 1024 * 1024,
    allow_passwordless_shares: true,
    allow_permanent_shares: true,
    max_expiry_days: null,
    cap_download_based_expiry: false,
    enable_qr_code: true,
    allow_reverse_shares: true,
    site_name: 'Updated',
  })
  requireUserSessionMock.mockResolvedValue({ user: { id: 1 } })
  selectMock.mockReturnValue({
    from: vi.fn(() => ({
      limit: vi.fn(async () => [{ id: 1 }]),
    })),
  })
  updateMock.mockReturnValue({
    set: vi.fn(() => ({
      where: vi.fn(async () => undefined),
    })),
  })
})

describe('admin config patch', () => {
  it('updates settings for an authenticated user', async () => {
    await expect(patchConfig(makeEvent())).resolves.toEqual({ success: true })
    expect(requireUserSessionMock).toHaveBeenCalledOnce()
    expect(updateMock).toHaveBeenCalledOnce()
  })

  it('returns 400 for an invalid settings payload', async () => {
    readBodyMock.mockResolvedValue({
      site_name: 'Updated',
      enable_qr_code: 'yes',
    })

    await expect(patchConfig(makeEvent())).rejects.toMatchObject({
      statusCode: 400,
    })
  })

  it('returns 404 when settings are missing', async () => {
    selectMock.mockReturnValue({
      from: vi.fn(() => ({
        limit: vi.fn(async () => []),
      })),
    })

    await expect(patchConfig(makeEvent())).rejects.toMatchObject({ statusCode: 404 })
  })

  it('propagates authentication failures', async () => {
    requireUserSessionMock.mockRejectedValue(new Error('Unauthorized'))

    await expect(patchConfig(makeEvent())).rejects.toThrow('Unauthorized')
    expect(updateMock).not.toHaveBeenCalled()
  })
})
