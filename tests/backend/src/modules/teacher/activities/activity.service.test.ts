import { describe, it, expect, vi, beforeEach } from 'vitest';
import { activityService } from '../../../../../../backend/src/modules/teacher/activities/activity.service.js';
import { activityRepository } from '../../../../../../backend/src/modules/teacher/activities/activity.repository.js';
import {
  setAiDraftProvider,
  type ActivityAiDraftProvider,
  DefaultActivityAiDraftProvider,
} from '../../../../../../backend/src/modules/teacher/activities/activity-ai-draft.provider.js';
import { prisma } from '../../../../../../backend/src/lib/prisma.js';
import { BadRequestError, NotFoundError } from '../../../../../../backend/src/shared/errors/app-error.js';
import * as teacherSubjectPolicy from '../../../../../../backend/src/modules/teacher/access/teacher-subject.policy.js';

describe('ActivityService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setAiDraftProvider(new DefaultActivityAiDraftProvider());
  });

  describe('listActivities', () => {
    it('verifies assignment and returns activities', async () => {
      vi.spyOn(teacherSubjectPolicy, 'requireAssignedSubject').mockResolvedValue({} as any);
      vi.spyOn(activityRepository, 'listActivities').mockResolvedValue([
        {
          id: 'act-1',
          title: 'Bài tập 1',
          status: 'DRAFT',
        } as any,
      ]);

      const result = await activityService.listActivities('tea-1', 'cs-1');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('act-1');
      expect(teacherSubjectPolicy.requireAssignedSubject).toHaveBeenCalledWith('tea-1', 'cs-1');
    });
  });

  describe('getActivityDetail', () => {
    it('returns detail if activity found and teacher assigned', async () => {
      vi.spyOn(activityRepository, 'findActivityById').mockResolvedValue({
        id: 'act-1',
        classroom_subject_id: 'cs-1',
        title: 'Chi tiết bài tập',
      } as any);
      vi.spyOn(teacherSubjectPolicy, 'requireAssignedSubject').mockResolvedValue({} as any);

      const result = await activityService.getActivityDetail('tea-1', 'act-1');
      expect(result.id).toBe('act-1');
      expect(teacherSubjectPolicy.requireAssignedSubject).toHaveBeenCalledWith('tea-1', 'cs-1');
    });

    it('throws NotFoundError if activity not found', async () => {
      vi.spyOn(activityRepository, 'findActivityById').mockResolvedValue(null);

      await expect(
        activityService.getActivityDetail('tea-1', 'act-missing')
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('generateAiDraft', () => {
    it('throws NotFoundError if activity not found', async () => {
      vi.spyOn(activityRepository, 'findActivityById').mockResolvedValue(null);

      await expect(
        activityService.generateAiDraft('tea-1', 'act-missing', {
          lessonIds: ['les-1'],
          questionCount: 5,
          difficulty: 'BASIC',
        })
      ).rejects.toThrow(NotFoundError);
    });

    it('throws BadRequestError if any lesson does not belong to classroom subject', async () => {
      vi.spyOn(activityRepository, 'findActivityById').mockResolvedValue({
        id: 'act-1',
        classroom_subject_id: 'cs-1',
        exercise: { exercise_type: 'QUIZ' },
      } as any);
      vi.spyOn(teacherSubjectPolicy, 'requireAssignedSubject').mockResolvedValue({} as any);
      vi.spyOn(prisma.lesson, 'findMany').mockResolvedValue([]); // 0 found for 1 requested

      await expect(
        activityService.generateAiDraft('tea-1', 'act-1', {
          lessonIds: ['les-invalid'],
          questionCount: 5,
          difficulty: 'BASIC',
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('returns draft result from provider with eligible segments', async () => {
      vi.spyOn(activityRepository, 'findActivityById').mockResolvedValue({
        id: 'act-1',
        classroom_subject_id: 'cs-1',
        exercise: { exercise_type: 'QUIZ' },
      } as any);
      vi.spyOn(teacherSubjectPolicy, 'requireAssignedSubject').mockResolvedValue({} as any);
      vi.spyOn(prisma.lesson, 'findMany').mockResolvedValue([{ id: 'les-1' }] as any);

      vi.spyOn(activityRepository, 'findEligibleSegments').mockResolvedValue([
        {
          id: 'seg-1',
          content: 'Nội dung lịch sử thời Lý',
          materialVersion: {
            material: {
              lesson_id: 'les-1',
              file_name: 'lich_su_lop_10.pdf',
            },
          },
        } as any,
      ]);

      const mockProvider: ActivityAiDraftProvider = {
        async generateDraft(params) {
          return {
            status: 'READY',
            questions: [
              {
                prompt: 'Nhà Lý dời đô về Thăng Long năm nào?',
                options: ['1009', '1010', '1011', '1012'],
                answerKey: '1010',
                explanation: 'Chiếu dời đô năm 1010',
                maxPoints: 2.0,
                lessonId: params.lessonIds[0],
                citations: [{ segmentId: 'seg-1' }],
              },
            ],
          };
        },
      };
      setAiDraftProvider(mockProvider);

      const result = await activityService.generateAiDraft('tea-1', 'act-1', {
        lessonIds: ['les-1'],
        questionCount: 1,
        difficulty: 'BASIC',
      });

      expect(result.status).toBe('READY');
      expect(result.questions).toHaveLength(1);
      expect(result.questions[0].answerKey).toBe('1010');
    });

    it('returns UNAVAILABLE from default provider if segments exist', async () => {
      vi.spyOn(activityRepository, 'findActivityById').mockResolvedValue({
        id: 'act-1',
        classroom_subject_id: 'cs-1',
        exercise: { exercise_type: 'QUIZ' },
      } as any);
      vi.spyOn(teacherSubjectPolicy, 'requireAssignedSubject').mockResolvedValue({} as any);
      vi.spyOn(prisma.lesson, 'findMany').mockResolvedValue([{ id: 'les-1' }] as any);
      vi.spyOn(activityRepository, 'findEligibleSegments').mockResolvedValue([
        {
          id: 'seg-1',
          content: 'Nội dung tư liệu',
          materialVersion: {
            material: { lesson_id: 'les-1', file_name: 'doc.pdf' },
          },
        } as any,
      ]);

      const result = await activityService.generateAiDraft('tea-1', 'act-1', {
        lessonIds: ['les-1'],
        questionCount: 5,
        difficulty: 'BASIC',
      });

      expect(result.status).toBe('UNAVAILABLE');
      expect(result.questions).toHaveLength(0);
    });
  });

  describe('putQuestions', () => {
    it('validates QUIZ question requires >= 2 options', async () => {
      vi.spyOn(activityRepository, 'findActivityById').mockResolvedValue({
        id: 'act-1',
        classroom_subject_id: 'cs-1',
        exercise: { exercise_type: 'QUIZ' },
      } as any);
      vi.spyOn(teacherSubjectPolicy, 'requireAssignedSubject').mockResolvedValue({} as any);

      await expect(
        activityService.putQuestions('tea-1', 'act-1', {
          questions: [
            {
              prompt: 'Câu hỏi thiếu option?',
              options: ['Chỉ có 1'],
              answerKey: 'Chỉ có 1',
              explanation: '',
              maxPoints: 1,
              lessonId: 'les-1',
              citations: [],
            },
          ],
        })
      ).rejects.toThrow(/ít nhất 2 lựa chọn/);
    });

    it('validates QUIZ question answerKey must be within options', async () => {
      vi.spyOn(activityRepository, 'findActivityById').mockResolvedValue({
        id: 'act-1',
        classroom_subject_id: 'cs-1',
        exercise: { exercise_type: 'QUIZ' },
      } as any);
      vi.spyOn(teacherSubjectPolicy, 'requireAssignedSubject').mockResolvedValue({} as any);

      await expect(
        activityService.putQuestions('tea-1', 'act-1', {
          questions: [
            {
              prompt: 'Câu hỏi có đáp án không khớp?',
              options: ['A', 'B', 'C'],
              answerKey: 'D',
              explanation: '',
              maxPoints: 1,
              lessonId: 'les-1',
              citations: [],
            },
          ],
        })
      ).rejects.toThrow(/phải nằm trong danh sách các lựa chọn/);
    });

    it('validates WRITTEN question requires markingCriteria', async () => {
      vi.spyOn(activityRepository, 'findActivityById').mockResolvedValue({
        id: 'act-1',
        classroom_subject_id: 'cs-1',
        exercise: { exercise_type: 'WRITTEN' },
      } as any);
      vi.spyOn(teacherSubjectPolicy, 'requireAssignedSubject').mockResolvedValue({} as any);

      await expect(
        activityService.putQuestions('tea-1', 'act-1', {
          questions: [
            {
              prompt: 'Trình bày ý kiến về tác phẩm?',
              explanation: '',
              maxPoints: 5,
              lessonId: 'les-1',
              citations: [],
            },
          ],
        })
      ).rejects.toThrow(/tiêu chí hoặc hướng dẫn chấm bài/);
    });

    it('rejects if question references a lesson not in this classroom subject', async () => {
      vi.spyOn(activityRepository, 'findActivityById').mockResolvedValue({
        id: 'act-1',
        classroom_subject_id: 'cs-1',
        exercise: { exercise_type: 'QUIZ' },
      } as any);
      vi.spyOn(teacherSubjectPolicy, 'requireAssignedSubject').mockResolvedValue({} as any);
      vi.spyOn(prisma.lesson, 'findMany').mockResolvedValue([]); // not found

      await expect(
        activityService.putQuestions('tea-1', 'act-1', {
          questions: [
            {
              prompt: 'Câu hỏi bài học ngoài môn?',
              options: ['A', 'B'],
              answerKey: 'A',
              explanation: '',
              maxPoints: 1,
              lessonId: 'les-outside',
              citations: [],
            },
          ],
        })
      ).rejects.toThrow(/không thuộc môn học này/);
    });

    it('rejects if citation segment is invalid or not PROCESSED in this subject', async () => {
      vi.spyOn(activityRepository, 'findActivityById').mockResolvedValue({
        id: 'act-1',
        classroom_subject_id: 'cs-1',
        exercise: { exercise_type: 'QUIZ' },
      } as any);
      vi.spyOn(teacherSubjectPolicy, 'requireAssignedSubject').mockResolvedValue({} as any);
      vi.spyOn(prisma.lesson, 'findMany').mockResolvedValue([{ id: 'les-1' }] as any);
      vi.spyOn(prisma.materialSegment, 'findMany').mockResolvedValue([]); // segment not found

      await expect(
        activityService.putQuestions('tea-1', 'act-1', {
          questions: [
            {
              prompt: 'Câu hỏi có trích dẫn lỗi?',
              options: ['A', 'B'],
              answerKey: 'A',
              explanation: '',
              maxPoints: 1,
              lessonId: 'les-1',
              citations: [{ segmentId: 'seg-invalid' }],
            },
          ],
        })
      ).rejects.toThrow(/trích dẫn \(citation\) không hợp lệ/);
    });

    it('successfully calls repository when question data is valid', async () => {
      vi.spyOn(activityRepository, 'findActivityById').mockResolvedValue({
        id: 'act-1',
        classroom_subject_id: 'cs-1',
        exercise: { exercise_type: 'QUIZ' },
      } as any);
      vi.spyOn(teacherSubjectPolicy, 'requireAssignedSubject').mockResolvedValue({} as any);
      vi.spyOn(prisma.lesson, 'findMany').mockResolvedValue([{ id: 'les-1' }] as any);
      vi.spyOn(prisma.materialSegment, 'findMany').mockResolvedValue([{ id: 'seg-1' }] as any);

      vi.spyOn(activityRepository, 'putQuestionsAtomically').mockResolvedValue({
        id: 'act-1',
        title: 'Hoạt động đã cập nhật câu hỏi',
      } as any);

      const res = await activityService.putQuestions('tea-1', 'act-1', {
        questions: [
          {
            prompt: 'Câu hỏi chuẩn trắc nghiệm?',
            options: ['A', 'B'],
            answerKey: 'A',
            explanation: 'Giải thích',
            maxPoints: 1,
            lessonId: 'les-1',
            citations: [{ segmentId: 'seg-1' }],
          },
        ],
      });

      expect(res?.id).toBe('act-1');
      expect(activityRepository.putQuestionsAtomically).toHaveBeenCalled();
    });
  });

  describe('lifecycle & submissions', () => {
    it('delegates publish to repository', async () => {
      vi.spyOn(activityRepository, 'publishActivityAtomically').mockResolvedValue({
        id: 'act-1',
        status: 'PUBLISHED',
      } as any);

      const res = await activityService.publishActivity('tea-1', 'act-1');
      expect(res?.status).toBe('PUBLISHED');
      expect(activityRepository.publishActivityAtomically).toHaveBeenCalledWith('tea-1', 'act-1');
    });

    it('delegates close to repository', async () => {
      vi.spyOn(activityRepository, 'closeActivityAtomically').mockResolvedValue({
        id: 'act-1',
        status: 'CLOSED',
      } as any);

      const res = await activityService.closeActivity('tea-1', 'act-1');
      expect(res?.status).toBe('CLOSED');
      expect(activityRepository.closeActivityAtomically).toHaveBeenCalledWith('tea-1', 'act-1');
    });

    it('delegates reopen to repository', async () => {
      vi.spyOn(activityRepository, 'reopenActivityAtomically').mockResolvedValue({
        id: 'act-1',
        status: 'PUBLISHED',
      } as any);

      const res = await activityService.reopenActivity('tea-1', 'act-1', {
        closesAt: '2026-12-01T00:00:00Z',
      });
      expect(res?.status).toBe('PUBLISHED');
      expect(activityRepository.reopenActivityAtomically).toHaveBeenCalledWith(
        'tea-1',
        'act-1',
        { closesAt: '2026-12-01T00:00:00Z' }
      );
    });

    it('returns submissions for authorized teacher', async () => {
      vi.spyOn(activityRepository, 'findActivityById').mockResolvedValue({
        id: 'act-1',
        classroom_subject_id: 'cs-1',
      } as any);
      vi.spyOn(teacherSubjectPolicy, 'requireAssignedSubject').mockResolvedValue({} as any);
      vi.spyOn(activityRepository, 'findSubmissions').mockResolvedValue([
        {
          id: 'sub-1',
          student: { full_name: 'Nguyễn Văn A' },
          total_score: 9.0,
        } as any,
      ]);

      const res = await activityService.getSubmissions('tea-1', 'act-1');
      expect(res).toHaveLength(1);
      expect(res[0].id).toBe('sub-1');
    });
  });
});
