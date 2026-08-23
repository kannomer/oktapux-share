import { afterEach, describe, expect, it } from 'vitest'
import { createDecryptCipher, createEncryptCipher, deriveFileKey, generateSalt } from './encryption'

const originalSecret = process.env.ENCRYPTION_KEY_SECRET

const setValidSecret = () => {
  process.env.ENCRYPTION_KEY_SECRET = '11'.repeat(32)
}

afterEach(() => {
  if (originalSecret === undefined) delete process.env.ENCRYPTION_KEY_SECRET
  else process.env.ENCRYPTION_KEY_SECRET = originalSecret
})

describe('file encryption', () => {
  it('round-trips a multi-megabyte payload', () => {
    setValidSecret()
    const plaintext = Buffer.alloc(4 * 1024 * 1024, 0x5a)
    const salt = generateSalt()
    const key = deriveFileKey(salt, 'secret123')
    const { iv, cipher } = createEncryptCipher(key)
    const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()])
    const authTag = cipher.getAuthTag()

    const decipher = createDecryptCipher(key, iv, authTag)
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])

    expect(decrypted.equals(plaintext)).toBe(true)
  })

  it('rejects tampered ciphertext', () => {
    setValidSecret()
    const plaintext = Buffer.from('integrity matters')
    const salt = generateSalt()
    const key = deriveFileKey(salt, 'secret123')
    const { iv, cipher } = createEncryptCipher(key)
    const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()])
    const authTag = cipher.getAuthTag()
    encrypted[0] = encrypted[0]! ^ 0xff

    const decipher = createDecryptCipher(key, iv, authTag)
    expect(() => {
      decipher.update(encrypted)
      decipher.final()
    }).toThrow()
  })

  it('rejects an invalid server secret', () => {
    process.env.ENCRYPTION_KEY_SECRET = 'not-a-hex-secret'
    expect(() => deriveFileKey(generateSalt())).toThrow(/exactly 32 bytes encoded as hex/)
  })
})
