import { createCipheriv, createDecipheriv, randomBytes, hkdfSync } from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const SALT_LENGTH = 16
const KEY_LENGTH = 32

const getServerSecret = (): Buffer => {
  const secret = process.env.ENCRYPTION_KEY_SECRET
  if (!secret) {
    throw new Error(
      'ENCRYPTION_KEY_SECRET is not set. Generate one with `openssl rand -hex 32` and set it as an env var.'
    )
  }
  return Buffer.from(secret, 'hex')
}

export const generateSalt = (): Buffer => randomBytes(SALT_LENGTH)

// Derives a per-file key from the server secret (and the share password, if
// the share is protected) plus a per-file random salt via HKDF. HKDF (not
// scrypt) is deliberate here: the input already carries full entropy from
// the server secret, so we don't need scrypt's memory-hardness, and this
// derivation runs on every single download so it needs to stay fast.
export const deriveFileKey = (salt: Buffer, password?: string): Buffer => {
  const secret = getServerSecret()
  const ikm = password ? Buffer.concat([secret, Buffer.from(password, 'utf8')]) : secret
  return Buffer.from(hkdfSync('sha256', ikm, salt, 'oktapux-file-key', KEY_LENGTH))
}

export const createEncryptCipher = (key: Buffer) => {
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  return { iv, cipher }
}

export const createDecryptCipher = (key: Buffer, iv: Buffer, authTag: Buffer) => {
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)
  return decipher
}
