import { describe, it, expect, vi, beforeEach } from 'vitest';
import { lessonService } from '../../../../../../backend/src/modules/teacher/lessons/lesson.service.js';
import { lessonRepository } from '../../../../../../backend/src/modules/teacher/lessons/lesson.repository.js';
import * as teacherSubjectPolicy from '../../../../../../backend/src/modules/teacher/access/teacher-subject.policy.js';
import { BadRequestError } from '../../../../../../backend/src/shared/errors/app-error.js';

describe('LessonService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockPolicyCtx = {
    classroomSubjectId: 'cs-1',
    classroomId: 'cls-1',
    classroomName: '11A1',
    classroomStatus: 'ACTIVE' as const,
    academicYear: '2026-2027',
    gradeLevel: 11,
    subjectId: 'sub-history',
    subjectName: 'Lịch sử',
    teacherId: 'teacher-1',
  };

  describe('createLesson', () => {
    it('creates a draft lesson under assigned classroomSubject', async () => {
      vi.spyOn(teacherSubjectPolicy, 'requireAssignedSubject').mockResolvedValue(mockPolicyCtx);
      vi.spyOn(lessonRepository, 'createLesson').mockResolvedValue({
        id: 'lesson-1',
        classroom_subject_id: 'cs-1',
        title: 'Cách mạng tháng Tám',
        status: 'DRAFT',
        published_at: null,
        created_by_id: 'teacher-1',
        created_at: new Date('2026-11-01'),
        updated_at: new Date('2026-11-01'),
      } as any);

      const created = await lessonService.createLesson('cs-1', 'teacher-1', {
        title: 'Cách mạng tháng Tám',
      });

      expect(created.id).toBe('lesson-1');
      expect(created.status).toBe('DRAFT');
      expect(created.title).toBe('Cách mạng tháng Tám');
    });

    it('rejects creating lesson on archived classroom', async () => {
      vi.spyOn(teacherSubjectPolicy, 'requireAssignedSubject').mockRejectedValue(
        new BadRequestError('Không thể chỉnh sửa dữ liệu của lớp học đã lưu trữ')
      );

      await expect(
        lessonService.createLesson('cs-1', 'teacher-1', { title: 'Test' })
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe('publishLesson', () => {
    it('rejects publication if lesson has no materials', async () => {
      vi.spyOn(lessonRepository, 'findLessonDetail').mockResolvedValue({
        id: 'lesson-1',
        classroom_subject_id: 'cs-1',
        status: 'DRAFT',
        materials: [],
      } as any);
      vi.spyOn(teacherSubjectPolicy, 'requireAssignedSubject').mockResolvedValue(mockPolicyCtx);

      await expect(lessonService.publishLesson('lesson-1', 'teacher-1')).rejects.toThrow(
        BadRequestError
      );
    });

    it('rejects publication if no material is PROCESSED', async () => {
      vi.spyOn(lessonRepository, 'findLessonDetail').mockResolvedValue({
        id: 'lesson-1',
        classroom_subject_id: 'cs-1',
        status: 'DRAFT',
        materials: [
          {
            id: 'mat-1',
            status: 'DRAFT',
            versions: [{ version_no: 1, processing_status: 'PENDING' }],
          },
        ],
      } as any);
      vi.spyOn(teacherSubjectPolicy, 'requireAssignedSubject').mockResolvedValue(mockPolicyCtx);

      await expect(lessonService.publishLesson('lesson-1', 'teacher-1')).rejects.toThrow(
        BadRequestError
      );
    });

    it('publishes lesson when every active material has a processed latest version', async () => {
      vi.spyOn(lessonRepository, 'findLessonDetail').mockResolvedValue({
        id: 'lesson-1',
        classroom_subject_id: 'cs-1',
        status: 'DRAFT',
        materials: [
          {
            id: 'mat-1',
            status: 'DRAFT',
            versions: [{ version_no: 1, processing_status: 'PROCESSED' }],
          },
        ],
      } as any);
      vi.spyOn(teacherSubjectPolicy, 'requireAssignedSubject').mockResolvedValue(mockPolicyCtx);
      vi.spyOn(lessonRepository, 'publishLessonWithMaterials').mockResolvedValue({
        id: 'lesson-1',
        status: 'PUBLISHED',
        published_at: new Date('2026-11-01'),
      } as any);

      const published = await lessonService.publishLesson('lesson-1', 'teacher-1');
      expect(published.status).toBe('PUBLISHED');
      expect(published.publishedAt).toBeDefined();
    });

    it('rejects publication when one active material is still pending', async () => {
      vi.spyOn(lessonRepository, 'findLessonDetail').mockResolvedValue({
        id: 'lesson-1',
        classroom_subject_id: 'cs-1',
        status: 'DRAFT',
        materials: [
          { id: 'mat-1', status: 'DRAFT', versions: [{ version_no: 1, processing_status: 'PROCESSED' }] },
          { id: 'mat-2', status: 'DRAFT', versions: [{ version_no: 1, processing_status: 'PENDING' }] },
        ],
      } as any);
      vi.spyOn(teacherSubjectPolicy, 'requireAssignedSubject').mockResolvedValue(mockPolicyCtx);

      await expect(lessonService.publishLesson('lesson-1', 'teacher-1')).rejects.toThrow(
        'Tất cả học liệu đang giữ lại phải được xử lý thành công trước khi công bố'
      );
    });
  });
});
