import type {
  TeacherCriterionStatus,
  TeacherNotebookPeriod,
  TeacherNotebookSubmissionReview,
  TeacherNotebookSubmissionStatus,
} from '../../../lib/api/teacher/notebookChecks'

export type TeacherReviewDraft = {
  comment: string
  results: Record<string, { status: TeacherCriterionStatus; note: string }>
}

export type ReviewRequestIdentity = {
  requestId: number
  submissionId: string
}

export function isCurrentReviewRequest(
  current: ReviewRequestIdentity,
  requestId: number,
  submissionId: string,
): boolean {
  return current.requestId === requestId && current.submissionId === submissionId
}

export function getNotebookSelection(
  periods: Pick<TeacherNotebookPeriod, 'id'>[],
  preferredPeriodId: string
): { periodId: string; submissionId: '' } {
  const preferredPeriod = periods.find((period) => period.id === preferredPeriodId)
  return {
    periodId: preferredPeriod?.id ?? periods[0]?.id ?? '',
    submissionId: '',
  }
}

export function buildTeacherReviewDraft(
  review: Pick<TeacherNotebookSubmissionReview, 'criteria' | 'assessment'>,
  currentDraft?: TeacherReviewDraft,
): TeacherReviewDraft {
  if (currentDraft) return currentDraft

  const savedResults = new Map((review.assessment?.results ?? []).map((item) => [item.criterionId, item]))
  const results: TeacherReviewDraft['results'] = {}

  for (const criterion of review.criteria) {
    const saved = savedResults.get(criterion.id)
    results[criterion.id] = {
      status: saved?.status ?? 'UNDETERMINED',
      note: saved?.note ?? '',
    }
  }

  return {
    comment: review.assessment?.teacherComment ?? '',
    results,
  }
}

export function hasOpenNotebookPeriod(periods: Array<Pick<TeacherNotebookPeriod, 'closedAt'>>): boolean {
  return periods.some((period) => period.closedAt === null)
}

export function submissionStatusLabel(status: TeacherNotebookSubmissionStatus): string {
  if (status === 'CURRENT') return 'Đang nộp'
  if (status === 'LOCKED') return 'Đã khóa'
  return 'Đã chốt'
}
