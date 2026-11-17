import { apiRequest } from '../client'

export type TeacherDashboardSummary = {
  classrooms: {
    active: number
    archived: number
  }
  openActivities: number
  pendingNotebookReviews: number
  upcomingEvents: number
}

export const teacherDashboardApi = {
  async getSummary(): Promise<TeacherDashboardSummary> {
    const response = await apiRequest<TeacherDashboardSummary>('/teacher/dashboard')
    return response.data
  },
}
