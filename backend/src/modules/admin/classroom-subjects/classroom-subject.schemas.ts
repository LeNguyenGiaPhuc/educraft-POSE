import { z } from 'zod';

export const classroomSubjectParamsSchema = z.object({
  classroomId: z.string().uuid('ID lớp học không hợp lệ'),
  subjectId: z.string().uuid('ID môn học không hợp lệ'),
});

export const assignTeacherSchema = z.object({
  teacherId: z.string().uuid('ID giáo viên không hợp lệ').nullable(),
  expectedTeacherId: z.string().uuid('ID giáo viên hiện tại không hợp lệ').nullable().optional(),
});

export type AssignTeacherInput = z.infer<typeof assignTeacherSchema>;
