import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calendarService } from '../../../../../../backend/src/modules/teacher/calendar/calendar.service.js';
import { calendarRepository } from '../../../../../../backend/src/modules/teacher/calendar/calendar.repository.js';
import { BadRequestError, NotFoundError } from '../../../../../../backend/src/shared/errors/app-error.js';
import * as teacherSubjectPolicy from '../../../../../../backend/src/modules/teacher/access/teacher-subject.policy.js';

describe('CalendarService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('listCalendarEvents', () => {
    it('returns formatted events for valid date range', async () => {
      vi.spyOn(calendarRepository, 'findEvents').mockResolvedValue([
        {
          id: 'evt-1',
          classroom_subject_id: 'cs-1',
          created_by_id: 'tea-1',
          title: 'Tiết 1: Ôn tập',
          details: 'Ôn tập chương 1',
          event_type: 'LESSON',
          starts_at: new Date('2026-11-20T08:00:00Z'),
          published_at: null,
          created_at: new Date('2026-11-13T00:00:00Z'),
          lesson_id: 'les-1',
          activity_id: null,
          classroomSubject: {
            classroom: { id: 'cls-1', name: '10A1', academic_year: '2026-2027', grade_level: 10 },
            subject: { id: 'sub-1', name: 'Lịch sử' },
          },
          lesson: { id: 'les-1', title: 'Bài 1' },
          activity: null,
        } as any,
      ]);

      const res = await calendarService.listCalendarEvents('tea-1', {
        from: '2026-11-01T00:00:00Z',
        to: '2026-11-30T00:00:00Z',
      });

      expect(res).toHaveLength(1);
      expect(res[0].id).toBe('evt-1');
      expect(res[0].classroomName).toBe('10A1');
      expect(res[0].lessonTitle).toBe('Bài 1');
      expect(res[0].startsAt).toBe('2026-11-20T08:00:00.000Z');
    });

    it('rejects if from > to', async () => {
      await expect(
        calendarService.listCalendarEvents('tea-1', {
          from: '2026-12-01T00:00:00Z',
          to: '2026-11-01T00:00:00Z',
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('rejects if date range exceeds 366 days', async () => {
      await expect(
        calendarService.listCalendarEvents('tea-1', {
          from: '2025-01-01T00:00:00Z',
          to: '2026-03-01T00:00:00Z',
        })
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe('getCalendarEventDetail', () => {
    it('returns event detail if found and authorized', async () => {
      vi.spyOn(calendarRepository, 'findEventById').mockResolvedValue({
        id: 'evt-1',
        classroom_subject_id: 'cs-1',
        title: 'Event detail',
        details: 'Notes',
        event_type: 'LESSON',
        starts_at: new Date('2026-11-20T08:00:00Z'),
        published_at: null,
        created_at: new Date('2026-11-13T00:00:00Z'),
        lesson_id: null,
        activity_id: null,
        classroomSubject: {
          classroom: { id: 'cls-1', name: '10A1', academic_year: '2026-2027', grade_level: 10 },
          subject: { id: 'sub-1', name: 'Lịch sử' },
        },
      } as any);

      vi.spyOn(teacherSubjectPolicy, 'requireAssignedSubject').mockResolvedValue({} as any);

      const res = await calendarService.getCalendarEventDetail('tea-1', 'evt-1');
      expect(res.id).toBe('evt-1');
      expect(res.title).toBe('Event detail');
    });

    it('throws NotFoundError if event does not exist', async () => {
      vi.spyOn(calendarRepository, 'findEventById').mockResolvedValue(null);

      await expect(
        calendarService.getCalendarEventDetail('tea-1', 'evt-missing')
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('createCalendarEvent', () => {
    it('delegates creation to repository', async () => {
      vi.spyOn(calendarRepository, 'createEventAtomically').mockResolvedValue({
        id: 'evt-new',
        classroom_subject_id: 'cs-1',
        title: 'New Event',
        details: 'Details',
        event_type: 'LESSON',
        starts_at: new Date('2026-11-20T08:00:00Z'),
        published_at: null,
        created_at: new Date('2026-11-13T00:00:00Z'),
        lesson_id: null,
        activity_id: null,
        classroomSubject: {
          classroom: { id: 'cls-1', name: '10A1' },
          subject: { id: 'sub-1', name: 'Toán' },
        },
      } as any);

      const res = await calendarService.createCalendarEvent('tea-1', 'cs-1', {
        title: 'New Event',
        details: 'Details',
        eventType: 'LESSON',
        startsAt: '2026-11-20T08:00:00.000Z',
      });

      expect(res.id).toBe('evt-new');
      expect(calendarRepository.createEventAtomically).toHaveBeenCalledWith('tea-1', 'cs-1', {
        title: 'New Event',
        details: 'Details',
        eventType: 'LESSON',
        startsAt: '2026-11-20T08:00:00.000Z',
      });
    });
  });

  describe('publishCalendarEvent', () => {
    it('delegates publishing to repository', async () => {
      vi.spyOn(calendarRepository, 'publishEventAtomically').mockResolvedValue({
        id: 'evt-1',
        title: 'Published Event',
        published_at: new Date('2026-11-13T10:00:00Z'),
        starts_at: new Date('2026-11-20T08:00:00Z'),
        created_at: new Date('2026-11-13T00:00:00Z'),
        classroomSubject: { classroom: { id: 'cls-1' }, subject: { id: 'sub-1' } },
      } as any);

      const res = await calendarService.publishCalendarEvent('tea-1', 'evt-1');
      expect(res.publishedAt).toBe('2026-11-13T10:00:00.000Z');
      expect(calendarRepository.publishEventAtomically).toHaveBeenCalledWith('tea-1', 'evt-1');
    });
  });

  describe('deleteCalendarEvent', () => {
    it('delegates deletion to repository', async () => {
      vi.spyOn(calendarRepository, 'deleteEventAtomically').mockResolvedValue({ success: true });

      const res = await calendarService.deleteCalendarEvent('tea-1', 'evt-1');
      expect(res.success).toBe(true);
      expect(calendarRepository.deleteEventAtomically).toHaveBeenCalledWith('tea-1', 'evt-1');
    });
  });
});
