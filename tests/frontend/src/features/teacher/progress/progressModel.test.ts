import { describe, expect, it } from 'vitest'
import { buildProgressPoints } from '../../../../../../frontend/src/features/teacher/progress/progressModel'
import type { TeacherStudentProgressResult } from '../../../../../../frontend/src/lib/api/teacher/results'

const progress: TeacherStudentProgressResult = {
  classroomSubject: {
    id: 'subject-id',
    classroom: { id: 'class-id', name: '11A', status: 'ACTIVE', academicYear: '2026-2027', gradeLevel: 11 },
    subject: { id: 'history-id', name: 'Lịch sử' },
  },
  student: { id: 'student-id', username: 'an', fullName: 'An', status: 'ACTIVE' },
  lessons: [
    {
      lessonId: 'lesson-late', title: 'Bài sau', hasDifficulty: false, lastResultId: 'late', updatedAt: null,
      results: [{ id: 'late', earnedPoints: 0, maxPoints: 10, percentage: 0, occurredAt: '2026-11-20T00:00:00.000Z', gradedAt: '2026-11-20T01:00:00.000Z', exerciseSubmissionId: 'submission-late' }],
    },
    {
      lessonId: 'lesson-early', title: 'Bài trước', hasDifficulty: true, lastResultId: 'early', updatedAt: null,
      results: [{ id: 'early', earnedPoints: null, maxPoints: null, percentage: null, occurredAt: '2026-11-01T00:00:00.000Z', gradedAt: '2026-11-01T01:00:00.000Z', exerciseSubmissionId: null }],
    },
  ],
}

describe('progress model', () => {
  it('orders exercise result points chronologically and preserves null versus zero', () => {
    const points = buildProgressPoints(progress)

    expect(points.map((point) => point.id)).toEqual(['early', 'late'])
    expect(points[0].percentage).toBeNull()
    expect(points[1].percentage).toBe(0)
  })
})
