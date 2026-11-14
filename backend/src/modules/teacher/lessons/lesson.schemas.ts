import { z } from 'zod';

export const createLessonSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Tên bài học không được để trống')
    .max(250, 'Tên bài học tối đa 250 ký tự'),
});

export const updateLessonSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Tên bài học không được để trống')
    .max(250, 'Tên bài học tối đa 250 ký tự')
    .optional(),
});

export const lessonIdParamSchema = z.object({
  id: z.string().uuid('ID bài học không hợp lệ'),
});

export const classroomSubjectIdParamSchema = z.object({
  id: z.string().uuid('ID môn học của lớp không hợp lệ'),
});

export type CreateLessonInput = z.infer<typeof createLessonSchema>;
export type UpdateLessonInput = z.infer<typeof updateLessonSchema>;
