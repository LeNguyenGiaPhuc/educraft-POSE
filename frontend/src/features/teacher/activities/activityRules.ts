export function canEditActivityContent(submittedCount: number): boolean {
  return submittedCount === 0
}

export function canDeleteActivity(submittedCount: number): boolean {
  return submittedCount === 0
}

export function getActivitySubmissionCount(
  activityId: string,
  assignedList: Array<{ id: string; submitted: number }>,
): number {
  return assignedList.find((item) => item.id === activityId)?.submitted ?? 0
}

export const difficultyLabels: Record<'BASIC' | 'INTERMEDIATE' | 'ADVANCED', string> = {
  BASIC: 'Cơ bản',
  INTERMEDIATE: 'Trung bình',
  ADVANCED: 'Nâng cao',
}
