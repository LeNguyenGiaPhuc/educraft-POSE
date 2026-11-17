import { apiRequest } from './client'

export type AdminDashboardSummary = {
  accounts: {
    activeTeachers: number
    activeStudents: number
    inactiveAccounts: number
  }
  classrooms: {
    active: number
    archived: number
  }
  subjects: {
    active: number
    inactive: number
  }
  unassignedActiveSubjects: number
}

export const adminDashboardApi = {
  async getSummary(): Promise<AdminDashboardSummary> {
    const response = await apiRequest<AdminDashboardSummary>('/admin/dashboard')
    return response.data
  },
}
