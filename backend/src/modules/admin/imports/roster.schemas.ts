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

export const rosterRowSchema = z.object({
  line: z.number().int().min(2),
  fullName: validatedString(normalizeFullName, validateFullName),
  username: validatedString(normalizeUsername, validateUsername),
  contact: validatedString(normalizeContact, validateContact),
});

const rosterRowsSchema = z
  .array(rosterRowSchema)
  .min(1, 'Danh sách học sinh không được rỗng')
  .max(500, 'Danh sách học sinh tối đa 500 dòng');

export const commitRosterSchema = z.object({
  validationToken: z.string().min(1, 'Thiếu mã xác thực import'),
  defaultPassword: passwordSchema,
  rows: rosterRowsSchema,
});

export const commitNewClassroomRosterSchema = z.object({
  validationToken: z.string().min(1, 'Thiếu mã xác thực import'),
  name: z.string().trim().min(1).max(100),
  gradeLevel: z.number().int().min(1).max(12),
  academicYear: z.string().trim().min(1).max(20),
  initialStudentPassword: passwordSchema,
  rows: rosterRowsSchema,
});

export const classroomIdParamSchema = z.object({
  id: z.string().uuid('ID lớp học không hợp lệ'),
});
