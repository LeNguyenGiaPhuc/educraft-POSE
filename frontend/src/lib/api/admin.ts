import { apiRequest } from './client'

export type AdminSubject = {
  id: string
  name: string
  isActive: boolean
  teacherCount: number
  classroomCount: number
}

export type AdminAccount = {
  id: string
  username: string
  fullName: string
  role: 'ADMIN' | 'TEACHER' | 'STUDENT'
  status: 'ACTIVE' | 'INACTIVE'
  contact: string | null
  classroomId: string | null
  classroomName: string | null
  qualification?: string | null
  specializedSubjectId?: string | null
  specializedSubjectName?: string | null
  mustChangePassword: boolean
  passwordChangedAt: string | null
  createdAt: string
}

export type AdminClassroomSummary = {
  id: string
  name: string
  gradeLevel: number
  academicYear: string
  status: 'ACTIVE' | 'ARCHIVED'
  studentCount: number
  subjectCount: number
  assignedTeacherCount: number
  createdAt: string
  updatedAt: string
}

export type AdminClassroomStudent = {
  id: string
  enrollmentId: string
  fullName: string
  username: string
  contact: string | null
  joinedAt: string
  leftAt: string | null
  mustChangePassword: boolean
  passwordChangedAt: string | null
}

export type AdminClassroomSubject = {
  id: string
  subjectId: string
  subjectName: string
  isSubjectActive: boolean
  teacher: {
    id: string
    fullName: string
    username: string
    contact: string | null
    qualification: string
  } | null
  lessonCount: number
}

export type AdminClassroomDetail = {
  id: string
  name: string
  gradeLevel: number
  academicYear: string
  status: 'ACTIVE' | 'ARCHIVED'
  createdAt: string
  updatedAt: string
  students: AdminClassroomStudent[]
  studentHistory: AdminClassroomStudent[]
  subjects: AdminClassroomSubject[]
}

export type AdminUnassignedStudent = {
  id: string
  username: string
  fullName: string
  contact: string | null
  createdAt: string
}

export type AdminEligibleTeacher = {
  id: string
  username: string
  fullName: string
  contact: string | null
  qualification: string
}

export type AdminRosterRow = {
  line: number
  fullName: string
  username: string
  contact: string
}

export type AdminRosterIssue = {
  line: number
  message: string
}

export type AdminRosterPreview = {
  rows: AdminRosterRow[]
  issues: AdminRosterIssue[]
  isValid: boolean
  validationToken: string | null
  totalRows: number
  validRows: number
}

