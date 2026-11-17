import { describe, expect, it } from 'vitest';
import { publishExerciseActivitySchema } from '../../../../../../backend/src/modules/teacher/activities/activity.schemas.js';

const lessonId = '00000000-0000-4000-8000-000000000001';
const segmentId = '00000000-0000-4000-8000-000000000002';

function baseQuestion() {
  return {
    prompt: 'Câu hỏi',
    explanation: '',
    maxPoints: 1,
    lessonId,
    citations: [{ segmentId, excerpt: 'Nguồn' }],
  };
}

function baseActivity(exerciseType: 'QUIZ' | 'WRITTEN') {
  return {
    title: 'Hoạt động',
    description: '',
    exerciseType,
    difficulty: 'BASIC' as const,
    lessonIds: [lessonId],
    closesAt: null,
  };
}

describe('publishExerciseActivitySchema', () => {
  it('requires exactly four options for Quiz', () => {
    const result = publishExerciseActivitySchema.safeParse({
      ...baseActivity('QUIZ'),
      questions: [{ ...baseQuestion(), options: ['A', 'B'], answerKey: 'A' }],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message.includes('đúng 4'))).toBe(true);
    }
  });

  it('accepts a Quiz with four options and a matching answer', () => {
    const result = publishExerciseActivitySchema.safeParse({
      ...baseActivity('QUIZ'),
      questions: [{ ...baseQuestion(), options: ['A', 'B', 'C', 'D'], answerKey: 'B' }],
    });

    expect(result.success).toBe(true);
  });

  it('requires both reference answer and marking criteria for Written', () => {
    const result = publishExerciseActivitySchema.safeParse({
      ...baseActivity('WRITTEN'),
      questions: [{ ...baseQuestion(), maxPoints: 5 }],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.message)).toEqual(expect.arrayContaining([
        'Tự luận cần đáp án tham khảo.',
        'Tự luận cần tiêu chí chấm.',
      ]));
    }
  });
});
