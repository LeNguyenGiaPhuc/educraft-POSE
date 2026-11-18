import { describe, expect, it } from 'vitest'
import { getCalendarCreatePrefill } from '../../../../../../frontend/src/features/teacher/schedule/calendarPrefill'

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
})
