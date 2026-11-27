import { apiRequest } from '../client'
import type {
  TeacherClassroomSubjectContext,
  TeacherClassroomSummary,
  TeacherSubjectStudent,
} from './types'

export function teacherWorkspacePath(classroomId: string, classroomSubjectId: string): string {
  return `/teacher/classes/${encodeURIComponent(classroomId)}/subjects/${encodeURIComponent(classroomSubjectId)}`
}

export const teacherWorkspaceApi = {
  async listClassrooms(): Promise<TeacherClassroomSummary[]> {
    const response = await apiRequest<TeacherClassroomSummary[]>('/teacher/classrooms')
    return response.data
  },

  async getClassroomSubject(classroomSubjectId: string): Promise<TeacherClassroomSubjectContext> {
    const response = await apiRequest<TeacherClassroomSubjectContext>(`/teacher/classroom-subjects/${classroomSubjectId}`)
    return response.data
  },

  async listClassroomSubjectStudents(classroomSubjectId: string): Promise<TeacherSubjectStudent[]> {
    const response = await apiRequest<TeacherSubjectStudent[]>(`/teacher/classroom-subjects/${classroomSubjectId}/students`)
    return response.data
  },
}
