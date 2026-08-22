import { describe, expect, it } from 'vitest'
import { uploadRequestSchema } from './uploadRequestSchema'

describe('uploadRequestSchema', () => {
  it('rejects invalid upload fields', () => {
    const result = uploadRequestSchema.safeParse({
      expiry_type: 'weekly',
      slug: 'bad slug',
      password: 'short',
    })

    expect(result.success).toBe(false)
  })

  it('accepts a valid upload request', () => {
    const result = uploadRequestSchema.safeParse({
      expiry_type: 'downloads',
      max_downloads: '5',
      password: 'password123',
      slug: 'valid_slug',
      name: 'Test share',
      description: 'Description',
    })

    expect(result.success).toBe(true)
    if (!result.success) return

    expect(result.data.max_downloads).toBe(5)
  })
})
