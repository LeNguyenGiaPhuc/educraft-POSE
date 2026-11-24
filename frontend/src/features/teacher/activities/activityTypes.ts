export type ExerciseType = 'QUIZ' | 'WRITTEN'
export type Difficulty = 'BASIC' | 'INTERMEDIATE' | 'ADVANCED'

export type ActivityPreview = {
  id: string
  classroomSubjectId: string
  title: string
  type: 'QUIZ' | 'WRITTEN' | 'NOTEBOOK'
  status: 'PUBLISHED' | 'CLOSED'
  closesAt: string
  content?: ActivityContent
}

export type ExerciseQuestion = {
  id: string
  prompt: string
  options?: string[]
  answer: string
  markingCriteria?: string
  maxPoints: number
  lessonTag: string
  explanation: string
  citation: string
}

export type ActivityContent = {
  kind: 'EXERCISE'
  questions: ExerciseQuestion[]
  sourceLessons: { id: string; title: string; materials: { name: string; version: number; sourcePosition: string }[] }[]
  difficulty: Difficulty
  requestedCount: number
} | {
  kind: 'NOTEBOOK'
  description: string
  criteria: { id: string; content: string; confirmed: boolean }[]
  images: { name: string; size: number }[]
}

export type ActivityPublicationDraft = Pick<ActivityPreview, 'title' | 'closesAt' | 'type'> & { content: ActivityContent }

export type ActivityChanges = {
  updated: Record<string, ActivityPreview>
  deleted: string[]
}
