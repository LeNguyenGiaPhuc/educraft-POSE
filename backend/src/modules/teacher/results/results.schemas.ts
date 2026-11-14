import { z } from 'zod';

const uuidSchema = z.string().uuid('ID phải là UUID hợp lệ');

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
  studentId: uuidSchema.optional(),
  kind: submissionKindSchema.optional(),
  status: submissionStatusSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const statisticsQuerySchema = z.object({
  activityId: uuidSchema.optional(),
});

export const promptTopicsQuerySchema = z
  .object({
    studentId: uuidSchema.optional(),
    periodStart: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'periodStart phải có định dạng YYYY-MM-DD')
      .optional(),
    periodEnd: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'periodEnd phải có định dạng YYYY-MM-DD')
      .optional(),
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
