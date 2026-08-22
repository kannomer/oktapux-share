import { describe, expect, it } from 'vitest'
import { expiryDateSchema, expiryTypeSchema, maxDownloadsSchema, passwordSchema, slugSchema } from './validation'

describe('validation schemas', () => {
  it('rejects invalid custom slugs', () => {
    expect(slugSchema.safeParse('no').success).toBe(false)
    expect(slugSchema.safeParse('has spaces').success).toBe(false)
    expect(slugSchema.safeParse('valid_slug-123').success).toBe(true)
  })

  it('rejects unsupported expiry types', () => {
    expect(expiryTypeSchema.safeParse('weekly').success).toBe(false)
    expect(expiryTypeSchema.safeParse('date').success).toBe(true)
  })

  it('rejects invalid expiry dates and download counts', () => {
    expect(expiryDateSchema.safeParse('not-a-date').success).toBe(false)
    expect(maxDownloadsSchema.safeParse('0').success).toBe(false)
    expect(maxDownloadsSchema.safeParse('10').success).toBe(true)
  })

  it('rejects empty passwords', () => {
    expect(passwordSchema.safeParse('').success).toBe(false)
    expect(passwordSchema.safeParse('secret123').success).toBe(true)
  })
})
