import type { H3Event } from 'h3'

// Simple in-memory fixed-window rate limiter. This is deliberately basic:
// Crateyard is meant to run as a single Node process (SQLite doesn't
// support multiple writers well either), so an in-memory map is enough.
// If you ever run multiple instances behind a load balancer, back this
// with something shared (Redis, etc.) instead
// each process would otherwise track its own separate counters.

interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

// Periodically sweep expired buckets so this map doesn't grow forever on
// a long-running server. Unref so it never keeps the process alive on its
// own (relevant for tests/scripts that import this module).
const sweepInterval = setInterval(() => {
  const now = Date.now()
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}, 60 * 1000)
sweepInterval.unref?.()

// Throws a 429 once `key` has been hit more than `limit` times within the
// current `windowMs` window. Callers should pick a key that scopes the
// limit correctly, e.g. `admin-login:${ip}` or `share-pw:${ip}`.
export const checkRateLimit = (key: string, limit: number, windowMs: number): void => {
  const now = Date.now()
  const bucket = buckets.get(key)

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return
  }

  bucket.count++
  if (bucket.count > limit) {
    const retryAfterSec = Math.ceil((bucket.resetAt - now) / 1000)
    throw createError({
      statusCode: 429,
      message: `Too many attempts. Try again in ${retryAfterSec}s.`,
      data: { retryAfter: retryAfterSec }
    })
  }
}

// Best-effort client identifier. x-forwarded-for is only trustworthy if
// you're behind a reverse proxy that sets it (Nginx, Caddy, Cloudflare, etc.) 
// if you're exposing the Node process directly, the socket address
// is used instead. Either way this is "best effort", not a hard identity:
// it's meant to slow down casual brute-forcing, not survive a determined
// attacker rotating IPs.
export const getClientIp = (event: H3Event): string => {
  const forwarded = getHeader(event, 'x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]!.trim()
  return event.node.req.socket.remoteAddress ?? 'unknown'
}
