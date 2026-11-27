export type ActivityBuilderStep = 1 | 2 | 3

export const activityBuilderSteps: Array<{ id: ActivityBuilderStep; label: string }> = [
  { id: 1, label: 'Thiết lập hoạt động' },
  { id: 2, label: 'Xây dựng câu hỏi' },
  { id: 3, label: 'Kiểm tra và công bố' },
]

export function getSetupStepError(title: string, lessonIds: string[]): string {
  if (!title.trim()) return 'Tên hoạt động không được để trống.'
  if (lessonIds.length === 0) return 'Cần chọn ít nhất một bài học đã công bố.'
  return ''
}

export function getQuestionStepError(questionCount: number): string {
  return questionCount > 0 ? '' : 'Cần có ít nhất một câu hỏi trước khi kiểm tra.'
}
