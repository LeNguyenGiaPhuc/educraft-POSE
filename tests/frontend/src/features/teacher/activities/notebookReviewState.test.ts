import { describe, expect, it } from 'vitest'
import {
  buildTeacherReviewDraft,
  getNotebookSelection,
  hasOpenNotebookPeriod,
  isCurrentReviewRequest,
  submissionStatusLabel,
} from '../../../../../../frontend/src/features/teacher/activities/notebookReviewState'

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

describe('notebook review integrity', () => {
  const review = {
    criteria: [{ id: 'criterion-1' }, { id: 'criterion-2' }],
    assessment: null,
    aiDraft: {
      suggestions: [
        { criterionId: 'criterion-1', status: 'RECORDED', note: 'AI nhận thấy nội dung này.' },
      ],
    },
  } as any

  it('keeps AI suggestions advisory instead of treating them as teacher decisions', () => {
    expect(buildTeacherReviewDraft(review)).toEqual({
      comment: '',
      results: {
        'criterion-1': { status: 'UNDETERMINED', note: '' },
        'criterion-2': { status: 'UNDETERMINED', note: '' },
      },
    })
  })

  it('preserves unsaved teacher edits when AI analysis is refreshed', () => {
    const draft = {
      comment: 'Nhận xét giáo viên chưa lưu',
      results: {
        'criterion-1': { status: 'NEEDS_SUPPLEMENTATION' as const, note: 'Cần bổ sung ngày tháng.' },
      },
    }

    expect(buildTeacherReviewDraft(review, draft)).toEqual(draft)
  })

  it('uses a saved assessment as the official review state', () => {
    const saved = {
      ...review,
      assessment: {
        teacherComment: 'Đã kiểm tra',
        results: [{ criterionId: 'criterion-1', status: 'RECORDED', note: 'Đủ nội dung' }],
      },
    }

    expect(buildTeacherReviewDraft(saved)).toEqual({
      comment: 'Đã kiểm tra',
      results: {
        'criterion-1': { status: 'RECORDED', note: 'Đủ nội dung' },
        'criterion-2': { status: 'UNDETERMINED', note: '' },
      },
    })
  })

  it('allows only one open submission period and translates exact statuses', () => {
    expect(hasOpenNotebookPeriod([{ closedAt: null }, { closedAt: '2026-11-26T00:00:00Z' }])).toBe(true)
    expect(hasOpenNotebookPeriod([{ closedAt: '2026-11-26T00:00:00Z' }])).toBe(false)
    expect(submissionStatusLabel('CURRENT')).toBe('Đang nộp')
    expect(submissionStatusLabel('LOCKED')).toBe('Đã khóa')
    expect(submissionStatusLabel('FINALIZED')).toBe('Đã chốt')
  })

  it('rejects an async response that belongs to an older review target', () => {
    expect(isCurrentReviewRequest({ requestId: 4, submissionId: 'submission-b' }, 3, 'submission-a')).toBe(false)
    expect(isCurrentReviewRequest({ requestId: 4, submissionId: 'submission-b' }, 4, 'submission-a')).toBe(false)
    expect(isCurrentReviewRequest({ requestId: 4, submissionId: 'submission-b' }, 4, 'submission-b')).toBe(true)
  })
})
