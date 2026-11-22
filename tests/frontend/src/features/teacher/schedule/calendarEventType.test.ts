import { describe, expect, it } from 'vitest'
import { eventTypeForApi, eventTypeLabel } from '../../../../../../frontend/src/features/teacher/schedule/calendarEventType'

describe('calendar event type display', () => {
  it('shows readable labels for stored event codes', () => {
    expect(eventTypeLabel('LESSON')).toBe('Bài học')
    expect(eventTypeLabel('ACTIVITY')).toBe('Hoạt động')
    expect(eventTypeLabel('NOTEBOOK_CHECK')).toBe('Kiểm tra vở')
    expect(eventTypeLabel('QUIZ')).toBe('Quiz')
    expect(eventTypeLabel('WRITTEN')).toBe('Tự luận')
  })

  it('uses the lesson default when the prefill is blank', () => {
    expect(eventTypeLabel('')).toBe('Bài học')
    expect(eventTypeForApi('Bài học', '')).toBe('LESSON')
  })

  it('keeps stored values when the teacher does not edit the field', () => {
    expect(eventTypeForApi('Bài học', 'LESSON')).toBe('LESSON')
    expect(eventTypeForApi('Tự luận', 'Tự luận')).toBe('Tự luận')
    expect(eventTypeLabel('Sinh hoạt lớp')).toBe('Sinh hoạt lớp')
    expect(eventTypeForApi('Sinh hoạt lớp', 'Sinh hoạt lớp')).toBe('Sinh hoạt lớp')
  })

  it('accepts an edited custom value or another known label', () => {
    expect(eventTypeForApi('Sinh hoạt lớp', 'LESSON')).toBe('Sinh hoạt lớp')
    expect(eventTypeForApi('Kiểm tra vở', 'LESSON')).toBe('NOTEBOOK_CHECK')
  })
})
