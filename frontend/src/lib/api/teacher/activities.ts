import { apiRequest } from '../client'

export type TeacherActivityStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED'
export type TeacherExerciseType = 'QUIZ' | 'WRITTEN'
export type TeacherActivityDifficulty = 'BASIC' | 'INTERMEDIATE' | 'ADVANCED'

export type TeacherActivitySummary = {
  id: string
  classroom_subject_id: string
  title: string
  description: string
  kind: 'EXERCISE'
  status: TeacherActivityStatus
  published_at: string | null
  closes_at: string | null
  created_at: string
  exercise: {
    exercise_type: TeacherExerciseType
    difficulty: TeacherActivityDifficulty
    question_count: number
  } | null
  questionCount: number
  submissionCount: number
}

export type TeacherActivityLesson = {
  id: string
  title: string
  status: 'DRAFT' | 'PUBLISHED'
}

export type TeacherActivityQuestion = {
  id: string
  prompt: string
  options: string[]
  answerKey: string | null
  markingCriteria: string | null
  explanation: string
  maxPoints: number
  sortOrder: number
  lessonId: string
  citations: Array<{
    segmentId: string
    excerpt: string | null
    segmentContent: string
  }>
}

export type TeacherActivityDetail = TeacherActivitySummary & {
  lessons: TeacherActivityLesson[]
  questions: TeacherActivityQuestion[]
}

export type TeacherCreateActivityInput = {
  title: string
  description: string
  exerciseType: TeacherExerciseType
  difficulty: TeacherActivityDifficulty
  lessonIds: string[]
  closesAt: string | null
}

export type TeacherUpdateActivityInput = {
  title?: string
  description?: string
  difficulty?: TeacherActivityDifficulty
  lessonIds?: string[]
  closesAt?: string | null
}

export type TeacherQuestionInput = {
  prompt: string
  options?: string[]
  answerKey?: string
  markingCriteria?: string
  explanation: string
  maxPoints: number
  lessonId: string
  citations: Array<{ segmentId: string; excerpt?: string }>
}

export type TeacherAiDraftResult = {
  status: 'READY' | 'UNAVAILABLE' | 'FAILED'
  message?: string
  questions: Array<{
    prompt: string
    options?: string[]
    answerKey?: string
    markingCriteria?: string
    explanation: string
    maxPoints: number
    lessonId: string
    citations: Array<{ segmentId: string; excerpt?: string }>
  }>
}

type RawActivitySummary = {
  id: string
  classroom_subject_id: string
  title: string
  description: string
  kind: 'EXERCISE'
  status: TeacherActivityStatus
  published_at: string | null
  closes_at: string | null
  created_at: string
  exercise: {
    exercise_type: TeacherExerciseType
    difficulty: TeacherActivityDifficulty
    question_count: number
    _count?: { questions?: number; submissions?: number }
  } | null
}

type RawActivityDetail = RawActivitySummary & {
  exercise: NonNullable<RawActivitySummary['exercise']> & {
    lessons: Array<{ lesson: TeacherActivityLesson }>
    questions: Array<{
      id: string
      prompt: string
      options: unknown
      answer_key: string | null
      marking_criteria: string | null
      explanation: string
      max_points: number | string
      sort_order: number
      lesson_id: string
      citations: Array<{
        excerpt: string | null
        segment_id: string
        segment: { content: string }
      }>
    }>
    _count?: { submissions?: number }
  }
}

function mapSummary(raw: RawActivitySummary): TeacherActivitySummary {
  return {
    ...raw,
    questionCount: raw.exercise?._count?.questions ?? raw.exercise?.question_count ?? 0,
    submissionCount: raw.exercise?._count?.submissions ?? 0,
  }
}

function mapDetail(raw: RawActivityDetail): TeacherActivityDetail {
  const summary = mapSummary(raw)
  return {
    ...summary,
    lessons: raw.exercise?.lessons.map((item) => item.lesson) ?? [],
    questions: raw.exercise?.questions.map((question) => ({
      id: question.id,
      prompt: question.prompt,
      options: Array.isArray(question.options) ? question.options.filter((item): item is string => typeof item === 'string') : [],
      answerKey: question.answer_key,
      markingCriteria: question.marking_criteria,
      explanation: question.explanation,
      maxPoints: Number(question.max_points),
      sortOrder: question.sort_order,
      lessonId: question.lesson_id,
      citations: question.citations.map((citation) => ({
        segmentId: citation.segment_id,
        excerpt: citation.excerpt,
        segmentContent: citation.segment.content,
      })),
    })) ?? [],
  }
}

export const teacherActivitiesApi = {
  async list(classroomSubjectId: string): Promise<TeacherActivitySummary[]> {
    const response = await apiRequest<RawActivitySummary[]>(`/teacher/classroom-subjects/${encodeURIComponent(classroomSubjectId)}/activities`)
    return response.data.map(mapSummary)
  },

  async getDetail(activityId: string): Promise<TeacherActivityDetail> {
    const response = await apiRequest<RawActivityDetail>(`/teacher/activities/${encodeURIComponent(activityId)}`)
    return mapDetail(response.data)
  },

  async create(classroomSubjectId: string, input: TeacherCreateActivityInput): Promise<TeacherActivityDetail> {
    const response = await apiRequest<RawActivityDetail>(`/teacher/classroom-subjects/${encodeURIComponent(classroomSubjectId)}/activities`, {
      method: 'POST',
      body: input,
    })
    return mapDetail(response.data)
  },

  async update(activityId: string, input: TeacherUpdateActivityInput): Promise<TeacherActivityDetail> {
    const response = await apiRequest<RawActivityDetail>(`/teacher/activities/${encodeURIComponent(activityId)}`, {
      method: 'PATCH',
      body: input,
    })
    return mapDetail(response.data)
  },

  async aiDraft(activityId: string, input: { lessonIds: string[]; questionCount: number; difficulty: TeacherActivityDifficulty }): Promise<TeacherAiDraftResult> {
    const response = await apiRequest<TeacherAiDraftResult>(`/teacher/activities/${encodeURIComponent(activityId)}/ai-draft`, {
      method: 'POST',
      body: input,
    })
    return response.data
  },

  async putQuestions(activityId: string, questions: TeacherQuestionInput[]): Promise<TeacherActivityDetail> {
    const response = await apiRequest<RawActivityDetail>(`/teacher/activities/${encodeURIComponent(activityId)}/questions`, {
      method: 'PUT',
      body: { questions },
    })
    return mapDetail(response.data)
  },

  async publish(activityId: string): Promise<TeacherActivityDetail> {
    const response = await apiRequest<RawActivityDetail>(`/teacher/activities/${encodeURIComponent(activityId)}/publish`, {
      method: 'POST',
    })
    return mapDetail(response.data)
  },

  async close(activityId: string): Promise<TeacherActivityDetail> {
    const response = await apiRequest<RawActivityDetail>(`/teacher/activities/${encodeURIComponent(activityId)}/close`, {
      method: 'POST',
    })
    return mapDetail(response.data)
  },

  async reopen(activityId: string, input: { closesAt: string | null }): Promise<TeacherActivityDetail> {
    const response = await apiRequest<RawActivityDetail>(`/teacher/activities/${encodeURIComponent(activityId)}/reopen`, {
      method: 'POST',
      body: input,
    })
    return mapDetail(response.data)
  },

  async remove(activityId: string): Promise<{ success: boolean }> {
    const response = await apiRequest<{ success: boolean }>(`/teacher/activities/${encodeURIComponent(activityId)}`, {
      method: 'DELETE',
    })
    return response.data
  },
}
