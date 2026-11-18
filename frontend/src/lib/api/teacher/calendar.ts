import { apiRequest } from '../client'

export type TeacherCalendarEvent = {
  id: string
  classroomSubjectId: string
  classroomId: string
  classroomName: string
  academicYear: string
  gradeLevel: number
  subjectId: string
  subjectName: string
  title: string
  details: string
  eventType: string
  startsAt: string
  publishedAt: string | null
  createdAt: string
  updatedAt: string
  lessonId: string | null
  lessonTitle: string | null
  activityId: string | null
  activityTitle: string | null
  activityKind: string | null
}

export type TeacherCalendarEventInput = {
  expectedUpdatedAt?: string
  title: string
  details: string
  eventType: string
  startsAt: string
  lessonId?: string | null
  activityId?: string | null
}

function calendarQuery(input: { from: string; to: string; classroomId?: string }): string {
  const query = new URLSearchParams({ from: input.from, to: input.to })
  if (input.classroomId) query.set('classroomId', input.classroomId)
  return `?${query.toString()}`
}

export const teacherCalendarApi = {
  async list(input: { from: string; to: string; classroomId?: string }): Promise<TeacherCalendarEvent[]> {
    const response = await apiRequest<TeacherCalendarEvent[]>(`/teacher/calendar-events${calendarQuery(input)}`)
    return response.data
  },

  async getDetail(eventId: string): Promise<TeacherCalendarEvent> {
    const response = await apiRequest<TeacherCalendarEvent>(`/teacher/calendar-events/${encodeURIComponent(eventId)}`)
    return response.data
  },

  async create(classroomSubjectId: string, input: TeacherCalendarEventInput): Promise<TeacherCalendarEvent> {
    const response = await apiRequest<TeacherCalendarEvent>(`/teacher/classroom-subjects/${encodeURIComponent(classroomSubjectId)}/calendar-events`, {
      method: 'POST',
      body: input,
    })
    return response.data
  },

  async update(eventId: string, input: Partial<TeacherCalendarEventInput>): Promise<TeacherCalendarEvent> {
    const response = await apiRequest<TeacherCalendarEvent>(`/teacher/calendar-events/${encodeURIComponent(eventId)}`, {
      method: 'PATCH',
      body: input,
    })
    return response.data
  },

  async publish(eventId: string): Promise<TeacherCalendarEvent> {
    const response = await apiRequest<TeacherCalendarEvent>(`/teacher/calendar-events/${encodeURIComponent(eventId)}/publish`, {
      method: 'POST',
    })
    return response.data
  },

  async remove(eventId: string): Promise<{ success: boolean }> {
    const response = await apiRequest<{ success: boolean }>(`/teacher/calendar-events/${encodeURIComponent(eventId)}`, {
      method: 'DELETE',
    })
    return response.data
  },
}
