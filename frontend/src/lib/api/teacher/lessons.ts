import { apiDownload, apiRequest, type ApiDownload } from '../client'

export type TeacherLessonStatus = 'DRAFT' | 'PUBLISHED'
export type TeacherMaterialStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
export type TeacherMaterialProcessingStatus = 'PENDING' | 'PROCESSING' | 'PROCESSED' | 'FAILED'

export type TeacherMaterialSummary = {
  id: string
  name: string
  version: number
  processing: TeacherMaterialProcessingStatus
  sourcePosition: string
}

export type TeacherLessonSummary = {
  id: string
  classroomSubjectId: string
  title: string
  status: TeacherLessonStatus
  publishedAt: string | null
  createdAt: string
  updatedAt: string
  materials: TeacherMaterialSummary[]
}

export type TeacherLessonMutation = Omit<TeacherLessonSummary, 'materials'>

export type TeacherMaterialVersion = {
  id: string
  versionNo: number
  mimeType: string
  byteSize: string
  processingStatus: TeacherMaterialProcessingStatus
  uploadedAt: string
  segments: TeacherMaterialSegment[]
}

export type TeacherMaterialSegment = {
  id: string
  positionType: string
  positionIndex: number
  positionLabel: string
  ordinal: number
  content: string
}

export type TeacherLessonMaterial = {
  id: string
  fileName: string
  status: TeacherMaterialStatus
  createdAt: string
  versions: TeacherMaterialVersion[]
}

export type TeacherMaterialUploadResult = {
  id: string
  lessonId: string
  fileName: string
  status: TeacherMaterialStatus
  latestVersion: {
    id: string
    versionNo: number
    byteSize: string
    mimeType: string
    processingStatus: TeacherMaterialProcessingStatus
    uploadedAt: string
  }
}

export type TeacherMaterialVersionUploadResult = {
  id: string
  materialId: string
  versionNo: number
  byteSize: string
  mimeType: string
  processingStatus: TeacherMaterialProcessingStatus
  uploadedAt: string
}

export type TeacherLessonDetail = {
  id: string
  classroomSubjectId: string
  title: string
  status: TeacherLessonStatus
  publishedAt: string | null
  createdAt: string
  updatedAt: string
  classroom: { id: string; name: string; status: 'ACTIVE' | 'ARCHIVED' }
  subject: { id: string; name: string }
  createdBy: { id: string; full_name: string; username: string }
  materials: TeacherLessonMaterial[]
}

export const teacherLessonsApi = {
  async list(classroomSubjectId: string): Promise<TeacherLessonSummary[]> {
    const response = await apiRequest<TeacherLessonSummary[]>(`/teacher/classroom-subjects/${encodeURIComponent(classroomSubjectId)}/lessons`)
    return response.data
  },

  async create(classroomSubjectId: string, title: string): Promise<TeacherLessonMutation> {
    const response = await apiRequest<TeacherLessonMutation>(`/teacher/classroom-subjects/${encodeURIComponent(classroomSubjectId)}/lessons`, {
      method: 'POST',
      body: { title },
    })
    return response.data
  },

  async getDetail(lessonId: string): Promise<TeacherLessonDetail> {
    const response = await apiRequest<TeacherLessonDetail>(`/teacher/lessons/${encodeURIComponent(lessonId)}`)
    return response.data
  },

  async update(lessonId: string, input: { title?: string }): Promise<TeacherLessonMutation> {
    const response = await apiRequest<TeacherLessonMutation>(`/teacher/lessons/${encodeURIComponent(lessonId)}`, {
      method: 'PATCH',
      body: input,
    })
    return response.data
  },

  async publish(lessonId: string): Promise<TeacherLessonMutation> {
    const response = await apiRequest<TeacherLessonMutation>(`/teacher/lessons/${encodeURIComponent(lessonId)}/publish`, {
      method: 'POST',
    })
    return response.data
  },

  async uploadMaterial(lessonId: string, file: File): Promise<TeacherMaterialUploadResult> {
    const body = new FormData()
    body.append('file', file)
    const response = await apiRequest<TeacherMaterialUploadResult>(`/teacher/lessons/${encodeURIComponent(lessonId)}/materials`, {
      method: 'POST',
      body,
    })
    return response.data
  },

  async uploadMaterialVersion(materialId: string, file: File): Promise<TeacherMaterialVersionUploadResult> {
    const body = new FormData()
    body.append('file', file)
    const response = await apiRequest<TeacherMaterialVersionUploadResult>(`/teacher/materials/${encodeURIComponent(materialId)}/versions`, {
      method: 'POST',
      body,
    })
    return response.data
  },

  async archiveMaterial(materialId: string): Promise<{ id: string; status: TeacherMaterialStatus }> {
    const response = await apiRequest<{ id: string; status: TeacherMaterialStatus }>(`/teacher/materials/${encodeURIComponent(materialId)}`, {
      method: 'DELETE',
    })
    return response.data
  },

  async downloadMaterial(materialId: string): Promise<ApiDownload> {
    return apiDownload(`/teacher/materials/${encodeURIComponent(materialId)}/download`)
  },
}
