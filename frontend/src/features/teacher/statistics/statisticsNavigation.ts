import { teacherWorkspacePath } from '../../../lib/api/teacher/workspace'

export function createStatisticsSubmissionsPath(
  classroomId: string,
  classroomSubjectId: string,
  activityId = '',
  kind?: 'EXERCISE' | 'NOTEBOOK_CHECK',
  periodId = ''
): string {
  const query = new URLSearchParams({ tab: 'submissions' })

  if (activityId) {
    query.set('submissionActivityId', activityId)
  }
  if (kind) {
    query.set('submissionKind', kind)
  }
  if (periodId) {
    query.set('submissionPeriodId', periodId)
  }

  return `${teacherWorkspacePath(classroomId, classroomSubjectId)}?${query.toString()}`
}
