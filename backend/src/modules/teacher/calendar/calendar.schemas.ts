import { z } from 'zod';

export const calendarQuerySchema = z.object({
  from: z.string().datetime({ message: 'Thời điểm bắt đầu (from) phải là định dạng ISO 8601 hợp lệ' }),
  to: z.string().datetime({ message: 'Thời điểm kết thúc (to) phải là định dạng ISO 8601 hợp lệ' }),
  classroomId: z.string().uuid({ message: 'ID lớp học phải là UUID hợp lệ' }).optional(),
});

export const createCalendarEventSchema = z
  .object({
    title: z.string().trim().min(1, 'Tiêu đề sự kiện không được để trống').max(250, 'Tiêu đề không quá 250 ký tự'),
    details: z.string().trim().default(''),
    eventType: z.string().trim().min(1, 'Loại sự kiện không được để trống').max(80, 'Loại sự kiện không quá 80 ký tự').default('LESSON'),
    startsAt: z.string().datetime({ message: 'Thời điểm bắt đầu phải là định dạng ISO 8601 hợp lệ' }),
    lessonId: z.string().uuid({ message: 'ID bài học phải là UUID hợp lệ' }).nullable().optional(),
    activityId: z.string().uuid({ message: 'ID hoạt động phải là UUID hợp lệ' }).nullable().optional(),
  })
  .refine(
    (data) => !(data.lessonId && data.activityId),
    {
      message: 'Sự kiện chỉ có thể liên kết với một bài học hoặc một hoạt động, không thể liên kết cả hai',
      path: ['activityId'],
    }
  );

export const updateCalendarEventSchema = z
  .object({
    title: z.string().trim().min(1, 'Tiêu đề sự kiện không được để trống').max(250, 'Tiêu đề không quá 250 ký tự').optional(),
    details: z.string().trim().optional(),
    eventType: z.string().trim().min(1).max(80).optional(),
    startsAt: z.string().datetime({ message: 'Thời điểm bắt đầu phải là định dạng ISO 8601 hợp lệ' }).optional(),
    lessonId: z.string().uuid({ message: 'ID bài học phải là UUID hợp lệ' }).nullable().optional(),
    activityId: z.string().uuid({ message: 'ID hoạt động phải là UUID hợp lệ' }).nullable().optional(),
  })
  .refine(
    (data) => !(data.lessonId && data.activityId),
    {
      message: 'Sự kiện chỉ có thể liên kết với một bài học hoặc một hoạt động, không thể liên kết cả hai',
      path: ['activityId'],
    }
  );

export const eventIdParamSchema = z.object({
  eventId: z.string().uuid({ message: 'ID sự kiện lịch phải là UUID hợp lệ' }),
});

export const classroomSubjectIdParamSchema = z.object({
  classroomSubjectId: z.string().uuid({ message: 'ID môn học của lớp phải là UUID hợp lệ' }),
});

export type CalendarQueryParams = z.infer<typeof calendarQuerySchema>;
export type CreateCalendarEventInput = z.infer<typeof createCalendarEventSchema>;
export type UpdateCalendarEventInput = z.infer<typeof updateCalendarEventSchema>;
