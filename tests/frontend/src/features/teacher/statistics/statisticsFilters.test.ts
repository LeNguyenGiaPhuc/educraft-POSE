import { describe, expect, it } from 'vitest'
import type { TeacherActivitySummary } from '../../../../../../frontend/src/lib/api/teacher/activities'
import type { TeacherNotebookCheckSummary } from '../../../../../../frontend/src/lib/api/teacher/notebookChecks'
import { getEligibleStatisticsActivities, getStatisticsActivityId, getStatisticsPeriodId } from '../../../../../../frontend/src/features/teacher/statistics/statisticsFilters'

function activity(overrides: Partial<TeacherActivitySummary>): TeacherActivitySummary {
  return {
    id: 'activity-1',
    classroom_subject_id: 'subject-1',
    title: 'Ôn tập bài học',
    description: '',
    kind: 'EXERCISE',
    status: 'PUBLISHED',
    published_at: null,
    closes_at: null,
    created_at: '2026-11-01T00:00:00.000Z',
    exercise: { exercise_type: 'QUIZ', difficulty: 'BASIC', question_count: 3 },
    questionCount: 3,
    submissionCount: 0,
    ...overrides,
  }
}

function notebookCheck(overrides: Partial<TeacherNotebookCheckSummary>): TeacherNotebookCheckSummary {
  return {
    id: 'notebook-1',
    classroomSubjectId: 'subject-1',
    title: 'Kiểm tra vở tuần 1',
    description: '',
    kind: 'NOTEBOOK_CHECK',
    status: 'PUBLISHED',
    publishedAt: null,
    closesAt: null,
    createdAt: '2026-11-01T00:00:00.000Z',
    referenceCount: 1,
    criteriaCount: 2,
    periodCount: 1,
    ...overrides,
  }
}

describe('statistics activity filters', () => {
  it('keeps only published and closed activities', () => {
    const result = getEligibleStatisticsActivities([
      activity({ id: 'draft', status: 'DRAFT' }),
      activity({ id: 'published', status: 'PUBLISHED' }),
      activity({ id: 'closed', status: 'CLOSED', exercise: { exercise_type: 'WRITTEN', difficulty: 'INTERMEDIATE', question_count: 1 } }),
      notebookCheck({ id: 'notebook', status: 'PUBLISHED' }),
    ])

    expect(result.map((item) => item.id)).toEqual(['published', 'closed', 'notebook'])
    expect(result.map((item) => item.kind)).toEqual(['EXERCISE', 'EXERCISE', 'NOTEBOOK_CHECK'])
  })

  it('returns an empty selection for a missing or invalid query value', () => {
    const options = getEligibleStatisticsActivities([activity({ id: 'published' })])

    expect(getStatisticsActivityId(null, options)).toBe('')
    expect(getStatisticsActivityId('unknown', options)).toBe('')
  })

  it('keeps a valid selected activity ID', () => {
    const options = getEligibleStatisticsActivities([activity({ id: 'published' })])

    expect(getStatisticsActivityId('published', options)).toBe('published')
  })

  it('keeps only a period that belongs to the selected notebook activity', () => {
    const periods = [{ id: 'period-1', periodNo: 1 }, { id: 'period-2', periodNo: 2 }]

    expect(getStatisticsPeriodId('period-2', periods)).toBe('period-2')
    expect(getStatisticsPeriodId('unknown', periods)).toBe('')
    expect(getStatisticsPeriodId('', periods)).toBe('')
  })
})
