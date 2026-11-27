export type ApiEnvelope<T> = { data: T; meta?: unknown }

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api/v1${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      ...(init.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...init.headers,
    },
  })
  const body = await response.json().catch(() => null) as ApiEnvelope<T> | { error?: { message?: string } } | null
  if (!response.ok) {
    const message = body && 'error' in body ? body.error?.message : undefined
    throw new ApiError(message ?? 'Không thể kết nối máy chủ. Vui lòng thử lại.', response.status)
  }
  if (!body || !('data' in body)) throw new ApiError('Máy chủ trả về dữ liệu không hợp lệ.', response.status)
  return body.data
}

export type ApiUser = {
  id: string
  username: string
  fullName: string
  role: 'ADMIN' | 'TEACHER' | 'STUDENT'
  contact?: string | null
  mustChangePassword?: boolean
}

export const authApi = {
  login: (username: string, password: string) => apiRequest<{ user: ApiUser }>('/auth/login', {
    method: 'POST', body: JSON.stringify({ username, password }),
  }),
  me: () => apiRequest<{ user: ApiUser }>('/auth/me'),
  logout: () => apiRequest<{ success: boolean }>('/auth/logout', { method: 'POST' }),
}

export const studentApi = {
  workspace: () => apiRequest<StudentWorkspace>('/student/workspace'),
  lesson: (id: string) => apiRequest<StudentLesson>(`/student/lessons/${encodeURIComponent(id)}`),
  activities: () => apiRequest<StudentActivity[]>('/student/activities'),
  results: () => apiRequest<StudentResults>('/student/results'),
  profile: () => apiRequest<StudentProfile>('/student/profile'),
  calendar: () => apiRequest<StudentCalendar>('/student/calendar'),
  conversations: (refresh = 0) => apiRequest<StudentConversation[]>(`/student/conversations?refresh=${refresh}`),
  createConversation: (classroomId: string) => apiRequest<{ id: string; classroom_id: string; created_at: string; updated_at: string }>('/student/conversations', {
    method: 'POST', body: JSON.stringify({ classroomId }),
  }),
  sendChatTurn: (conversationId: string, question: string, classroomSubjectId?: string) => apiRequest<{ id: string; status: string; created_at: string; message: string }>(`/student/conversations/${encodeURIComponent(conversationId)}/turns`, {
    method: 'POST', body: JSON.stringify({ question, ...(classroomSubjectId ? { classroomSubjectId } : {}) }),
  }),
  createPracticeSession: (input: { classroomSubjectId: string; lessonIds: string[]; exerciseType: 'QUIZ' | 'WRITTEN'; difficulty: 'BASIC' | 'INTERMEDIATE' | 'ADVANCED'; questionCount: number }) => apiRequest<StudentPracticeSession>('/student/practice-sessions', {
    method: 'POST', body: JSON.stringify(input),
  }),
  submitPracticeSession: (sessionId: string, answers: Array<{ questionId: string; answer: string }>) => apiRequest<{ id: string; status: string; totalScore: number | string | null; answers: number }>(`/student/practice-sessions/${encodeURIComponent(sessionId)}/submissions`, {
    method: 'POST', body: JSON.stringify({ answers }),
  }),
  submitExercise: (activityId: string, answers: Array<{ questionId: string; answer: string }>) => apiRequest<{ id: string; submittedAt: string; gradingStatus: string; totalScore: number | null; message: string }>(`/student/activities/${encodeURIComponent(activityId)}/submissions`, {
    method: 'POST', body: JSON.stringify({ answers }),
  }),
  saveNotebookImages: async (activityId: string, files: File[], mode: 'append' | 'replace') => {
    const body = new FormData()
    body.set('mode', mode)
    files.forEach((file) => body.append('images', file))
    return apiRequest<{ id: string; status: string; submittedAt: string; updatedAt: string; files: Array<{ id: string; mimeType: string; order: number }> }>(`/student/activities/${encodeURIComponent(activityId)}/notebook-submissions`, { method: 'POST', body })
  },
  deleteNotebookSubmission: (id: string) => apiRequest<{ success: boolean }>(`/student/notebook-submissions/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  markNotificationRead: (id: string, read: boolean) => apiRequest<{ id: string; read: boolean }>(`/student/notifications/${encodeURIComponent(id)}/read`, {
    method: 'PATCH', body: JSON.stringify({ read }),
  }),
}

export type StudentWorkspace = {
  student: { id: string; username: string; name: string }
  current: StudentMembership | null
  history: StudentMembership[]
}

export type StudentMembership = {
  enrollmentId: string
  joinedAt: string
  leftAt: string | null
  classroom: { id: string; name: string; gradeLevel: number; academicYear: string; status: 'ACTIVE' | 'ARCHIVED' }
  subjects: StudentSubject[]
}

export type StudentSubject = {
  id: string
  subjectId: string
  name: string
  teacher: { id: string; name: string } | null
  lessons: StudentLesson[]
}

export type StudentLesson = {
  id: string
  title: string
  publishedAt: string | null
  subject?: { id: string; name: string }
  classroom?: { id: string; name: string; academicYear: string; status: string }
  materials: Array<{
    id: string
    name: string
    versions: Array<{
      id: string
      number: number
      processingStatus: string
      publishedAt: string | null
      sources: Array<{ id: string; content: string; position: string }>
    }>
  }>
}

export type StudentActivity = {
  id: string
  classroom_subject_id: string
  title: string
  kind: 'EXERCISE' | 'NOTEBOOK_CHECK'
  status: 'DRAFT' | 'PUBLISHED' | 'CLOSED'
  published_at: string | null
  closes_at: string | null
  exercise?: {
    exercise_type: 'QUIZ' | 'WRITTEN'
    questions: Array<{ id: string; prompt: string; options: unknown; max_points: number | string; explanation: string; lesson_id: string; lesson: { id: string; title: string }; citations: Array<{ segment: { id: string; position_label: string } }> }>
    submissions: Array<{ id: string; grading_status: string; submitted_at: string; answers: Array<{ question_id: string; answer: string; earned_points: number | string | null; explanation: string | null }> }>
  } | null
  notebookCheck?: { criteria: Array<{ id: string; content: string }>; periods: Array<{ id: string; period_no: number; due_at: string; closed_at: string | null; submissions: Array<{ id: string; status: string; submitted_at: string; files: Array<{ id: string; mime_type: string; byte_size: number | string; sort_order: number }>; assessment: { reviewed_at: string; evaluator: { full_name: string }; results: Array<{ criterion: { content: string }; status: string; note: string | null }> } | null }> }> } | null
  classroomSubject: { classroom: { id: string; name: string }; subject: { id: string; name: string } }
}
export type StudentCitation = { excerpt: string | null; segment: { id: string; position_label: string; materialVersion: { version_no: number; material: { file_name: string; lesson_id: string } } } }
export type StudentResults = {
  exercises: Array<{
    id: string; submitted_at: string; grading_status: string; total_score: number | string | null
    activity: { activity: { title: string; classroomSubject: { classroom: { id: string; name: string }; subject: { id: string; name: string } } } }
    answers: Array<{
      question_id: string; answer: string; earned_points: number | string | null; explanation: string | null
      question: { id: string; prompt: string; max_points: number | string; lesson: { id: string; title: string }; citations: StudentCitation[] }
      citations: StudentCitation[]
    }>
    scoreResults: Array<{ earned_points: number | string; max_points: number | string; lesson: { id: string; title: string } }>
  }>
  notebooks: Array<{
    id: string; submitted_at: string
    period: { activity: { activity: { title: string; classroomSubject: { classroom: { id: string; name: string }; subject: { id: string; name: string } } }; criteria: Array<{ id: string; content: string }> } }
    assessment: { reviewed_at: string; teacher_comment: string | null; evaluator: { full_name: string }; results: Array<{ status: string; note: string | null; criterion: { id: string; content: string } }> } | null
  }>
}
export type StudentProfile = {
  points: Array<{
    id: string; classroom_subject_id: string; lesson_id: string; stream: 'ASSIGNED' | 'SELF_PRACTICE'; earned_points: number | string; max_points: number | string; occurred_at: string
    lesson: { id: string; title: string }
    classroomSubject: { id: string; classroom_id: string; classroom: { id: string; name: string }; subject: { id: string; name: string } }
  }>
  progress: Array<{ lesson_id: string; stream: 'ASSIGNED' | 'SELF_PRACTICE'; has_difficulty: boolean; lesson: { id: string; title: string; classroom_subject_id: string } }>
}
export type StudentCalendar = {
  events: Array<{
    id: string; classroom_subject_id: string; title: string; details: string; event_type: string; starts_at: string; published_at: string | null; lesson_id: string | null; activity_id: string | null
    classroomSubject: { id: string; classroom: { id: string; name: string }; subject: { id: string; name: string } }
    lesson: { id: string; title: string } | null
    activity: { id: string; title: string; kind: string } | null
    notifications: Array<{ id: string; read_at: string | null }>
  }>
  notifications: Array<{
    id: string; title: string; body: string; created_at: string; read_at: string | null
    scheduleEvent: (StudentCalendar['events'][number] & { classroomSubject: StudentCalendar['events'][number]['classroomSubject'] }) | null
    activity: { id: string; title: string; classroomSubject: { classroom: { id: string; name: string }; subject: { id: string; name: string } } } | null
  }>
}
export type StudentConversation = {
  id: string; classroom_id: string; created_at: string; updated_at: string
  classroom: { id: string; name: string }
  turns: Array<{
    id: string; status: string; created_at: string
    messages: Array<{
      id: string; role: 'USER' | 'ASSISTANT'; content: string; created_at: string
      citations: Array<{ segment: { id: string; position_label: string } }>
    }>
  }>
}
export type StudentPracticeSession = {
  id: string; status: string; started_at: string; exercise_type: 'QUIZ' | 'WRITTEN'; difficulty: string; question_count: number
  questions: Array<{ id: string; prompt: string; options: unknown; max_points: number | string; lesson_id: string; lesson: { id: string; title: string }; citations: Array<{ segment: { id: string; position_label: string } }> }>
}
