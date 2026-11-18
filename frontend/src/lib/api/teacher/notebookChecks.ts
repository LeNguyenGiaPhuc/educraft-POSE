import { apiDownload, apiRequest } from '../client'

export type TeacherNotebookCheckStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED'
export type TeacherNotebookSubmissionStatus = 'CURRENT' | 'LOCKED' | 'FINALIZED'
export type TeacherNotebookProcessingStatus = 'PENDING' | 'PROCESSING' | 'PROCESSED' | 'FAILED'
export type TeacherCriterionStatus = 'RECORDED' | 'NEEDS_SUPPLEMENTATION' | 'UNDETERMINED'

export type TeacherNotebookReferenceFile = {
  id: string
  mimeType: string
  byteSize: number
  sortOrder: number
}

export type TeacherNotebookCriterion = {
  id: string
  content: string
  orderIndex: number
}

export type TeacherNotebookPeriod = {
  id: string
  periodNo: number
  openedAt: string
  dueAt: string
  closedAt: string | null
  submissionCount: number
}

export type TeacherNotebookCheckSummary = {
  id: string
  classroomSubjectId: string
  title: string
  description: string
  kind: 'NOTEBOOK_CHECK'
  status: TeacherNotebookCheckStatus
  publishedAt: string | null
  closesAt: string | null
  createdAt: string
  referenceCount: number
  criteriaCount: number
  periodCount: number
}

export type TeacherNotebookCheckDetail = TeacherNotebookCheckSummary & {
  criteriaLockedAt: string | null
  referenceFiles: TeacherNotebookReferenceFile[]
  criteria: TeacherNotebookCriterion[]
  periods: TeacherNotebookPeriod[]
}

export type TeacherNotebookCriteriaSuggestionResult = {
  status: 'READY' | 'UNAVAILABLE' | 'FAILED'
  message?: string
  criteria: Array<{ content: string }>
}

export type TeacherCreateNotebookCheckInput = {
  title: string
  description: string
  closesAt: string | null
}

export type TeacherCreateAndPublishNotebookCheckInput = {
  title: string
  description: string
  dueAt: string
  criteria: Array<{ content: string }>
  files: File[]
}

export type TeacherUpdateNotebookCheckInput = Partial<TeacherCreateNotebookCheckInput>

export type TeacherNotebookSubmissionFile = {
  id: string
  mimeType: string
  byteSize: number
  sortOrder: number
}

export type TeacherNotebookCriterionResult = {
  id?: string
  criterionId: string
  status: TeacherCriterionStatus
  note: string | null
  criterion?: TeacherNotebookCriterion
}

export type TeacherNotebookAssessment = {
  id: string
  submissionId: string
  evaluatorId: string
  teacherComment: string | null
  reviewedAt: string
  results: TeacherNotebookCriterionResult[]
}

export type TeacherNotebookAiDraft = {
  ocrText: string | null
  suggestions: Array<{
    criterionId: string
    status: TeacherCriterionStatus
    note?: string
    evidence?: string
    confidence?: number
  }>
  generatedAt: string
}

export type TeacherNotebookSubmissionSummary = {
  id: string
  studentId: string
  studentName: string
  username: string
  submittedAt: string
  updatedAt: string
  status: TeacherNotebookSubmissionStatus
  processingStatus: TeacherNotebookProcessingStatus
  files: TeacherNotebookSubmissionFile[]
  assessment: TeacherNotebookAssessment | null
}

export type TeacherNotebookSubmissionReview = TeacherNotebookSubmissionSummary & {
  periodId: string
  periodNo: number
  criteria: TeacherNotebookCriterion[]
  aiDraft: TeacherNotebookAiDraft | null
}

export type TeacherNotebookAiAnalysis = {
  submissionId: string
  processingStatus: TeacherNotebookProcessingStatus
  status?: 'READY' | 'UNAVAILABLE' | 'FAILED'
  message?: string
  ocrText?: string
  suggestions?: TeacherNotebookAiDraft['suggestions']
}