export type ApiPageMeta = {
  page: number
  limit: number
  totalItems: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

type AccountListParams = {
  role?: AdminAccount['role']
  status?: AdminAccount['status']
  page?: number
  limit?: number
  search?: string
}

type ClassroomListParams = {
  status?: AdminClassroomSummary['status']
  page?: number
  limit?: number
  search?: string
  gradeLevel?: number
  academicYear?: string
  sortBy?: 'name' | 'grade_level' | 'academic_year' | 'created_at'
  sortOrder?: 'asc' | 'desc'
}

type AccountInput = {
  role: Exclude<AdminAccount['role'], 'ADMIN'>
  username: string
  fullName: string
  contact?: string | null
  password: string
  qualification?: string
  specializedSubjectId?: string
}

export const adminApi = {
  async listSubjects(): Promise<AdminSubject[]> {
    const response = await apiRequest<AdminSubject[]>('/admin/subjects')
    return response.data
  },

  async createSubject(name: string): Promise<AdminSubject> {
    const response = await apiRequest<AdminSubject>('/admin/subjects', {
      method: 'POST',
      body: { name },
    })
    return response.data
  },

  async updateSubjectStatus(id: string, isActive: boolean): Promise<AdminSubject> {
    const response = await apiRequest<AdminSubject>(`/admin/subjects/${id}/status`, {
      method: 'PATCH',
      body: { isActive },
    })
    return response.data
  },

  async listAccounts(params: AccountListParams = {}): Promise<{ items: AdminAccount[]; meta: ApiPageMeta }> {
    const query = new URLSearchParams()
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '') query.set(key, String(value))
    }

    const response = await apiRequest<AdminAccount[]>(`/admin/accounts${query.size ? `?${query}` : ''}`)
    return {
      items: response.data,
      meta: response.meta as ApiPageMeta,
    }
  },

  async createAccount(input: AccountInput): Promise<AdminAccount> {
    const response = await apiRequest<AdminAccount>('/admin/accounts', {
      method: 'POST',
      body: input,
    })
    return response.data
  },

  async updateAccount(id: string, input: Partial<Omit<AccountInput, 'role' | 'password' | 'username'>>): Promise<AdminAccount> {
    const response = await apiRequest<AdminAccount>(`/admin/accounts/${id}`, {
      method: 'PATCH',
      body: input,
    })
    return response.data
  },

  async updateAccountStatus(id: string, status: AdminAccount['status']): Promise<AdminAccount> {
    const response = await apiRequest<AdminAccount>(`/admin/accounts/${id}/status`, {
      method: 'PATCH',
      body: { status },
    })
    return response.data
  },

  async resetAccountPassword(id: string, password: string): Promise<{ success: boolean; message: string }> {
    const response = await apiRequest<{ success: boolean; message: string }>(`/admin/accounts/${id}/password`, {
      method: 'PATCH',
      body: { password },
    })
    return response.data
  },

  async listClassrooms(params: ClassroomListParams = {}): Promise<{ items: AdminClassroomSummary[]; meta: ApiPageMeta }> {
    const query = new URLSearchParams()
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) query.set(key, String(value))
    }

    const response = await apiRequest<AdminClassroomSummary[]>(`/admin/classrooms${query.size ? `?${query}` : ''}`)
    return {
      items: response.data,
      meta: response.meta as ApiPageMeta,
    }
  },

  async getClassroom(id: string): Promise<AdminClassroomDetail> {
    const response = await apiRequest<AdminClassroomDetail>(`/admin/classrooms/${id}`)
    return response.data
  },

  async createClassroom(input: { name: string; gradeLevel: number; academicYear: string }): Promise<AdminClassroomSummary> {
    const response = await apiRequest<AdminClassroomSummary>('/admin/classrooms', {
      method: 'POST',
      body: input,
    })
    return response.data
  },

  async updateClassroom(id: string, input: Partial<Pick<AdminClassroomSummary, 'name' | 'gradeLevel' | 'academicYear'>>): Promise<AdminClassroomSummary> {
    const response = await apiRequest<AdminClassroomSummary>(`/admin/classrooms/${id}`, {
      method: 'PATCH',
      body: input,
    })
    return response.data
  },

  async archiveClassroom(id: string): Promise<AdminClassroomSummary> {
    const response = await apiRequest<AdminClassroomSummary>(`/admin/classrooms/${id}/archive`, {
      method: 'PATCH',
    })
    return response.data
  },

  async listUnassignedStudents(params: { page?: number; limit?: number; search?: string } = {}): Promise<{ items: AdminUnassignedStudent[]; meta: ApiPageMeta }> {
    const query = new URLSearchParams()
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '') query.set(key, String(value))
    }

    const response = await apiRequest<AdminUnassignedStudent[]>(`/admin/enrollments/unassigned-students${query.size ? `?${query}` : ''}`)
    return {
      items: response.data,
      meta: response.meta as ApiPageMeta,
    }
  },

  async enrollStudent(classroomId: string, studentId: string): Promise<void> {
    await apiRequest(`/admin/classrooms/${classroomId}/students`, {
      method: 'POST',
      body: { studentId },
    })
  },

  async transferStudent(studentId: string, targetClassroomId: string): Promise<void> {
    await apiRequest(`/admin/enrollments/students/${studentId}/transfer`, {
      method: 'POST',
      body: { targetClassroomId },
    })
  },

  async removeStudent(classroomId: string, studentId: string): Promise<void> {
    await apiRequest(`/admin/enrollments/classrooms/${classroomId}/students/${studentId}`, {
      method: 'DELETE',
    })
  },

  async listEligibleTeachers(classroomId: string, subjectId: string): Promise<AdminEligibleTeacher[]> {
    const response = await apiRequest<AdminEligibleTeacher[]>(`/admin/classrooms/${classroomId}/subjects/${subjectId}/eligible-teachers`)
    return response.data
  },

  async assignTeacher(classroomId: string, subjectId: string, teacherId: string | null): Promise<void> {
    await apiRequest(`/admin/classrooms/${classroomId}/subjects/${subjectId}/assign`, {
      method: 'PATCH',
      body: { teacherId },
    })
  },

  async previewRoster(classroomId: string, file: File): Promise<AdminRosterPreview> {
    const body = new FormData()
    body.append('file', file)
    const response = await apiRequest<AdminRosterPreview>(`/admin/classrooms/${classroomId}/roster/preview`, {
      method: 'POST',
      body,
    })
    return response.data
  },

  async commitRoster(classroomId: string, input: { validationToken: string; defaultPassword: string; rows: AdminRosterRow[] }): Promise<{ importedCount: number }> {
    const response = await apiRequest<{ importedCount: number }>(`/admin/classrooms/${classroomId}/roster/commit`, {
      method: 'POST',
      body: input,
    })
    return response.data
  },
}
