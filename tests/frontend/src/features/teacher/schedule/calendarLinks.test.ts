import { describe, expect, it } from 'vitest'
import { activityCalendarPath, notebookCheckCalendarPath } from '../../../../../../frontend/src/features/teacher/schedule/calendarLinks'

describe('teacher calendar links', () => {
  it('builds an activity link with the selected subject and activity', () => {
    expect(activityCalendarPath({
      classroomSubjectId: 'subject/id',
      activityId: 'activity/id',
      title: 'Ôn tập lịch sử',
      details: 'Chuẩn bị trước khi học',
      eventType: 'QUIZ',
    })).toBe('/teacher/calendar?create=1&classroomSubjectId=subject%2Fid&activityId=activity%2Fid&title=%C3%94n+t%E1%BA%ADp+l%E1%BB%8Bch+s%E1%BB%AD&details=Chu%E1%BA%A9n+b%E1%BB%8B+tr%C6%B0%E1%BB%9Bc+khi+h%E1%BB%8Dc&eventType=QUIZ')
  })

  it('builds a Notebook Check link with its description', () => {
    expect(notebookCheckCalendarPath({
      classroomSubjectId: 'subject-id',
      activityId: 'notebook-id',
      title: 'Kiểm tra vở',
      details: 'Chụp bài làm rõ nét',
    })).toContain('activityId=notebook-id')
    expect(notebookCheckCalendarPath({
      classroomSubjectId: 'subject-id',
      activityId: 'notebook-id',
      title: 'Kiểm tra vở',
      details: 'Chụp bài làm rõ nét',
    })).toContain('eventType=NOTEBOOK_CHECK')
  })
})
