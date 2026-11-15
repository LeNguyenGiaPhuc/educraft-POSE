import { z } from 'zod';

export const createAccountSchema = z.discriminatedUnion('role', [
  z.object({
    role: z.literal('STUDENT'),
    username: z.string().trim().min(3, 'Tên đăng nhập phải có ít nhất 3 ký tự').max(100),
    fullName: z.string().trim().min(1, 'Họ và tên không được để trống').max(200),
    contact: z.string().trim().optional().nullable(),
    password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự').max(128),
  }),
  z.object({
    role: z.literal('TEACHER'),
    username: z.string().trim().min(3, 'Tên đăng nhập phải có ít nhất 3 ký tự').max(100),
    fullName: z.string().trim().min(1, 'Họ và tên không được để trống').max(200),
    contact: z.string().trim().optional().nullable(),
    password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự').max(128),
    qualification: z.string().trim().min(1, 'Giáo viên cần có bằng cấp'),
    specializedSubjectId: z.string().uuid('Môn học chuyên môn không hợp lệ'),
  }),
]);

export const updateAccountSchema = z.object({
  fullName: z.string().trim().min(1, 'Họ và tên không được để trống').max(200).optional(),
  contact: z.string().trim().optional().nullable(),
  qualification: z.string().trim().min(1, 'Bằng cấp không được để trống').optional(),
  specializedSubjectId: z.string().uuid('Môn học chuyên môn không hợp lệ').optional(),
});

export const accountIdSchema = z.string().uuid('ID tài khoản không hợp lệ');

export const listAccountsQuerySchema = z.object({
  role: z.enum(['ADMIN', 'TEACHER', 'STUDENT']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().max(200).optional(),
});

const accountStatuses = ['ACTIVE', 'INACTIVE'] as const;

export const updateAccountStatusSchema = z.object({
  status: z.enum(accountStatuses),
});

export const resetAccountPasswordSchema = z.object({
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự').max(128),
});

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
export type UpdateAccountStatusInput = z.infer<typeof updateAccountStatusSchema>;
export type ResetAccountPasswordInput = z.infer<typeof resetAccountPasswordSchema>;
