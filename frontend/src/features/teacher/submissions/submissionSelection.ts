import type { TeacherSubmissionSummary } from '../../../lib/api/teacher/results'

export function findSubmissionRow(
  items: TeacherSubmissionSummary[],
  rowId: string
): TeacherSubmissionSummary | null {
  return items.find((item) => item.id === rowId) ?? null
}

export function getSubmissionDetailId(item: TeacherSubmissionSummary): string | null {
  return item.submissionId || null
}

export function filterSubmissionRows(
  items: TeacherSubmissionSummary[],
  searchTerm: string
): TeacherSubmissionSummary[] {
  const normalized = searchTerm.trim().toLocaleLowerCase('vi')
  if (!normalized) return items

  return items.filter((item) => {
    const student = `${item.student.fullName} ${item.student.username}`.toLocaleLowerCase('vi')
    return student.includes(normalized)
  })
}
