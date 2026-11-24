import { describe, expect, it } from 'vitest'
import { canDeleteActivity, canEditActivityContent, getActivitySubmissionCount } from '../../../../../../frontend/src/features/teacher/activities/activityRules'

describe('activity rules', () => {
  it('locks content changes and deletion after the first submission', () => {
    expect(canEditActivityContent(0)).toBe(true)
    expect(canEditActivityContent(1)).toBe(false)
    expect(canDeleteActivity(0)).toBe(true)
    expect(canDeleteActivity(1)).toBe(false)
  })

  it('reads a missing activity as having no submissions', () => {
    expect(getActivitySubmissionCount('missing', [{ id: 'one', submitted: 2 }])).toBe(0)
  })
})
