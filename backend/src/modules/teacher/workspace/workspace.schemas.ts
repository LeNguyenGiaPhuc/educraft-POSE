import { z } from 'zod';

export const classroomIdParamSchema = z.object({
  id: z.string().uuid('ID lớp học không hợp lệ'),
});

export const classroomSubjectIdParamSchema = z.object({
  id: z.string().uuid('ID môn học của lớp không hợp lệ'),
});
