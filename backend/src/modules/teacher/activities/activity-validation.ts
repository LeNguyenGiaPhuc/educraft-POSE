import type { ExerciseType } from '@prisma/client';
import { BadRequestError } from '../../../shared/errors/app-error.js';
import type { QuestionInput } from './activity.schemas.js';

export type EligibleActivitySegment = {
  id: string;
  lessonId: string;
  content: string;
};

function questionLabel(index: number): string {
  return `Câu hỏi ${index + 1}`;
}

/**
 * Validate the fields that depend on the exercise type.
 * Zod checks the basic shape; this helper checks the business rules shared by
 * draft editing and publishing.
 */
export function validateExerciseQuestionShape(
  exerciseType: ExerciseType,
  questions: QuestionInput[]
): void {
  if (questions.length === 0) {
    throw new BadRequestError('Hoạt động phải có ít nhất 1 câu hỏi');
  }

  questions.forEach((question, index) => {
    const label = questionLabel(index);
    if (!question.prompt.trim()) {
      throw new BadRequestError(`${label}: Nội dung câu hỏi không được để trống`);
    }

    if (exerciseType === 'QUIZ') {
      const options = (question.options ?? []).map((option) => option.trim());
      if (options.length < 2) {
        throw new BadRequestError(`${label}: Bài trắc nghiệm (QUIZ) phải có ít nhất 2 lựa chọn trả lời`);
      }
      if (options.length !== 4) {
        throw new BadRequestError(`${label}: Quiz phải có đúng 4 lựa chọn.`);
      }

      const uniqueOptions = new Set(options);
      if (uniqueOptions.size !== options.length) {
        throw new BadRequestError(`${label}: Các lựa chọn của Quiz không được trùng nhau.`);
      }

      const answerKey = question.answerKey?.trim();
      if (!answerKey) {
        throw new BadRequestError(`${label}: Bài trắc nghiệm (QUIZ) phải có đáp án đúng (answerKey)`);
      }
      if (!options.includes(answerKey)) {
        throw new BadRequestError(`${label}: Đáp án đúng "${answerKey}" phải nằm trong danh sách các lựa chọn trả lời`);
      }
      return;
    }

    if (!question.answerKey?.trim()) {
      throw new BadRequestError(`${label}: Tự luận cần đáp án tham khảo.`);
    }
    if (!question.markingCriteria?.trim()) {
      throw new BadRequestError(`${label}: Bài tự luận (WRITTEN) phải có tiêu chí hoặc hướng dẫn chấm bài (markingCriteria)`);
    }
  });
}

/**
 * Validate question lesson links and citation excerpts against the segments
 * that are eligible for the activity.
 */
export function validateQuestionSources(
  questions: QuestionInput[],
  selectedLessonIds: Set<string>,
  eligibleSegments: EligibleActivitySegment[]
): void {
  const segmentsById = new Map(eligibleSegments.map((segment) => [segment.id, segment]));

  questions.forEach((question, index) => {
    const label = questionLabel(index);
    if (!selectedLessonIds.has(question.lessonId)) {
      throw new BadRequestError(`${label}: Bài học nguồn không thuộc danh sách bài học của hoạt động.`);
    }

    for (const citation of question.citations ?? []) {
      const segment = segmentsById.get(citation.segmentId);
      const excerpt = citation.excerpt?.trim();
      const validCitation = Boolean(
        segment &&
        segment.lessonId === question.lessonId &&
        excerpt &&
        segment.content.includes(excerpt)
      );

      if (!validCitation) {
        throw new BadRequestError(`${label} có citation không thuộc nguồn hợp lệ.`);
      }
    }
  });
}

export function requireQuestionCitations(questions: QuestionInput[]): void {
  questions.forEach((question, index) => {
    if (question.citations.length === 0) {
      throw new BadRequestError(`Câu hỏi ${index + 1} phải có ít nhất một citation.`);
    }
  });
}
