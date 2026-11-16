import { apiRequest } from '../client'
import type { TeacherClassroomStatus } from './types'

export type TeacherResultSubjectContext = {
  id: string
  classroom: {
    id: string
    name: string
    status: TeacherClassroomStatus
    academicYear: string
    gradeLevel: number
  }
  subject: {
    id: string
    name: string
  }
}

export type TeacherPromptTopicItem = {
  id: string
  student: {
    id: string
    username: string
    fullName: string
  }
  periodStart: string
  periodEnd: string
  promptCount: number
  generatedAt: string
  topics: Array<{
    label: string
    count: number
  }>
}

export type TeacherPromptTopicsResult = {
  classroomSubject: TeacherResultSubjectContext
  items: TeacherPromptTopicItem[]
}

export type TeacherPromptTopicsQuery = {
  studentId?: string
  periodStart?: string
  periodEnd?: string
}

export type TeacherStatisticsResult = {
  classroomSubject: TeacherResultSubjectContext
  studentCount: number
  exercise: {
    activityCount: number
    expectedSubmissions: number
    submittedSubmissions: number
    gradedSubmissions: number
    pendingSubmissions: number
    failedSubmissions: number
    averageScore: number | null
    submissionRate: number | null
  }
  notebook: {
    activityCount: number
    periodCount: number
    expectedSubmissions: number
    submittedSubmissions: number
    finalizedSubmissions: number
    pendingSubmissions: number
    submissionRate: number | null
    finalizationRate: number | null
    criteria: Array<{
      criterionId: string
      content: string
      needsSupplementation: number
      undetermined: number
    }>
  }
}

export type TeacherStudentProgressResult = {
  classroomSubject: TeacherResultSubjectContext
  student: {
    id: string
    username: string
    fullName: string
    status: string
  }
  lessons: Array<{
    lessonId: string
    title: string
    hasDifficulty: boolean
    lastResultId: string | null
    updatedAt: string | null
    results: Array<{
      id: string
      earnedPoints: number | null
      maxPoints: number | null
      percentage: number | null
      occurredAt: string
      gradedAt: string
      exerciseSubmissionId: string | null
    }>
  }>
}

export type TeacherSubmissionKind = 'EXERCISE' | 'NOTEBOOK_CHECK'
export type TeacherExerciseSubmissionStatus = 'PENDING' | 'PROCESSING' | 'GRADED' | 'FAILED'
export type TeacherNotebookSubmissionStatus = 'CURRENT' | 'LOCKED' | 'FINALIZED'
export type TeacherSubmissionStatus = TeacherExerciseSubmissionStatus | TeacherNotebookSubmissionStatus

export type TeacherSubmissionSummary = {
  id: string
  kind: TeacherSubmissionKind
  activityId: string
  activityTitle: string
  student: {
    id: string
    username: string
    fullName: string
  }
  submittedAt: string
  status: TeacherSubmissionStatus
  score: number | null
  gradedAt: string | null
}

