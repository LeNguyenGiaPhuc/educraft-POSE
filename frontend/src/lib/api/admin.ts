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

type AccountInput = {
  role: AdminAccount['role']
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

  async listClassrooms(params: { status?: 'ACTIVE' | 'ARCHIVED'; page?: number; limit?: number } = {}): Promise<{ items: AdminClassroomSummary[]; meta: ApiPageMeta }> {
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
}
