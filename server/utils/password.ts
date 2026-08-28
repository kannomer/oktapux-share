import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import type { H3Event } from 'h3'
import { getShareAuthPassword, setShareAuthCookie } from './share-auth'

const scrypt = promisify(scryptCallback)
const KEY_LENGTH = 64

// Stored format: "<saltHex>:<hashHex>"
// Rename from hashPassword to avoid collision with nuxt-auth-utils auto-import
export const hashSharePassword = async (plain: string): Promise<string> => {
  const salt = randomBytes(16).toString('hex')
  const derivedKey = (await scrypt(plain, salt, KEY_LENGTH)) as Buffer
  return `${salt}:${derivedKey.toString('hex')}`
}

// Rename from verifyPassword to avoid collision with nuxt-auth-utils auto-import
export const verifySharePasswordHash = async (plain: string, stored: string): Promise<boolean> => {
  const [salt, hashHex] = stored.split(':')
  if (!salt || !hashHex) return false

  const derivedKey = (await scrypt(plain, salt, KEY_LENGTH)) as Buffer
  const storedBuffer = Buffer.from(hashHex, 'hex')

  if (derivedKey.length !== storedBuffer.length) return false
  return timingSafeEqual(derivedKey, storedBuffer)
}

// Reads a password from a request header or an encrypted, HttpOnly browser
// cookie. Query-string passwords are intentionally not supported because URLs
// routinely end up in browser history, proxy logs, analytics, and referrers.
// A successful header authentication refreshes the short-lived cookie so
// ordinary download links can still work without putting the password in URLs.
export const verifySharePassword = async (
  event: H3Event,
  passwordHash: string | null,
  shareToken?: string,
  expiresAt: Date | null = null,
): Promise<string | undefined> => {
  if (!passwordHash) return undefined

  const token = shareToken ?? getRouterParam(event, 'token') ?? getRouterParam(event, 'uploadToken')
  const headerPassword = getHeader(event, 'x-share-password')
  const cookiePassword = token ? getShareAuthPassword(event, token) : undefined
  const provided = headerPassword ?? cookiePassword

  if (!provided) {
    throw createError({ statusCode: 401, message: 'Password required' })
  }

  // Only throttle actual guesses (a provided password), not the initial
  // request that reveals a Crate is password-protected. Scoped per-IP so
  // one visitor guessing wrong repeatedly can't lock others out.
  if (headerPassword) {
    checkRateLimit(`share-pw:${getClientIp(event)}`, 10, 5 * 60 * 1000)
  }

  const valid = await verifySharePasswordHash(provided, passwordHash)
  if (!valid) {
    throw createError({ statusCode: 401, message: 'Incorrect password' })
  }

  if (headerPassword && token) {
    setShareAuthCookie(event, token, provided, expiresAt)
  }

  return provided
}
