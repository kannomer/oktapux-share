import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('reportError', () => {
  const originalDsn = process.env.SENTRY_DSN

  beforeEach(() => {
    vi.restoreAllMocks()
    if (originalDsn === undefined) delete process.env.SENTRY_DSN
    else process.env.SENTRY_DSN = originalDsn
  })

  it('is a no-op when SENTRY_DSN is not configured', async () => {
    delete process.env.SENTRY_DSN
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    const { reportError } = await import('./errorTracking')
    await reportError(new Error('boom'))

    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('reports an error when SENTRY_DSN is configured', async () => {
    process.env.SENTRY_DSN = 'https://public@example.invalid/1'
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 200 }),
    )

    const { reportError } = await import('./errorTracking')
    await reportError(new Error('boom'), { operation: 'test' })

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://example.invalid/api/1/envelope/',
      expect.objectContaining({
        method: 'POST',
        headers: { 'content-type': 'application/x-sentry-envelope' },
      }),
    )
  })
})
