import type { TeacherNotebookPeriod } from '../../../lib/api/teacher/notebookChecks'

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
