import { BadRequestError, NotFoundError } from '../../../shared/errors/app-error.js';
import { requireAssignedSubject } from '../access/teacher-subject.policy.js';
import { calendarRepository } from './calendar.repository.js';
import type { CalendarQueryParams, CreateCalendarEventInput, UpdateCalendarEventInput } from './calendar.schemas.js';

function formatEventDto(e: any) {
  return {
    id: e.id,
    classroomSubjectId: e.classroom_subject_id,
    classroomId: e.classroomSubject?.classroom?.id ?? '',
    classroomName: e.classroomSubject?.classroom?.name ?? '',
    academicYear: e.classroomSubject?.classroom?.academic_year ?? '',
    gradeLevel: e.classroomSubject?.classroom?.grade_level ?? 0,
    subjectId: e.classroomSubject?.subject?.id ?? '',
    subjectName: e.classroomSubject?.subject?.name ?? '',
    title: e.title,
    details: e.details,
    eventType: e.event_type,
    startsAt: e.starts_at instanceof Date ? e.starts_at.toISOString() : e.starts_at,
    publishedAt: e.published_at instanceof Date ? e.published_at.toISOString() : e.published_at ? String(e.published_at) : null,
    createdAt: e.created_at instanceof Date ? e.created_at.toISOString() : e.created_at,
    updatedAt: e.updated_at instanceof Date ? e.updated_at.toISOString() : e.updated_at,
    lessonId: e.lesson_id ?? null,
    lessonTitle: e.lesson?.title ?? null,
    activityId: e.activity_id ?? null,
    activityTitle: e.activity?.title ?? null,
    activityKind: e.activity?.kind ?? null,
  };
}

export const calendarService = {
  async listCalendarEvents(actorId: string, query: CalendarQueryParams) {
    const fromDate = new Date(query.from);
    const toDate = new Date(query.to);

    if (fromDate.getTime() > toDate.getTime()) {
      throw new BadRequestError('Thời điểm bắt đầu (from) phải trước hoặc bằng thời điểm kết thúc (to)');
    }

    const diffDays = (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays > 366) {
      throw new BadRequestError('Khoảng thời gian tra cứu lịch tối đa là 366 ngày');
    }

    const events = await calendarRepository.findEvents({
      teacherId: actorId,
      from: fromDate,
      to: toDate,
      classroomId: query.classroomId,
    });

    return events.map(formatEventDto);
  },

  async getCalendarEventDetail(actorId: string, eventId: string) {
    const event = await calendarRepository.findEventById(eventId);
    if (!event) {
      throw new NotFoundError('Không tìm thấy sự kiện lịch');
    }

    // Verify teacher is currently assigned to this classroom subject (allow read if archived)
    await requireAssignedSubject(actorId, event.classroom_subject_id, { allowArchived: true });

    return formatEventDto(event);
  },

  async createCalendarEvent(
    actorId: string,
    classroomSubjectId: string,
    input: CreateCalendarEventInput
  ) {
    const created = await calendarRepository.createEventAtomically(
      actorId,
      classroomSubjectId,
      input
    );
    return formatEventDto(created);
  },

  async updateCalendarEvent(
    actorId: string,
    eventId: string,
    input: UpdateCalendarEventInput
  ) {
    const updated = await calendarRepository.updateEventAtomically(actorId, eventId, input);
    return formatEventDto(updated);
  },

  async publishCalendarEvent(actorId: string, eventId: string) {
    const published = await calendarRepository.publishEventAtomically(actorId, eventId);
    return formatEventDto(published);
  },

  async deleteCalendarEvent(actorId: string, eventId: string) {
    await calendarRepository.deleteEventAtomically(actorId, eventId);
    return { success: true, message: 'Đã xóa sự kiện lịch thành công' };
  },
};