export type TeacherSubmissionListMeta = {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export type TeacherSubmissionListResult = {
  items: TeacherSubmissionSummary[]
  meta: TeacherSubmissionListMeta
}

export type TeacherSubmissionQuery = {
  activityId?: string
  studentId?: string
  kind?: TeacherSubmissionKind
  status?: TeacherSubmissionStatus
  page?: number
  pageSize?: number
}

export type TeacherExerciseResult = {
  id: string
  kind: 'EXERCISE'
  activity: {
    id: string
    title: string
    description: string | null
    status: string
    closesAt: string | null
    exerciseType: 'QUIZ' | 'WRITTEN'
    classroomSubject: TeacherResultSubjectContext
  }
  student: TeacherSubmissionSummary['student']
  submittedAt: string
  gradingStatus: TeacherExerciseSubmissionStatus
  totalScore: number | null
  gradedAt: string | null
  answers: Array<{
    id: string
    questionId: string
    question: {
      id: string
      prompt: string
      maxPoints: number | null
      sortOrder: number
      explanation: string | null
    }
    answer: string | null
    earnedPoints: number | null
    explanation: string | null
    gradingStatus: string
    answeredAt: string
    citations: Array<{
      excerpt: string | null
      segment: {
        id: string
        positionType: string
        positionIndex: number
        positionLabel: string
        content: string
      }
    }>
  }>
}

export type TeacherNotebookResult = {
  id: string
  kind: 'NOTEBOOK_CHECK'
  activity: {
    id: string
    title: string
    description: string | null
    status: string
    classroomSubject: TeacherResultSubjectContext
  }
  student: TeacherSubmissionSummary['student']
  period: {
    id: string
    periodNo: number
    dueAt: string
    closedAt: string | null
  }
  submittedAt: string
  updatedAt: string
  status: TeacherNotebookSubmissionStatus
  processingStatus: string
  criteria: Array<{
    id: string
    content: string
    orderIndex: number
  }>
  assessment: {
    id: string
    teacherComment: string | null
    reviewedAt: string
    evaluator: {
      id: string
      username: string
      fullName: string
    }
    results: Array<{
      id: string
      criterionId: string
      status: string
      note: string | null
      criterion: {
        id: string
        content: string
        orderIndex: number
      }
    }>
  } | null
}

function promptTopicsPath(classroomSubjectId: string, query: TeacherPromptTopicsQuery): string {
  const params = new URLSearchParams()
  if (query.studentId) params.set('studentId', query.studentId)
  if (query.periodStart) params.set('periodStart', query.periodStart)
  if (query.periodEnd) params.set('periodEnd', query.periodEnd)

  const base = `/teacher/classroom-subjects/${encodeURIComponent(classroomSubjectId)}/prompt-topics`
  const queryString = params.toString()
  return queryString ? `${base}?${queryString}` : base
}

function submissionsPath(classroomSubjectId: string, query: TeacherSubmissionQuery): string {
  const params = new URLSearchParams()
  if (query.activityId) params.set('activityId', query.activityId)
  if (query.studentId) params.set('studentId', query.studentId)
  if (query.kind) params.set('kind', query.kind)
  if (query.status) params.set('status', query.status)
  if (query.page !== undefined) params.set('page', String(query.page))
  if (query.pageSize !== undefined) params.set('pageSize', String(query.pageSize))

  const base = `/teacher/classroom-subjects/${encodeURIComponent(classroomSubjectId)}/submissions`
  const queryString = params.toString()
  return queryString ? `${base}?${queryString}` : base
}

export const teacherResultsApi = {
  async getPromptTopics(
    classroomSubjectId: string,
    query: TeacherPromptTopicsQuery = {}
  ): Promise<TeacherPromptTopicsResult> {
    const response = await apiRequest<TeacherPromptTopicsResult>(promptTopicsPath(classroomSubjectId, query))
    return response.data
  },

  async getStatistics(classroomSubjectId: string, activityId?: string): Promise<TeacherStatisticsResult> {
    const params = new URLSearchParams()
    if (activityId) params.set('activityId', activityId)
    const queryString = params.toString()
    const path = `/teacher/classroom-subjects/${encodeURIComponent(classroomSubjectId)}/statistics${queryString ? `?${queryString}` : ''}`
    const response = await apiRequest<TeacherStatisticsResult>(path)
    return response.data
  },

  async getStudentProgress(classroomSubjectId: string, studentId: string): Promise<TeacherStudentProgressResult> {
    const response = await apiRequest<TeacherStudentProgressResult>(
      `/teacher/classroom-subjects/${encodeURIComponent(classroomSubjectId)}/students/${encodeURIComponent(studentId)}/progress`
    )
    return response.data
  },

  async listSubmissions(
    classroomSubjectId: string,
    query: TeacherSubmissionQuery = {}
  ): Promise<TeacherSubmissionListResult> {
    const response = await apiRequest<TeacherSubmissionSummary[]>(submissionsPath(classroomSubjectId, query))
    return {
      items: response.data,
      meta: response.meta as TeacherSubmissionListMeta,
    }
  },

  async getExerciseResult(submissionId: string): Promise<TeacherExerciseResult> {
    const response = await apiRequest<TeacherExerciseResult>(
      `/teacher/exercise-submissions/${encodeURIComponent(submissionId)}/result`
    )
    return response.data
  },

  async getNotebookResult(submissionId: string): Promise<TeacherNotebookResult> {
    const response = await apiRequest<TeacherNotebookResult>(
      `/teacher/notebook-submissions/${encodeURIComponent(submissionId)}/result`
    )
    return response.data
  },
}
