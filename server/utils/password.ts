import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import type { H3Event } from 'h3'

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

// Reads a password from the request (query param or header), throws a 401
// if the share is protected and the password is missing/incorrect, and
// returns the plaintext password that was verified (or undefined if the
// share has no password) so callers can use it for key derivation.
export const verifySharePassword = async (
  event: H3Event,
  passwordHash: string | null
): Promise<string | undefined> => {
  if (!passwordHash) return undefined

  const query = getQuery(event)
  const headerPassword = getHeader(event, 'x-share-password')
  const provided = (query.password as string | undefined) ?? headerPassword

  if (!provided) {
    throw createError({ statusCode: 401, message: 'Password required' })
  }

  // Only throttle actual guesses (a provided password), not the initial
  // request that reveals a share is password-protected. Scoped per-IP so
  // one visitor guessing wrong repeatedly can't lock others out.
  checkRateLimit(`share-pw:${getClientIp(event)}`, 10, 5 * 60 * 1000)

  const valid = await verifySharePasswordHash(provided, passwordHash)
  if (!valid) {
    throw createError({ statusCode: 401, message: 'Incorrect password' })
  }

  return provided
}
