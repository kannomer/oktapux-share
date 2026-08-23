import { randomUUID } from 'node:crypto'

type ErrorContext = Record<string, unknown>

const getDsn = () => process.env.SENTRY_DSN?.trim()

const parseDsn = (dsn: string) => {
  const url = new URL(dsn)
  const publicKey = url.username
  const projectId = url.pathname.replace(/^\//, '')

  if (!publicKey || !projectId) return null

  return {
    dsn,
    projectId,
    endpoint: `${url.protocol}//${url.host}/api/${projectId}/envelope/`,
  }
}

export const reportError = async (
  error: unknown,
  context: ErrorContext = {},
) => {
  const dsn = getDsn()
  if (!dsn) return

  try {
    const parsed = parseDsn(dsn)
    if (!parsed) return

    const eventId = randomUUID().replaceAll('-', '')
    const timestamp = Date.now() / 1000
    const errorName = error instanceof Error ? error.name : 'Error'
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined

    const event = {
      event_id: eventId,
      timestamp,
      platform: 'node',
      level: 'error',
      exception: {
        values: [{
          type: errorName,
          value: errorMessage,
          ...(errorStack ? { stacktrace: { frames: [] } } : {}),
        }],
      },
      extra: context,
      tags: { source: 'oktapux-share' },
    }

    const serializedEvent = JSON.stringify(event)
    const body = [
      JSON.stringify({ event_id: eventId, dsn }),
      JSON.stringify({ type: 'event', length: serializedEvent.length }),
      serializedEvent,
    ].join('\n')

    await fetch(parsed.endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/x-sentry-envelope' },
      body,
    })
  } catch {
    // Error reporting must never break the application.
  }
}