export type TeacherFinalizeNotebookInput = {
  results: Array<{
    criterionId: string
    status: TeacherCriterionStatus
    note?: string | null
  }>
  teacherComment?: string | null
}

type RawRecord = Record<string, unknown>

function record(value: unknown): RawRecord {
  return value && typeof value === 'object' ? value as RawRecord : {}
}

function stringValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function nullableString(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function numberValue(value: unknown, fallback = 0): number {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function mapReferenceFile(value: unknown): TeacherNotebookReferenceFile {
  const raw = record(value)
  return {
    id: stringValue(raw.id),
    mimeType: stringValue(raw.mime_type ?? raw.mimeType),
    byteSize: numberValue(raw.byte_size ?? raw.byteSize),
    sortOrder: numberValue(raw.sort_order ?? raw.sortOrder),
  }
}

function mapCriterion(value: unknown): TeacherNotebookCriterion {
  const raw = record(value)
  return {
    id: stringValue(raw.id),
    content: stringValue(raw.content),
    orderIndex: numberValue(raw.order_index ?? raw.orderIndex),
  }
}

function mapPeriod(value: unknown): TeacherNotebookPeriod {
  const raw = record(value)
  const counts = record(raw._count)
  return {
    id: stringValue(raw.id),
    periodNo: numberValue(raw.period_no ?? raw.periodNo),
    openedAt: stringValue(raw.opened_at ?? raw.openedAt),
    dueAt: stringValue(raw.due_at ?? raw.dueAt),
    closedAt: nullableString(raw.closed_at ?? raw.closedAt),
    submissionCount: numberValue(raw.submission_count ?? raw.submissionCount ?? counts.submissions),
  }
}

function mapSummary(value: unknown): TeacherNotebookCheckSummary {
  const raw = record(value)
  const notebook = record(raw.notebookCheck)
  const counts = record(notebook._count)
  const periods = Array.isArray(notebook.periods) ? notebook.periods : []
  return {
    id: stringValue(raw.id),
    classroomSubjectId: stringValue(raw.classroom_subject_id ?? raw.classroomSubjectId),
    title: stringValue(raw.title),
    description: stringValue(raw.description),
    kind: 'NOTEBOOK_CHECK',
    status: stringValue(raw.status) as TeacherNotebookCheckStatus,
    publishedAt: nullableString(raw.published_at ?? raw.publishedAt),
    closesAt: nullableString(raw.closes_at ?? raw.closesAt),
    createdAt: stringValue(raw.created_at ?? raw.createdAt),
    referenceCount: numberValue(counts.referenceFiles ?? notebook.referenceFileCount),
    criteriaCount: numberValue(counts.criteria ?? notebook.criteriaCount),
    periodCount: numberValue(counts.periods ?? notebook.periodCount ?? periods.length),
  }
}

function mapDetail(value: unknown): TeacherNotebookCheckDetail {
  const raw = record(value)
  const notebook = record(raw.notebookCheck)
  const summary = mapSummary(value)
  return {
    ...summary,
    criteriaLockedAt: nullableString(notebook.criteria_locked_at ?? notebook.criteriaLockedAt),
    referenceFiles: Array.isArray(notebook.referenceFiles) ? notebook.referenceFiles.map(mapReferenceFile) : [],
    criteria: Array.isArray(notebook.criteria) ? notebook.criteria.map(mapCriterion) : [],
    periods: Array.isArray(notebook.periods) ? notebook.periods.map(mapPeriod) : [],
  }
}

function mapCriterionResult(value: unknown): TeacherNotebookCriterionResult {
  const raw = record(value)
  return {
    id: nullableString(raw.id) ?? undefined,
    criterionId: stringValue(raw.criterion_id ?? raw.criterionId ?? record(raw.criterion).id),
    status: stringValue(raw.status) as TeacherCriterionStatus,
    note: nullableString(raw.note),
    criterion: raw.criterion ? mapCriterion(raw.criterion) : undefined,
  }
}

function mapAssessment(value: unknown): TeacherNotebookAssessment | null {
  if (!value) return null
  const raw = record(value)
  return {
    id: stringValue(raw.id),
    submissionId: stringValue(raw.submission_id ?? raw.submissionId),
    evaluatorId: stringValue(raw.evaluator_id ?? raw.evaluatorId),
    teacherComment: nullableString(raw.teacher_comment ?? raw.teacherComment),
    reviewedAt: stringValue(raw.reviewed_at ?? raw.reviewedAt),
    results: Array.isArray(raw.results) ? raw.results.map(mapCriterionResult) : [],
  }
}

function mapSubmissionFile(value: unknown): TeacherNotebookSubmissionFile {
  const file = mapReferenceFile(value)
  return file
}

function mapAiDraft(value: unknown): TeacherNotebookAiDraft | null {
  if (!value) return null
  const raw = record(value)
  const suggestions = Array.isArray(raw.suggestions) ? raw.suggestions : []
  return {
    ocrText: nullableString(raw.ocr_text ?? raw.ocrText),
    suggestions: suggestions.map((item) => {
      const suggestion = record(item)
      return {
        criterionId: stringValue(suggestion.criterionId ?? suggestion.criterion_id),
        status: stringValue(suggestion.status) as TeacherCriterionStatus,
        note: nullableString(suggestion.note) ?? undefined,
        evidence: nullableString(suggestion.evidence) ?? undefined,
        confidence: typeof suggestion.confidence === 'number' ? suggestion.confidence : undefined,
      }
    }),
    generatedAt: stringValue(raw.generated_at ?? raw.generatedAt),
  }
}

function mapSubmission(value: unknown, criteria: TeacherNotebookCriterion[] = []): TeacherNotebookSubmissionReview {
  const raw = record(value)
  const student = record(raw.student)
  const period = record(raw.period)
  return {
    id: stringValue(raw.id),
    studentId: stringValue(raw.student_id ?? raw.studentId),
    studentName: stringValue(student.full_name ?? student.fullName ?? raw.studentName, 'Học sinh'),
    username: stringValue(student.username ?? raw.username),
    submittedAt: stringValue(raw.submitted_at ?? raw.submittedAt),
    updatedAt: stringValue(raw.updated_at ?? raw.updatedAt),
    status: stringValue(raw.status) as TeacherNotebookSubmissionStatus,
    processingStatus: stringValue(raw.processing_status ?? raw.processingStatus, 'PENDING') as TeacherNotebookProcessingStatus,
    files: Array.isArray(raw.files) ? raw.files.map(mapSubmissionFile) : [],
    assessment: mapAssessment(raw.assessment),
    periodId: stringValue(raw.period_id ?? raw.periodId ?? period.id),
    periodNo: numberValue(raw.period_no ?? raw.periodNo ?? period.period_no),
    criteria,
    aiDraft: mapAiDraft(raw.aiDraft),
  }
}

export const teacherNotebookChecksApi = {
  async list(classroomSubjectId: string): Promise<TeacherNotebookCheckSummary[]> {
    const response = await apiRequest<unknown[]>(`/teacher/classroom-subjects/${encodeURIComponent(classroomSubjectId)}/notebook-checks`)
    return response.data.map(mapSummary)
  },

  async getDetail(activityId: string): Promise<TeacherNotebookCheckDetail> {
    const response = await apiRequest<unknown>(`/teacher/notebook-checks/${encodeURIComponent(activityId)}`)
    return mapDetail(response.data)
  },

  async create(classroomSubjectId: string, input: TeacherCreateNotebookCheckInput): Promise<TeacherNotebookCheckDetail> {
    const response = await apiRequest<unknown>(`/teacher/classroom-subjects/${encodeURIComponent(classroomSubjectId)}/notebook-checks`, {
      method: 'POST',
      body: input,
    })
    return mapDetail(response.data)
  },

  async createAndPublish(classroomSubjectId: string, input: TeacherCreateAndPublishNotebookCheckInput): Promise<TeacherNotebookCheckDetail> {
    const body = new FormData()
    body.append('title', input.title)
    body.append('description', input.description)
    body.append('dueAt', input.dueAt)
    body.append('criteria', JSON.stringify(input.criteria))
    for (const file of input.files) body.append('files', file)

    const response = await apiRequest<unknown>(`/teacher/classroom-subjects/${encodeURIComponent(classroomSubjectId)}/notebook-checks/publish`, {
      method: 'POST',
      body,
    })
    return mapDetail(response.data)
  },

  async suggestCriteria(classroomSubjectId: string, files: File[]): Promise<TeacherNotebookCriteriaSuggestionResult> {
    const body = new FormData()
    for (const file of files) body.append('files', file)
    const response = await apiRequest<TeacherNotebookCriteriaSuggestionResult>(`/teacher/classroom-subjects/${encodeURIComponent(classroomSubjectId)}/notebook-checks/criteria-suggestions`, {
      method: 'POST',
      body,
    })
    return response.data
  },

  async update(activityId: string, input: TeacherUpdateNotebookCheckInput): Promise<TeacherNotebookCheckDetail> {
    const response = await apiRequest<unknown>(`/teacher/notebook-checks/${encodeURIComponent(activityId)}`, {
      method: 'PATCH',
      body: input,
    })
    return mapDetail(response.data)
  },

  async remove(activityId: string): Promise<{ success: boolean }> {
    const response = await apiRequest<{ success: boolean }>(`/teacher/notebook-checks/${encodeURIComponent(activityId)}`, {
      method: 'DELETE',
    })
    return response.data
  },

  async uploadReferenceFile(activityId: string, file: File): Promise<TeacherNotebookReferenceFile> {
    const body = new FormData()
    body.append('file', file)
    const response = await apiRequest<unknown>(`/teacher/notebook-checks/${encodeURIComponent(activityId)}/reference-files`, {
      method: 'POST',
      body,
    })
    return mapReferenceFile(response.data)
  },

  async deleteReferenceFile(activityId: string, fileId: string): Promise<{ success: boolean }> {
    const response = await apiRequest<{ success: boolean }>(`/teacher/notebook-checks/${encodeURIComponent(activityId)}/reference-files/${encodeURIComponent(fileId)}`, {
      method: 'DELETE',
    })
    return response.data
  },

  async downloadReferenceFile(activityId: string, fileId: string) {
    return apiDownload(`/teacher/notebook-checks/${encodeURIComponent(activityId)}/reference-files/${encodeURIComponent(fileId)}/download`)
  },

  async putCriteria(activityId: string, criteria: Array<{ content: string }>): Promise<TeacherNotebookCheckDetail> {
    const response = await apiRequest<unknown>(`/teacher/notebook-checks/${encodeURIComponent(activityId)}/criteria`, {
      method: 'PUT',
      body: { criteria },
    })
    return mapDetail(response.data)
  },

  async publish(activityId: string): Promise<TeacherNotebookCheckDetail> {
    const response = await apiRequest<unknown>(`/teacher/notebook-checks/${encodeURIComponent(activityId)}/publish`, {
      method: 'POST',
    })
    return mapDetail(response.data)
  },

  async createPeriod(activityId: string, dueAt: string): Promise<TeacherNotebookPeriod> {
    const response = await apiRequest<unknown>(`/teacher/notebook-checks/${encodeURIComponent(activityId)}/periods`, {
      method: 'POST',
      body: { dueAt },
    })
    return mapPeriod(response.data)
  },

  async closePeriod(periodId: string): Promise<TeacherNotebookPeriod> {
    const response = await apiRequest<unknown>(`/teacher/notebook-periods/${encodeURIComponent(periodId)}/close`, {
      method: 'POST',
    })
    return mapPeriod(response.data)
  },

  async listPeriods(activityId: string): Promise<TeacherNotebookPeriod[]> {
    const response = await apiRequest<unknown[]>(`/teacher/notebook-checks/${encodeURIComponent(activityId)}/periods`)
    return response.data.map(mapPeriod)
  },

  async listSubmissions(periodId: string): Promise<TeacherNotebookSubmissionSummary[]> {
    const response = await apiRequest<unknown[]>(`/teacher/notebook-periods/${encodeURIComponent(periodId)}/submissions`)
    return response.data.map((item) => mapSubmission(item))
  },

  async getReview(submissionId: string): Promise<TeacherNotebookSubmissionReview> {
    const response = await apiRequest<unknown>(`/teacher/notebook-submissions/${encodeURIComponent(submissionId)}/review`)
    const raw = record(response.data)
    const periodActivity = record(record(raw.period).activity)
    const criteria = Array.isArray(periodActivity.criteria) ? periodActivity.criteria.map(mapCriterion) : []
    return mapSubmission(response.data, criteria)
  },

  async downloadSubmissionFile(submissionId: string, fileId: string) {
    return apiDownload(`/teacher/notebook-submissions/${encodeURIComponent(submissionId)}/files/${encodeURIComponent(fileId)}/download`)
  },

  async analyze(submissionId: string): Promise<TeacherNotebookAiAnalysis> {
    const response = await apiRequest<unknown>(`/teacher/notebook-submissions/${encodeURIComponent(submissionId)}/analysis`, {
      method: 'POST',
    })
    return mapAnalysis(response.data, submissionId)
  },

  async retryAnalysis(submissionId: string): Promise<TeacherNotebookAiAnalysis> {
    const response = await apiRequest<unknown>(`/teacher/notebook-submissions/${encodeURIComponent(submissionId)}/analysis/retry`, {
      method: 'POST',
    })
    return mapAnalysis(response.data, submissionId)
  },

  async getAnalysis(submissionId: string): Promise<TeacherNotebookAiAnalysis> {
    const response = await apiRequest<unknown>(`/teacher/notebook-submissions/${encodeURIComponent(submissionId)}/analysis`)
    return mapAnalysis(response.data, submissionId)
  },

  async finalize(submissionId: string, input: TeacherFinalizeNotebookInput): Promise<TeacherNotebookAssessment> {
    const response = await apiRequest<unknown>(`/teacher/notebook-submissions/${encodeURIComponent(submissionId)}/finalize`, {
      method: 'POST',
      body: input,
    })
    return mapAssessment(response.data) as TeacherNotebookAssessment
  },

  async getAssessment(submissionId: string): Promise<TeacherNotebookAssessment> {
    const response = await apiRequest<unknown>(`/teacher/notebook-submissions/${encodeURIComponent(submissionId)}/assessment`)
    return mapAssessment(response.data) as TeacherNotebookAssessment
  },
}

function mapAnalysis(value: unknown, submissionId: string): TeacherNotebookAiAnalysis {
  const raw = record(value)
  const draft = record(raw.aiDraft)
  const suggestions = mapAiDraft(raw.aiDraft)?.suggestions
  return {
    submissionId: stringValue(raw.submissionId, submissionId),
    processingStatus: stringValue(raw.processingStatus ?? raw.processing_status, 'PENDING') as TeacherNotebookProcessingStatus,
    status: stringValue(raw.status) as TeacherNotebookAiAnalysis['status'],
    message: nullableString(raw.message) ?? undefined,
    ocrText: nullableString(raw.ocrText ?? raw.ocr_text ?? draft.ocr_text) ?? undefined,
    suggestions: suggestions ?? (Array.isArray(raw.suggestions) ? mapAiDraft({ suggestions: raw.suggestions, generatedAt: '' })?.suggestions : undefined),
  }
}

export const notebookCheckMappers = {
  mapSummary,
  mapDetail,
  mapPeriod,
  mapSubmission,
  mapAnalysis,
}
