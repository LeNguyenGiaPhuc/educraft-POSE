import { describe, expect, it } from 'vitest'
import { createStatisticsSubmissionsPath } from '../../../../../../frontend/src/features/teacher/statistics/statisticsNavigation'

describe('statistics navigation', () => {
  it('keeps the workspace and selected activity when opening submissions', () => {
    expect(createStatisticsSubmissionsPath('classroom/1', 'subject/1', 'activity/1'))
      .toBe('/teacher/classes/classroom%2F1/subjects/subject%2F1?tab=submissions&submissionActivityId=activity%2F1')
  })

  it('opens the aggregate submissions view when no activity is selected', () => {
    expect(createStatisticsSubmissionsPath('classroom-1', 'subject-1'))
      .toBe('/teacher/classes/classroom-1/subjects/subject-1?tab=submissions')
  })
})
