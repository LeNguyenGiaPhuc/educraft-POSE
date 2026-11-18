import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { StudentProgress } from '../../../../../../frontend/src/features/teacher/progress/ProgressPage'

const progress = {
  classroomSubject: {
    id: 'subject-id',
    classroom: { id: 'classroom-id', name: '11A2', status: 'ACTIVE' as const, academicYear: '2026-2027', gradeLevel: 11 },
    subject: { id: 'history-id', name: 'Lịch sử' },
  },
  student: { id: 'student-id', username: 'phuc', fullName: 'Phúc', status: 'ACTIVE' },
  lessons: [{
    lessonId: 'lesson-id',
    title: 'Bài 1',
    hasDifficulty: false,
    lastResultId: 'result-id',
    updatedAt: '2026-11-17T00:00:00.000Z',
    results: [{
      id: 'result-id',
      earnedPoints: 8,
      maxPoints: 10,
      percentage: 80,
      occurredAt: '2026-11-17T00:00:00.000Z',
      gradedAt: '2026-11-17T00:00:00.000Z',
      exerciseSubmissionId: 'submission-id',
    }],
  }],
}

describe('StudentProgress', () => {
  it('links a graded exercise point to the Teacher submission result view', () => {
    const html = renderToStaticMarkup(<MemoryRouter><StudentProgress progress={progress} /></MemoryRouter>)

    expect(html).toContain('/teacher/classes/classroom-id/subjects/subject-id?tab=submissions')
    expect(html).toContain('submissionId=submission-id')
    expect(html).toContain('submissionKind=EXERCISE')
  })

  it('keeps a progress point without an exercise submission as plain text', () => {
    const html = renderToStaticMarkup(<MemoryRouter><StudentProgress progress={{
      ...progress,
      lessons: [{ ...progress.lessons[0], results: [{ ...progress.lessons[0].results[0], exerciseSubmissionId: null }] }],
    }} /></MemoryRouter>)

    expect(html).not.toContain('submissionId=submission-id')
    expect(html).toContain('8/10 điểm')
  })
})
