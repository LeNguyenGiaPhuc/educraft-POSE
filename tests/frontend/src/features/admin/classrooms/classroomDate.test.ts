import { describe, expect, it } from 'vitest'
import { formatClassroomDate } from '../../../../../../frontend/src/features/admin/classrooms/classroomDate'

describe('classroom enrollment date', () => {
  it('shows the Vietnam calendar day for a UTC timestamp near midnight', () => {
    expect(formatClassroomDate('2026-11-22T17:46:50.987Z')).toBe('23/11/2026')
  })

  it('pads ordinary dates to day/month/year', () => {
    expect(formatClassroomDate('2026-03-05T08:00:00.000Z')).toBe('05/03/2026')
  })

  it('shows a neutral value for missing or malformed dates', () => {
    expect(formatClassroomDate(null)).toBe('—')
    expect(formatClassroomDate('not-a-date')).toBe('—')
  })
})
