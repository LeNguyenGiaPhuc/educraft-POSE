import { prisma } from '../../../lib/prisma.js';
import { BadRequestError, NotFoundError } from '../../../shared/errors/app-error.js';
import { requireAssignedSubject } from '../access/teacher-subject.policy.js';
import {
  aiDraftProvider,
  type AiDraftResult,
} from './activity-ai-draft.provider.js';
import { activityRepository } from './activity.repository.js';
import type {
  AiDraftInput,
  CreateActivityInput,
  PutQuestionsInput,
  ReopenActivityInput,
  UpdateActivityInput,
} from './activity.schemas.js';

export const activityService = {
  async listActivities(actorId: string, classroomSubjectId: string) {
    await requireAssignedSubject(actorId, classroomSubjectId);
    return activityRepository.listActivities(classroomSubjectId);
  },

  async getActivityDetail(actorId: string, activityId: string) {
    const activity = await activityRepository.findActivityById(activityId);
    if (!activity) {
      throw new NotFoundError('Không tìm thấy hoạt động');
    }

    await requireAssignedSubject(actorId, activity.classroom_subject_id);
    return activity;
  },

  async createActivity(
    actorId: string,
    classroomSubjectId: string,
    input: CreateActivityInput
  ) {
    return activityRepository.createActivityAtomically(actorId, classroomSubjectId, input);
  },

  async updateActivity(
    actorId: string,
    activityId: string,
    input: UpdateActivityInput
  ) {
    return activityRepository.updateActivityAtomically(actorId, activityId, input);
  },

  async deleteActivity(actorId: string, activityId: string) {
    return activityRepository.deleteActivityAtomically(actorId, activityId);
  },

  async generateAiDraft(
    actorId: string,
    activityId: string,
    input: AiDraftInput
  ): Promise<AiDraftResult> {
    const activity = await activityRepository.findActivityById(activityId);
    if (!activity?.exercise) {
      throw new NotFoundError('Không tìm thấy hoạt động bài tập');
    }

    await requireAssignedSubject(actorId, activity.classroom_subject_id, { allowArchived: false });

    // Validate lesson IDs belong to this classroom subject
    const lessons = await prisma.lesson.findMany({
      where: {
        id: { in: input.lessonIds },
        classroom_subject_id: activity.classroom_subject_id,
      },
      select: { id: true },
    });

    if (lessons.length !== input.lessonIds.length) {
      throw new BadRequestError('Một hoặc nhiều bài học làm nguồn không thuộc môn học này');
    }

    const segments = await activityRepository.findEligibleSegments(
      activity.classroom_subject_id,
      input.lessonIds
    );

    const formattedSegments = segments.map((seg) => ({
      id: seg.id,
      content: seg.content,
      lessonId: seg.materialVersion.material.lesson_id,
      materialTitle: seg.materialVersion.material.file_name,
    }));

    return aiDraftProvider.generateDraft({
      exerciseType: activity.exercise.exercise_type,
      difficulty: input.difficulty,
      questionCount: input.questionCount,
      lessonIds: input.lessonIds,
      segments: formattedSegments,
    });
  },

  async putQuestions(
    actorId: string,
    activityId: string,
    input: PutQuestionsInput
  ) {
    const activity = await activityRepository.findActivityById(activityId);
    if (!activity?.exercise) {
      throw new NotFoundError('Không tìm thấy hoạt động bài tập');
    }

    await requireAssignedSubject(actorId, activity.classroom_subject_id, { allowArchived: false });

    const exerciseType = activity.exercise.exercise_type;

    // 1. Validate questions content according to exercise type
    for (let index = 0; index < input.questions.length; index++) {
      const q = input.questions[index];
      const questionNumber = index + 1;

      if (exerciseType === 'QUIZ') {
        if (!q.options || q.options.length < 2) {
          throw new BadRequestError(
            `Câu hỏi ${questionNumber}: Bài trắc nghiệm (QUIZ) phải có ít nhất 2 lựa chọn trả lời`
          );
        }
        if (!q.answerKey?.trim()) {
          throw new BadRequestError(
            `Câu hỏi ${questionNumber}: Bài trắc nghiệm (QUIZ) phải có đáp án đúng (answerKey)`
          );
        }
        if (!q.options.includes(q.answerKey)) {
          throw new BadRequestError(
            `Câu hỏi ${questionNumber}: Đáp án đúng "${q.answerKey}" phải nằm trong danh sách các lựa chọn trả lời`
          );
        }
      } else if (exerciseType === 'WRITTEN') {
        if (!q.markingCriteria?.trim()) {
          throw new BadRequestError(
            `Câu hỏi ${questionNumber}: Bài tự luận (WRITTEN) phải có tiêu chí hoặc hướng dẫn chấm bài (markingCriteria)`
          );
        }
      }
    }

    // 2. Validate lesson links of questions
    const questionLessonIds = Array.from(new Set(input.questions.map((q) => q.lessonId)));
    const validLessons = await prisma.lesson.findMany({
      where: {
        id: { in: questionLessonIds },
        classroom_subject_id: activity.classroom_subject_id,
      },
      select: { id: true },
    });

    if (validLessons.length !== questionLessonIds.length) {
      throw new BadRequestError(
        'Một hoặc nhiều câu hỏi liên kết với bài học không thuộc môn học này'
      );
    }

    // 3. Validate citations if present
    const allSegmentIds: string[] = [];
    for (const q of input.questions) {
      if (q.citations) {
        for (const c of q.citations) {
          allSegmentIds.push(c.segmentId);
        }
      }
    }

    if (allSegmentIds.length > 0) {
      const uniqueSegmentIds = Array.from(new Set(allSegmentIds));
      const validSegments = await activityRepository.findEligibleSegments(
        activity.classroom_subject_id,
        questionLessonIds
      );
      const validSegmentIds = new Set(validSegments.map((segment) => segment.id));

      if (uniqueSegmentIds.some((segmentId) => !validSegmentIds.has(segmentId))) {
        throw new BadRequestError(
          'Một hoặc nhiều trích dẫn (citation) không hợp lệ hoặc không thuộc tài liệu đã xử lý của môn học này'
        );
      }
    }

    return activityRepository.putQuestionsAtomically(actorId, activityId, input.questions);
  },

  async publishActivity(actorId: string, activityId: string) {
    return activityRepository.publishActivityAtomically(actorId, activityId);
  },

  async closeActivity(actorId: string, activityId: string) {
    return activityRepository.closeActivityAtomically(actorId, activityId);
  },

  async reopenActivity(
    actorId: string,
    activityId: string,
    input: ReopenActivityInput
  ) {
    return activityRepository.reopenActivityAtomically(actorId, activityId, input);
  },

  async getSubmissions(actorId: string, activityId: string) {
    const activity = await activityRepository.findActivityById(activityId);
    if (!activity) {
      throw new NotFoundError('Không tìm thấy hoạt động');
    }

    await requireAssignedSubject(actorId, activity.classroom_subject_id);
    return activityRepository.findSubmissions(activityId);
  },
};
