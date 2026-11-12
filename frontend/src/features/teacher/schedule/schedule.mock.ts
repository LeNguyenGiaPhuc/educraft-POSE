import { getTeacherSubjectContext } from '../fixtures'

export type CalendarEvent = {
  id: string
  classroomSubjectId: string
  title: string
  startsAt: string
  type: string
  details: string
  combinedNotification?: boolean
  target?: { kind: 'lesson' | 'activity'; id: string }
}
export const calendarEvents: CalendarEvent[] = [
  { id: 'event-1', classroomSubjectId: 'history-11a2', title: 'Chuẩn bị Cách mạng tháng Tám', startsAt: '2026-11-12T07:00', type: 'Chuẩn bị bài', details: 'Đọc học liệu đã công bố và ghi lại các mốc thời gian chính.', target: { kind: 'lesson', id: 'lesson-cmt8-11a2' } },
  { id: 'event-2', classroomSubjectId: 'history-11a1', title: 'Ôn tập lịch sử', startsAt: '2026-11-12T09:00', type: 'Ôn tập', details: 'Mang vở ghi và chuẩn bị câu hỏi.', target: { kind: 'lesson', id: 'lesson-cmt8-11a1' } },
  { id: 'event-3', classroomSubjectId: 'history-11a2', title: 'Xem lại quiz đã đóng', startsAt: '2026-11-18T08:00', type: 'Ôn tập', details: 'Xem giải thích và nguồn của từng câu trả lời.', target: { kind: 'activity', id: 'quiz-11a2' } },
].filter(item => getTeacherSubjectContext(item.classroomSubjectId)) as CalendarEvent[]
export function monthCells(month: string) {
  const [year, number] = month.split('-').map(Number)
  const offset = (new Date(year, number - 1, 1).getDay() + 6) % 7
  const days = new Date(year, number, 0).getDate()
  return Array.from({ length: Math.ceil((offset + days) / 7) * 7 }, (_, index) => index >= offset && index < offset + days ? `${month}-${String(index - offset + 1).padStart(2, '0')}` : '')
}

// In-memory store for session calendar events
export let sessionCalendarPreviews: CalendarEvent[] = []
export type CalendarChanges = { updated: Record<string, CalendarEvent>; deleted: string[] }
let sessionCalendarChanges: CalendarChanges = { updated: {}, deleted: [] }
export function getSessionCalendarChanges(): CalendarChanges { return sessionCalendarChanges }
export function setSessionCalendarChanges(value: CalendarChanges): void { sessionCalendarChanges = value }

export function setSessionCalendarPreviews(events: CalendarEvent[]): void {
  sessionCalendarPreviews = events
}

export function getSessionCalendarPreviews(): CalendarEvent[] {
  return sessionCalendarPreviews
}

export function removeCalendarEventByActivityId(activityId: string): void {
  sessionCalendarPreviews = sessionCalendarPreviews.filter(
    (event) => !(event.target?.kind === 'activity' && event.target?.id === activityId)
  )
  sessionCalendarChanges = {
    ...sessionCalendarChanges,
    deleted: [...sessionCalendarChanges.deleted, ...calendarEvents.filter(event => event.target?.kind === 'activity' && event.target.id === activityId).map(event => event.id)],
  }
}
