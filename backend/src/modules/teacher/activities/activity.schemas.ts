import { z } from 'zod';

export const createActivitySchema = z.object({
  title: z.string().trim().min(1, 'Tiêu đề hoạt động không được để trống').max(250, 'Tiêu đề không quá 250 ký tự'),
  description: z.string().trim().default(''),
  exerciseType: z.enum(['QUIZ', 'WRITTEN'], { message: 'Loại bài tập phải là QUIZ hoặc WRITTEN' }),
  difficulty: z.enum(['BASIC', 'INTERMEDIATE', 'ADVANCED']).default('BASIC'),
  lessonIds: z.array(z.string().uuid({ message: 'ID bài học phải là UUID hợp lệ' })).default([]),
  closesAt: z.string().datetime({ message: 'Hạn nộp bài phải là định dạng ISO 8601 hợp lệ' }).nullable().optional(),
});

export const updateActivitySchema = z.object({
  title: z.string().trim().min(1, 'Tiêu đề hoạt động không được để trống').max(250, 'Tiêu đề không quá 250 ký tự').optional(),
  description: z.string().trim().optional(),
  difficulty: z.enum(['BASIC', 'INTERMEDIATE', 'ADVANCED']).optional(),
  lessonIds: z.array(z.string().uuid({ message: 'ID bài học phải là UUID hợp lệ' })).optional(),
  closesAt: z.string().datetime({ message: 'Hạn nộp bài phải là định dạng ISO 8601 hợp lệ' }).nullable().optional(),
});

export const questionCitationInputSchema = z.object({
  segmentId: z.string().uuid({ message: 'ID phân đoạn trích dẫn phải là UUID hợp lệ' }),
  excerpt: z.string().trim().optional(),
});

export const questionInputSchema = z.object({
  prompt: z.string().trim().min(1, 'Nội dung câu hỏi không được để trống'),
  options: z.array(z.string().trim().min(1, 'Lựa chọn không được rỗng')).min(2, 'Câu hỏi trắc nghiệm phải có ít nhất 2 lựa chọn').optional(),
  answerKey: z.string().trim().optional(),
  markingCriteria: z.string().trim().optional(),
  explanation: z.string().trim().default(''),
  maxPoints: z.number().positive('Điểm tối đa phải lớn hơn 0').default(1.0),
  lessonId: z.string().uuid({ message: 'ID bài học liên kết phải là UUID hợp lệ' }),
  citations: z.array(questionCitationInputSchema).default([]),
});

export const putQuestionsSchema = z.object({
  questions: z
    .array(questionInputSchema)
    .min(1, 'Danh sách phải có ít nhất 1 câu hỏi')
    .max(20, 'Danh sách không được vượt quá 20 câu hỏi'),
});

export const aiDraftSchema = z.object({
  lessonIds: z.array(z.string().uuid({ message: 'ID bài học phải là UUID hợp lệ' })).min(1, 'Cần chọn ít nhất 1 bài học làm nguồn sinh câu hỏi'),
  questionCount: z.number().int().min(1).max(20).default(5),
  difficulty: z.enum(['BASIC', 'INTERMEDIATE', 'ADVANCED']).default('BASIC'),
});

export const reopenActivitySchema = z.object({
  closesAt: z.string().datetime({ message: 'Hạn nộp bài mới phải là định dạng ISO 8601 hợp lệ' }).nullable().optional(),
});

export const activityIdParamSchema = z.object({
  activityId: z.string().uuid({ message: 'ID hoạt động phải là UUID hợp lệ' }),
});

export const classroomSubjectIdParamSchema = z.object({
  classroomSubjectId: z.string().uuid({ message: 'ID môn học của lớp phải là UUID hợp lệ' }),
});

export type CreateActivityInput = z.infer<typeof createActivitySchema>;
export type UpdateActivityInput = z.infer<typeof updateActivitySchema>;
export type QuestionInput = z.infer<typeof questionInputSchema>;
export type PutQuestionsInput = z.infer<typeof putQuestionsSchema>;
export type AiDraftInput = z.infer<typeof aiDraftSchema>;
export type ReopenActivityInput = z.infer<typeof reopenActivitySchema>;
