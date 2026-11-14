import { z } from 'zod';

export const materialIdParamSchema = z.object({
  id: z.string().uuid('ID học liệu không hợp lệ'),
});

export const lessonIdParamSchema = z.object({
  id: z.string().uuid('ID bài học không hợp lệ'),
});
