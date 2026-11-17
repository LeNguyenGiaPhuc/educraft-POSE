import { describe, expect, it } from 'vitest'
import { getNotebookSelection } from '../../../../../../frontend/src/features/teacher/activities/notebookReviewState'

const periods = [
  { id: 'period-1' },
  { id: 'period-2' },
] as any

describe('getNotebookSelection', () => {
  it('keeps the preferred period and clears the submission', () => {
    expect(getNotebookSelection(periods, 'period-2')).toEqual({
      periodId: 'period-2',
      submissionId: '',
    })
  })

  it('uses the first period when the preferred period no longer exists', () => {
    expect(getNotebookSelection(periods, 'removed-period')).toEqual({
      periodId: 'period-1',
      submissionId: '',
    })
  })

  it('returns empty selection when there are no periods', () => {
    expect(getNotebookSelection([], 'period-1')).toEqual({
      periodId: '',
      submissionId: '',
    })
  })
})
