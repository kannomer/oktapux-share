import { afterEach, describe, expect, it, vi } from 'vitest'

describe('useComputeExpiryDate', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('computes minute and week expirations', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))

    const amount = ref(5)
    const unit = ref('minute')
    const { computedExpiryDate } = useComputeExpiryDate(amount, unit)

    expect(computedExpiryDate.value).toBe('2026-01-01T00:05:00.000Z')

    unit.value = 'week'
    expect(computedExpiryDate.value).toBe('2026-02-05T00:00:00.000Z')
  })

  it('supports day, month and year units', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-15T00:00:00.000Z'))

    const amount = ref(1)
    const unit = ref('day')
    const { computedExpiryDate } = useComputeExpiryDate(amount, unit)

    expect(computedExpiryDate.value).toBe('2026-01-16T00:00:00.000Z')

    unit.value = 'month'
    expect(computedExpiryDate.value).toBe('2026-02-15T00:00:00.000Z')

    unit.value = 'year'
    expect(computedExpiryDate.value).toBe('2027-01-15T00:00:00.000Z')
  })
})
