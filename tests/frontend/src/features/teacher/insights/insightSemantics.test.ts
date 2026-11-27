import { describe, expect, it } from 'vitest'
import {
  formatPercentage,
  formatRate,
  safePercentage,
} from '../../../../../../frontend/src/features/teacher/insights/insightSemantics'

describe('Teacher insight numeric semantics', () => {
  it('keeps unavailable values different from valid zero values', () => {
    expect(formatRate(null)).toBe('Chưa có dữ liệu')
    expect(formatRate(0)).toBe('0%')
    expect(formatPercentage(null)).toBe('Chưa có dữ liệu')
    expect(formatPercentage(0)).toBe('0%')
  })

  it('formats rates from 0 to 1 without treating them as percentages', () => {
    expect(formatRate(0.75)).toBe('75%')
    expect(formatRate(1)).toBe('100%')
  })

  it('formats percentage DTO fields in their existing 0 to 100 range', () => {
    expect(formatPercentage(75)).toBe('75%')
    expect(formatPercentage(100)).toBe('100%')
  })

  it('does not invent a percentage when the denominator is zero', () => {
    expect(safePercentage(0, 0)).toBeNull()
    expect(safePercentage(3, 4)).toBe(75)
  })
})
