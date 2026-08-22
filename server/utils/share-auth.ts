import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import type { H3Event } from 'h3'

const COOKIE_PREFIX = 'oktapux-share-auth-'
const COOKIE_TTL_SECONDS = 12 * 60 * 60
const KEY_LENGTH = 32
const IV_LENGTH = 12

const getCookieKey = (): Buffer => {
  const secret = process.env.ENCRYPTION_KEY_SECRET
  if (!secret) {
    throw new Error('ENCRYPTION_KEY_SECRET is not set')
  }

  const key = Buffer.from(secret, 'hex')
  if (key.length !== KEY_LENGTH) {
    throw new Error('ENCRYPTION_KEY_SECRET must contain exactly 32 bytes encoded as hex')
  }
  return createHash('sha256').update('oktapux-share-auth-cookie').update(key).digest()
}

const getCookieName = (token: string): string =>
  `${COOKIE_PREFIX}${createHash('sha256').update(token).digest('hex').slice(0, 32)}`

const getCookiePath = (event: H3Event): string | null => {
  const token = getRouterParam(event, 'token')
  if (token) return `/api/shares/${token}`

  const uploadToken = getRouterParam(event, 'uploadToken')
  if (uploadToken) return `/api/reverse/${uploadToken}`

  return null
}

const encryptCookieValue = (token: string, password: string, expiresAt: Date | null): string => {
  const now = Math.floor(Date.now() / 1000)
  const shareExpiry = expiresAt ? Math.floor(expiresAt.getTime() / 1000) : Number.MAX_SAFE_INTEGER
  const exp = Math.min(now + COOKIE_TTL_SECONDS, shareExpiry)
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv('aes-256-gcm', getCookieKey(), iv)
  cipher.setAAD(Buffer.from(token, 'utf8'))
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify({ password, exp })), cipher.final()])
  const tag = cipher.getAuthTag()

  return [
    iv.toString('base64url'),
    ciphertext.toString('base64url'),
    tag.toString('base64url'),
  ].join('.')
}

const decryptCookieValue = (token: string, value: string): string | null => {
  const [ivHex, ciphertextHex, tagHex] = value.split('.')
  if (!ivHex || !ciphertextHex || !tagHex) return null

  try {
    const iv = Buffer.from(ivHex, 'base64url')
    const ciphertext = Buffer.from(ciphertextHex, 'base64url')
    const tag = Buffer.from(tagHex, 'base64url')
    const decipher = createDecipheriv('aes-256-gcm', getCookieKey(), iv)
    decipher.setAAD(Buffer.from(token, 'utf8'))
    decipher.setAuthTag(tag)
    const payload = JSON.parse(Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')) as {
      password?: unknown
      exp?: unknown
    }

    if (typeof payload.password !== 'string' || typeof payload.exp !== 'number') return null
    if (payload.exp <= Math.floor(Date.now() / 1000)) return null
    return payload.password
  } catch {
    return null
  }
}

export const setShareAuthCookie = (
  event: H3Event,
  token: string,
  password: string,
  expiresAt: Date | null,
): void => {
  const path = getCookiePath(event)
  if (!path) return

  const now = Math.floor(Date.now() / 1000)
  const shareExpiry = expiresAt ? Math.floor(expiresAt.getTime() / 1000) : Number.MAX_SAFE_INTEGER
  const maxAge = Math.max(1, Math.min(COOKIE_TTL_SECONDS, shareExpiry - now))

  setCookie(event, getCookieName(token), encryptCookieValue(token, password, expiresAt), {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path,
    maxAge,
  })
}

export const getShareAuthPassword = (event: H3Event, token: string): string | undefined => {
  const cookie = getCookie(event, getCookieName(token))
  if (!cookie) return undefined
  return decryptCookieValue(token, cookie) ?? undefined
}

