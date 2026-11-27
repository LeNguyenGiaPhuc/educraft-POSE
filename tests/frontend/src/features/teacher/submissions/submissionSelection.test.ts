import { describe, expect, it } from 'vitest'
import type { TeacherSubmissionSummary } from '../../../../../../frontend/src/lib/api/teacher/results'
import {
  filterSubmissionRows,
  findSubmissionRow,
  getSubmissionDetailId,
} from '../../../../../../frontend/src/features/teacher/submissions/submissionSelection'

function submission(overrides: Partial<TeacherSubmissionSummary> = {}): TeacherSubmissionSummary {
  return {
    id: 'row-1',
    submissionId: 'submission-1',
    kind: 'EXERCISE',
    activityId: 'activity-1',
    activityTitle: 'Bài tập 1',
    student: { id: 'student-1', username: 'an', fullName: 'An' },
    submittedAt: '2026-11-26T08:00:00.000Z',
    status: 'GRADED',
    score: 8,
    gradedAt: '2026-11-26T09:00:00.000Z',
    isCurrentMember: true,
    ...overrides,
  }
}

describe('submission selection', () => {
  it('selects a list row by row id but calls detail with the submission id', () => {
    const row = submission({ id: 'row-id', submissionId: 'detail-id' })
    expect(findSubmissionRow([row], 'row-id')).toBe(row)
    expect(getSubmissionDetailId(row)).toBe('detail-id')
  })

  it('never returns a detail id for a missing submission row', () => {
    const row = submission({ id: 'missing-row', submissionId: null, status: 'MISSING' })
    expect(getSubmissionDetailId(row)).toBeNull()
  })

  it('keeps former students selectable when their submission still exists', () => {
    const row = submission({ isCurrentMember: false, submissionId: 'former-submission' })
    expect(getSubmissionDetailId(row)).toBe('former-submission')
  })

  it('searches only the currently loaded page by student name or username', () => {
    const first = submission({ id: 'row-1' })
    const second = submission({ id: 'row-2', student: { id: 'student-2', username: 'binh.nguyen', fullName: 'Nguyễn Bình' } })

    expect(filterSubmissionRows([first, second], 'bình')).toEqual([second])
    expect(filterSubmissionRows([first, second], 'BINH.NGUYEN')).toEqual([second])
    expect(filterSubmissionRows([first, second], '')).toEqual([first, second])
  })
})
