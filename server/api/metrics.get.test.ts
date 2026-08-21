import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { H3Event } from 'h3'

const { getMetricsMock, requireUserSessionMock } = vi.hoisted(() => ({
  getMetricsMock: vi.fn(),
  requireUserSessionMock: vi.fn(),
}))

vi.mock('../utils/metrics', () => ({ getMetrics: getMetricsMock }))

vi.stubGlobal('defineEventHandler', (handler: (event: H3Event) => unknown) => handler)
vi.stubGlobal('requireUserSession', requireUserSessionMock)

const { default: getMetricsHandler } = await import('./metrics.get')

const makeEvent = () => ({ context: {}, node: { req: {} }, headers: {} }) as H3Event

describe('GET /api/metrics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireUserSessionMock.mockResolvedValue({ user: { id: 1 } })
    getMetricsMock.mockReturnValue({ requests: 12, errors: 2 })
  })

  it('requires an authenticated user', async () => {
    await getMetricsHandler(makeEvent())
    expect(requireUserSessionMock).toHaveBeenCalledOnce()
  })

  it('returns request and error counters', async () => {
    await expect(getMetricsHandler(makeEvent())).resolves.toEqual({
      requests: 12,
      errors: 2,
    })
  })
})
