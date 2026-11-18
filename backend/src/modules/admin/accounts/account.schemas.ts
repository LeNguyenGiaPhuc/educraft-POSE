import { z } from 'zod';
import {
  ACCOUNT_PASSWORD_MAX_LENGTH,
  ACCOUNT_PASSWORD_MIN_LENGTH,
  getIdentityErrorMessage,
  normalizeContact,
  normalizeFullName,
  normalizeUsername,
  validateContact,
  validateFullName,
  validatePassword,
  validateUsername,
} from '../../../shared/account-identity.js';

function validatedString(
  normalize: (value: string) => string,
  validate: (value: string) => ReturnType<typeof validateFullName>
) {
  return z.string().transform(normalize).superRefine((value, context) => {
    const errorCode = validate(value);
    if (errorCode) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: getIdentityErrorMessage(errorCode),
      });
    }
  });
}

const fullNameSchema = validatedString(normalizeFullName, validateFullName);
const usernameSchema = validatedString(normalizeUsername, validateUsername);
const contactSchema = validatedString(normalizeContact, validateContact);
const passwordSchema = z
  .string()
  .min(ACCOUNT_PASSWORD_MIN_LENGTH, 'Mật khẩu phải có từ 8 đến 128 ký tự.')
  .max(ACCOUNT_PASSWORD_MAX_LENGTH, 'Mật khẩu phải có từ 8 đến 128 ký tự.')
  .superRefine((value, context) => {
    const errorCode = validatePassword(value);
    if (errorCode) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: getIdentityErrorMessage(errorCode),
      });
    }
  });

export const createAccountSchema = z.discriminatedUnion('role', [
  z.object({
    role: z.literal('STUDENT'),
    username: usernameSchema,
    fullName: fullNameSchema,
    contact: contactSchema,
    password: passwordSchema,
  }),
  z.object({
    role: z.literal('TEACHER'),
    username: usernameSchema,
    fullName: fullNameSchema,
    contact: contactSchema,
    password: passwordSchema,
    qualification: z.string().trim().min(1, 'Giáo viên cần có bằng cấp'),
    specializedSubjectId: z.string().uuid('Môn học chuyên môn không hợp lệ'),
  }),
]);

export const updateAccountSchema = z.object({
  fullName: fullNameSchema.optional(),
  contact: contactSchema.optional().nullable(),
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
  password: passwordSchema,
});

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
export type UpdateAccountStatusInput = z.infer<typeof updateAccountStatusSchema>;
export type ResetAccountPasswordInput = z.infer<typeof resetAccountPasswordSchema>;
