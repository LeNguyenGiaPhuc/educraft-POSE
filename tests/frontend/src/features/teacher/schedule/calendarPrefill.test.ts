import { describe, expect, it } from 'vitest'
import { clearCalendarCreatePrefill, getCalendarCreatePrefill } from '../../../../../../frontend/src/features/teacher/schedule/calendarPrefill'

describe('calendar create prefill', () => {
  it('keeps linked lesson/activity and optional event fields from the query', () => {
    const prefill = getCalendarCreatePrefill(new URLSearchParams({
      create: '1',
      classroomSubjectId: 'subject-id',
      lessonId: 'lesson-id',
      activityId: '',
      title: 'Ôn tập',
      startsAt: '2026-11-20T08:00:00.000Z',
      details: 'Đọc trước bài',
      eventType: 'LESSON',
    }))

    expect(prefill).toEqual({
      classroomSubjectId: 'subject-id',
      lessonId: 'lesson-id',
      activityId: '',
      title: 'Ôn tập',
      startsAt: '2026-11-20T08:00:00.000Z',
      details: 'Đọc trước bài',
      eventType: 'LESSON',
    })
  })

  it('consumes create-only query fields without losing calendar context', () => {
    const params = new URLSearchParams({
      create: '1',
      classroomId: 'classroom-id',
      classroomSubjectId: 'subject-id',
      month: '2026-11',
      day: '2026-11-30',
      lessonId: 'lesson-id',
      title: 'Bài học liên kết',
      startsAt: '2026-11-30T08:00:00.000Z',
      details: 'Chuẩn bị bài',
      eventType: 'LESSON',
    })

    expect(clearCalendarCreatePrefill(params).toString()).toBe(
      'classroomId=classroom-id&classroomSubjectId=subject-id&month=2026-11&day=2026-11-30',
    )
  })
})
