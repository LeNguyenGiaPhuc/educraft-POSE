export type CalendarEvent = {
  id: string
  publicationId: string
  classroomId: string
  classroomSubjectId: string
  subject: string
  title: string
  startsAt: string
  type: string
  details: string
  publishedAt: string
  historical: boolean
}

export const calendarEvents: CalendarEvent[] = [
  { id: 'event-1', publicationId: 'event-1-publication-1', classroomId: 'class-11a2-2026', classroomSubjectId: 'history-11a2', subject: '11A2 · Lịch sử', title: 'Ôn tập Cách mạng tháng Tám', startsAt: '2026-11-18T08:00:00+07:00', type: 'Ôn tập', details: 'Đọc lại bài và chuẩn bị câu hỏi thảo luận.', publishedAt: '2026-11-09T09:00:00+07:00', historical: false },
  { id: 'event-2', publicationId: 'event-2-publication-1', classroomId: 'class-11a2-2026', classroomSubjectId: 'history-11a2', subject: '11A2 · Lịch sử', title: 'Kiểm tra ngắn chương 2', startsAt: '2026-11-25T08:00:00+07:00', type: 'Kiểm tra', details: 'Nội dung từ các bài học đã công bố trong chương 2.', publishedAt: '2026-11-10T10:00:00+07:00', historical: false },
  { id: 'event-math-11a2', publicationId: 'event-math-11a2-publication-1', classroomId: 'class-11a2-2026', classroomSubjectId: '11a2-math', subject: '11A2 · Toán', title: 'Ôn tập phương trình lượng giác', startsAt: '2026-11-18T14:00:00+07:00', type: 'Ôn tập', details: 'Chuẩn bị các câu hỏi về phương trình lượng giác cơ bản.', publishedAt: '2026-11-10T11:00:00+07:00', historical: false },
  { id: 'event-history-10a1', publicationId: 'event-history-10a1-publication-1', classroomId: 'class-10a1-2025', classroomSubjectId: '10a1-history', subject: '10A1 · Lịch sử', title: 'Ôn tập cuối năm lớp 10', startsAt: '2026-05-15T08:00:00+07:00', type: 'Ôn tập', details: 'Lịch đã học của năm học trước, chỉ xem lại.', publishedAt: '2026-05-08T09:00:00+07:00', historical: true },
]

// Each publication creates exactly one retained notification for this student.
export const calendarNotifications = Array.from(new Map(calendarEvents.map((event) => [event.publicationId, {
  id: `notification-phuc-${event.publicationId}`,
  studentId: 'phuc',
  eventId: event.id,
  publicationId: event.publicationId,
  initiallyRead: event.historical,
}])).values())
