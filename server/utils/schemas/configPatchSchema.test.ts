import { describe, expect, it } from 'vitest'
import { configPatchSchema } from './configPatchSchema'

const validConfig = {
  max_file_size: 500 * 1024 * 1024,
  allow_passwordless_shares: true,
  allow_permanent_shares: true,
  max_expiry_days: null,
  cap_download_based_expiry: false,
  enable_qr_code: true,
  allow_reverse_shares: true,
  site_name: 'Crateyard',
}

describe('configPatchSchema', () => {
  it('accepts a complete valid settings payload', () => {
    expect(configPatchSchema.safeParse(validConfig).success).toBe(true)
  })

  it('rejects invalid numeric settings', () => {
    expect(configPatchSchema.safeParse({
      ...validConfig,
      max_file_size: 0,
    }).success).toBe(false)

    expect(configPatchSchema.safeParse({
      ...validConfig,
      max_expiry_days: 0,
    }).success).toBe(false)
  })

  it('rejects non-boolean feature flags', () => {
    expect(configPatchSchema.safeParse({
      ...validConfig,
      enable_qr_code: 'true',
    }).success).toBe(false)
  })

  it('rejects unknown settings fields', () => {
    expect(configPatchSchema.safeParse({
      ...validConfig,
      admin_password: 'secret',
    }).success).toBe(false)
  })
})
