export type PromptSummaryStudent = {
  studentId: string
  studentName: string
  classroomId: string
  classroomName: string
  subjectId: string
  subjectName: string
}

export type PromptSummaryStats = {
  count: number
  latestDate: string
}

export type PromptSummaryTopic = {
  id: string
  label: string
  count: number
  periodStart: string
  periodEnd: string
}
