import { z } from 'zod';

export const createNotebookCheckSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Tiêu đề hoạt động không được để trống')
    .max(250, 'Tiêu đề không quá 250 ký tự'),
  description: z.string().trim().default(''),
  closesAt: z
    .string()
    .datetime({ message: 'Hạn nộp bài phải là định dạng ISO 8601 hợp lệ' })
    .nullable()
    .optional(),
});

export const createAndPublishNotebookCheckSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'TiÃªu Ä‘á» hoáº¡t Ä‘á»™ng khÃ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng')
    .max(250, 'TiÃªu Ä‘á» khÃ´ng quÃ¡ 250 kÃ½ tá»±'),
  description: z.string().trim().default(''),
  dueAt: z
    .string()
    .datetime({ message: 'Háº¡n ná»™p bÃ i pháº£i lÃ  Ä‘á»‹nh dáº¡ng ISO 8601 há»£p lá»‡' }),
  criteria: z.string().min(1, 'Cáº§n truyá»n danh sÃ¡ch tiÃªu chÃ­'),
});

export const updateNotebookCheckSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Tiêu đề hoạt động không được để trống')
    .max(250, 'Tiêu đề không quá 250 ký tự')
    .optional(),
  description: z.string().trim().optional(),
  closesAt: z
    .string()
    .datetime({ message: 'Hạn nộp bài phải là định dạng ISO 8601 hợp lệ' })
    .nullable()
    .optional(),
});

export const criterionItemSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, 'Nội dung tiêu chí không được để trống')
    .max(500, 'Nội dung tiêu chí không quá 500 ký tự'),
});

export const putCriteriaSchema = z.object({
  criteria: z
    .array(criterionItemSchema)
    .min(1, 'Hoạt động phải có ít nhất 1 tiêu chí')
    .max(20, 'Hoạt động không được vượt quá 20 tiêu chí'),
});

export const createPeriodSchema = z.object({
  dueAt: z
    .string()
    .datetime({ message: 'Thời hạn nộp (dueAt) phải là định dạng ISO 8601 hợp lệ' }),
});

export const finalizeCriterionResultInputSchema = z.object({
  criterionId: z.string().uuid({ message: 'ID tiêu chí phải là UUID hợp lệ' }),
  status: z.enum(['RECORDED', 'NEEDS_SUPPLEMENTATION', 'UNDETERMINED'], {
    message: 'Trạng thái tiêu chí phải là RECORDED, NEEDS_SUPPLEMENTATION hoặc UNDETERMINED',
  }),
  note: z.string().trim().nullable().optional(),
});

export const finalizeSubmissionSchema = z.object({
  results: z
    .array(finalizeCriterionResultInputSchema)
    .min(1, 'Bản đánh giá phải có kết quả cho các tiêu chí'),
  teacherComment: z.string().trim().nullable().optional(),
});

// Route parameter schemas
export const classroomSubjectIdParamSchema = z.object({
  classroomSubjectId: z.string().uuid({ message: 'ID môn học của lớp phải là UUID hợp lệ' }),
});

export const activityIdParamSchema = z.object({
  activityId: z.string().uuid({ message: 'ID hoạt động phải là UUID hợp lệ' }),
});

export const periodIdParamSchema = z.object({
  periodId: z.string().uuid({ message: 'ID kỳ nộp phải là UUID hợp lệ' }),
});

export const submissionIdParamSchema = z.object({
  submissionId: z.string().uuid({ message: 'ID bài nộp phải là UUID hợp lệ' }),
});

export const fileIdParamSchema = z.object({
  activityId: z.string().uuid({ message: 'ID hoạt động phải là UUID hợp lệ' }),
  fileId: z.string().uuid({ message: 'ID file phải là UUID hợp lệ' }),
});

export const submissionFileIdParamSchema = z.object({
  submissionId: z.string().uuid({ message: 'ID bài nộp phải là UUID hợp lệ' }),
  fileId: z.string().uuid({ message: 'ID file phải là UUID hợp lệ' }),
});

export type CreateNotebookCheckInput = z.infer<typeof createNotebookCheckSchema>;
export type CreateAndPublishNotebookCheckInput = z.infer<typeof createAndPublishNotebookCheckSchema>;
export type UpdateNotebookCheckInput = z.infer<typeof updateNotebookCheckSchema>;
export type PutCriteriaInput = z.infer<typeof putCriteriaSchema>;
export type CreatePeriodInput = z.infer<typeof createPeriodSchema>;
export type FinalizeSubmissionInput = z.infer<typeof finalizeSubmissionSchema>;
