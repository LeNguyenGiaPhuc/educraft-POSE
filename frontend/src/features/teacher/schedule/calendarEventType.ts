const eventTypeLabels: Record<string, string> = {
  LESSON: 'Bài học',
  ACTIVITY: 'Hoạt động',
  NOTEBOOK_CHECK: 'Kiểm tra vở',
  QUIZ: 'Quiz',
  WRITTEN: 'Tự luận',
}

export function eventTypeLabel(value: string): string {
  return eventTypeLabels[value] ?? (value || 'Bài học')
}

export function eventTypeForApi(value: string, originalValue: string): string {
  const original = originalValue.trim() || 'LESSON'
  const displayValue = value.trim()

  if (displayValue === eventTypeLabel(original)) return original
  if (!displayValue) return 'LESSON'

  for (const [code, label] of Object.entries(eventTypeLabels)) {
    if (displayValue === label) return code
  }

  return displayValue
}
