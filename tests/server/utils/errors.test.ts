import { describe, expect, it } from 'vitest'
import { isDbConstraintError } from '../../../server/utils/errors'

describe('isDbConstraintError', () => {
  it('accepts SQLite constraint errors', () => {
    expect(isDbConstraintError({
      code: 'SQLITE_CONSTRAINT_UNIQUE',
      message: 'UNIQUE constraint failed: shares.token',
    })).toBe(true)

    expect(isDbConstraintError({
      code: 'SQLITE_CONSTRAINT',
      message: 'constraint failed',
    })).toBe(true)
  })

  it('rejects regular errors and malformed values', () => {
    expect(isDbConstraintError(new Error('database unavailable'))).toBe(false)
    expect(isDbConstraintError({ code: 'OTHER', message: 'constraint failed' })).toBe(false)
    expect(isDbConstraintError({ code: 'SQLITE_CONSTRAINT_UNIQUE' })).toBe(false)
    expect(isDbConstraintError(null)).toBe(false)
  })
})
