import { z } from 'zod';

export const listUnassignedStudentsQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
});

export const enrollStudentSchema = z.object({
  studentId: z.string().uuid('ID học sinh không hợp lệ'),
});

export const transferStudentSchema = z.object({
  targetClassroomId: z.string().uuid('ID lớp học chuyển đến không hợp lệ'),
});

export const studentIdParamSchema = z.object({
  id: z.string().uuid('ID học sinh không hợp lệ'),
});

export const classroomIdParamSchema = z.object({
  id: z.string().uuid('ID lớp học không hợp lệ'),
});

export const classroomStudentParamsSchema = z.object({
  id: z.string().uuid('ID lớp học không hợp lệ'),
  studentId: z.string().uuid('ID học sinh không hợp lệ'),
});

export type EnrollStudentInput = z.infer<typeof enrollStudentSchema>;
export type TransferStudentInput = z.infer<typeof transferStudentSchema>;
