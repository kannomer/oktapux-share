import { beforeEach, describe, expect, it, vi } from 'vitest'

const { updateMock } = vi.hoisted(() => ({ updateMock: vi.fn() }))

vi.mock('../db/index', () => ({ db: { update: updateMock } }))
vi.mock('../db/schema', () => ({
  shares: {
    id: 'id',
    download_count: 'download_count',
    max_downloads: 'max_downloads',
  },
}))
vi.mock('drizzle-orm', () => ({
  and: vi.fn((...args) => ({ kind: 'and', args })),
  eq: vi.fn((...args) => ({ kind: 'eq', args })),
  isNull: vi.fn((...args) => ({ kind: 'isNull', args })),
  lt: vi.fn((...args) => ({ kind: 'lt', args })),
  or: vi.fn((...args) => ({ kind: 'or', args })),
  sql: vi.fn((strings, ...values) => ({ kind: 'sql', strings, values })),
}))

const { reserveDownloadSlot } = await import('./download-limit')

describe('reserveDownloadSlot', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    updateMock.mockReturnValue({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(async () => [{ id: 42 }]),
        })),
      })),
    })
  })

  it('returns true when the atomic update reserves a slot', async () => {
    await expect(reserveDownloadSlot(42)).resolves.toBe(true)
    expect(updateMock).toHaveBeenCalledOnce()
  })

  it('returns false when the limit was already reached by another request', async () => {
    updateMock.mockReturnValue({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(async () => []),
        })),
      })),
    })

    await expect(reserveDownloadSlot(42)).resolves.toBe(false)
  })
})
