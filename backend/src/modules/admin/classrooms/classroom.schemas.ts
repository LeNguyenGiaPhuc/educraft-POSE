import { z } from 'zod';

const classroomStatuses = ['ACTIVE', 'ARCHIVED'] as const;
const classroomSortFields = ['name', 'grade_level', 'academic_year', 'created_at'] as const;
const sortOrders = ['asc', 'desc'] as const;

export const listClassroomsQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
  status: z.enum(classroomStatuses).optional(),
  gradeLevel: z.string().optional(),
  academicYear: z.string().optional(),
  sortBy: z.enum(classroomSortFields).optional(),
  sortOrder: z.enum(sortOrders).optional(),
});

export const createClassroomSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Tên lớp học không được để trống')
    .max(100, 'Tên lớp học tối đa 100 ký tự'),
  gradeLevel: z
    .number({ message: 'Khối lớp phải là số từ 1 đến 12' })
    .int('Khối lớp phải là số nguyên')
    .min(1, 'Khối lớp tối thiểu là 1')
    .max(12, 'Khối lớp tối đa là 12'),
  academicYear: z
    .string()
    .trim()
    .min(1, 'Năm học không được để trống')
    .max(20, 'Năm học tối đa 20 ký tự'),
});

export const updateClassroomSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Tên lớp học không được để trống')
      .max(100, 'Tên lớp học tối đa 100 ký tự')
      .optional(),
    gradeLevel: z
      .number({ message: 'Khối lớp phải là số từ 1 đến 12' })
      .int('Khối lớp phải là số nguyên')
      .min(1, 'Khối lớp tối thiểu là 1')
      .max(12, 'Khối lớp tối đa là 12')
      .optional(),
    academicYear: z
      .string()
      .trim()
      .min(1, 'Năm học không được để trống')
      .max(20, 'Năm học tối đa 20 ký tự')
      .optional(),
  })
  .refine(
    (data) => data.name !== undefined || data.gradeLevel !== undefined || data.academicYear !== undefined,
    {
      message: 'Cần cung cấp ít nhất một trường để cập nhật',
    }
  );

export const classroomIdParamSchema = z.object({
  id: z.string().uuid('ID lớp học không hợp lệ'),
});

export type ListClassroomsQuery = z.infer<typeof listClassroomsQuerySchema>;
export type CreateClassroomInput = z.infer<typeof createClassroomSchema>;
export type UpdateClassroomInput = z.infer<typeof updateClassroomSchema>;
