export type PromptSummaryStudent = {
  studentId: string
  studentName: string
  classroomId: string
  classroomName: string
  subjectId: string
  subjectName: string
}

export type PromptSummaryStats = {
  entryCount: number
  topicCount: number
  occurrenceCount: number
  promptCount: number
  latestPeriodEnd: string
  latestGeneratedAt: string
}

export type PromptSummaryTopic = {
  id: string
  label: string
  count: number
  periodStart: string
  periodEnd: string
  promptCount: number
  generatedAt: string
}
