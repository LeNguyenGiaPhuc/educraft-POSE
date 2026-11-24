import { z } from 'zod';

const uuidSchema = z.string().uuid('ID phải là UUID hợp lệ');

function isValidCalendarDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function calendarDateSchema(fieldName: string) {
  return z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, `${fieldName} phải có định dạng YYYY-MM-DD`)
    .refine(isValidCalendarDate, `${fieldName} không phải là ngày hợp lệ`);
}

export const classroomSubjectIdParamSchema = z.object({
  classroomSubjectId: uuidSchema,
});

export const studentProgressParamSchema = z.object({
  classroomSubjectId: uuidSchema,
  studentId: uuidSchema,
});

export const exerciseSubmissionIdParamSchema = z.object({
  submissionId: uuidSchema,
});

export const notebookSubmissionIdParamSchema = z.object({
  submissionId: uuidSchema,
});

const submissionKindSchema = z.enum(['EXERCISE', 'NOTEBOOK_CHECK']);
const submissionStatusSchema = z.enum([
  'MISSING',
  'PENDING',
  'PROCESSING',
  'GRADED',
  'FAILED',
  'CURRENT',
  'LOCKED',
  'FINALIZED',
]);

export const submissionQuerySchema = z.object({
  activityId: uuidSchema.optional(),
  periodId: uuidSchema.optional(),
  studentId: uuidSchema.optional(),
  kind: submissionKindSchema.optional(),
  status: submissionStatusSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
}).superRefine((value, context) => {
  if (value.periodId && (value.kind !== 'NOTEBOOK_CHECK' || !value.activityId)) {
    context.addIssue({
      code: 'custom',
      message: 'periodId chỉ dùng khi lọc một hoạt động kiểm tra vở',
      path: ['periodId'],
    });
  }

  if (value.kind === 'NOTEBOOK_CHECK' && value.activityId && !value.periodId) {
    context.addIssue({
      code: 'custom',
      message: 'Cần chọn đợt kiểm tra vở',
      path: ['periodId'],
    });
  }
});

export const statisticsQuerySchema = z.object({
  activityId: uuidSchema.optional(),
  periodId: uuidSchema.optional(),
}).superRefine((value, context) => {
  if (value.periodId && !value.activityId) {
    context.addIssue({
      code: 'custom',
      message: 'periodId chỉ dùng khi đã chọn một hoạt động kiểm tra vở',
      path: ['periodId'],
    });
  }
});

export const promptTopicsQuerySchema = z
  .object({
    studentId: uuidSchema.optional(),
    periodStart: calendarDateSchema('periodStart').optional(),
    periodEnd: calendarDateSchema('periodEnd').optional(),
  })
  .superRefine((value, context) => {
    if ((value.periodStart && !value.periodEnd) || (!value.periodStart && value.periodEnd)) {
      context.addIssue({
        code: 'custom',
        message: 'Cần truyền đồng thời periodStart và periodEnd',
        path: ['periodEnd'],
      });
    }

    if (value.periodStart && value.periodEnd && value.periodStart > value.periodEnd) {
      context.addIssue({
        code: 'custom',
        message: 'periodStart phải trước hoặc bằng periodEnd',
        path: ['periodStart'],
      });
    }
  });

export type SubmissionQuery = z.infer<typeof submissionQuerySchema>;
export type StatisticsQuery = z.infer<typeof statisticsQuerySchema>;
export type PromptTopicsQuery = z.infer<typeof promptTopicsQuerySchema>;
