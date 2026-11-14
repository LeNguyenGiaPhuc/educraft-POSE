import { z } from 'zod';

export const subjectIdSchema = z.string().uuid('ID môn học không hợp lệ');

export const createSubjectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Tên môn học không được để trống')
    .max(150, 'Tên môn học không được vượt quá 150 ký tự'),
});

export const updateSubjectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Tên môn học không được để trống')
    .max(150, 'Tên môn học không được vượt quá 150 ký tự'),
});

export const updateSubjectStatusSchema = z.object({
  isActive: z.boolean(),
});

export type CreateSubjectInput = z.infer<typeof createSubjectSchema>;
export type UpdateSubjectInput = z.infer<typeof updateSubjectSchema>;
export type UpdateSubjectStatusInput = z.infer<typeof updateSubjectStatusSchema>;
