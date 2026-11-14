import { describe, it, expect, vi, beforeEach } from 'vitest';
import { classroomSubjectService } from './classroom-subject.service.js';
import { classroomSubjectRepository } from './classroom-subject.repository.js';
import { BadRequestError, NotFoundError } from '../../../shared/errors/app-error.js';

describe('ClassroomSubjectService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('listEligibleTeachers', () => {
    it('returns active teachers specialized in the given subject', async () => {
      vi.spyOn(classroomSubjectRepository, 'findClassroomById').mockResolvedValue({
        id: 'cls-1',
        status: 'ACTIVE',
      } as any);

      vi.spyOn(classroomSubjectRepository, 'findClassroomSubject').mockResolvedValue({
        id: 'cs-1',
        classroom_id: 'cls-1',
        subject_id: 'sub-history',
      } as any);

      vi.spyOn(classroomSubjectRepository, 'findEligibleTeachers').mockResolvedValue([
        {
          id: 'tea-1',
          username: 'nguyenthithu',
          full_name: 'Nguyễn Thị Thu',
          teacherProfile: { qualification: 'Thạc sĩ Lịch sử' },
        } as any,
      ]);

      const result = await classroomSubjectService.listEligibleTeachers('cls-1', 'sub-history');
      expect(result).toHaveLength(1);
      expect(result[0].username).toBe('nguyenthithu');
      expect(result[0].qualification).toBe('Thạc sĩ Lịch sử');
    });

    it('throws NotFoundError if classroom does not exist', async () => {
      vi.spyOn(classroomSubjectRepository, 'findClassroomById').mockResolvedValue(null);

      await expect(
        classroomSubjectService.listEligibleTeachers('cls-missing', 'sub-1')
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('assignTeacher', () => {
    it('successfully assigns an eligible active specialized teacher', async () => {
      vi.spyOn(classroomSubjectRepository, 'assignTeacherAtomically').mockResolvedValue({
        id: 'cs-1',
        classroom_id: 'cls-1',
        subject_id: 'sub-history',
        teacher_id: 'tea-1',
        teacher: {
          id: 'tea-1',
          full_name: 'Nguyễn Thị Thu',
          username: 'nguyenthithu',
        },
      } as any);

      const result = await classroomSubjectService.assignTeacher('cls-1', 'sub-history', {
        teacherId: 'tea-1',
      });

      expect(result.teacherId).toBe('tea-1');
      expect(result.teacher?.fullName).toBe('Nguyễn Thị Thu');
      expect(classroomSubjectRepository.assignTeacherAtomically).toHaveBeenCalledWith(
        'cls-1',
        'sub-history',
        'tea-1'
      );
    });

    it('successfully removes (unassigns) a teacher when teacherId is null', async () => {
      vi.spyOn(classroomSubjectRepository, 'assignTeacherAtomically').mockResolvedValue({
        id: 'cs-1',
        classroom_id: 'cls-1',
        subject_id: 'sub-history',
        teacher_id: null,
        teacher: null,
      } as any);

      const result = await classroomSubjectService.assignTeacher('cls-1', 'sub-history', {
        teacherId: null,
      });

      expect(result.teacherId).toBeNull();
      expect(result.teacher).toBeNull();
      expect(classroomSubjectRepository.assignTeacherAtomically).toHaveBeenCalledWith(
        'cls-1',
        'sub-history',
        null
      );
    });

    it('rejects assignment if classroom is ARCHIVED', async () => {
      vi.spyOn(classroomSubjectRepository, 'assignTeacherAtomically').mockRejectedValue(
        new BadRequestError('Không thể phân công giáo viên cho lớp học đã lưu trữ')
      );

      await expect(
        classroomSubjectService.assignTeacher('cls-archived', 'sub-1', { teacherId: 'tea-1' })
      ).rejects.toThrow(BadRequestError);
    });

    it('rejects assignment if teacher is not specialized in the subject', async () => {
      vi.spyOn(classroomSubjectRepository, 'assignTeacherAtomically').mockRejectedValue(
        new BadRequestError('Giáo viên không có chuyên môn phù hợp với môn học này')
      );

      await expect(
        classroomSubjectService.assignTeacher('cls-1', 'sub-history', { teacherId: 'tea-math' })
      ).rejects.toThrow(BadRequestError);
    });

    it('rejects assignment if teacher account is INACTIVE', async () => {
      vi.spyOn(classroomSubjectRepository, 'assignTeacherAtomically').mockRejectedValue(
        new BadRequestError('Tài khoản giáo viên đang bị khóa hoặc không hoạt động')
      );

      await expect(
        classroomSubjectService.assignTeacher('cls-1', 'sub-history', { teacherId: 'tea-locked' })
      ).rejects.toThrow(BadRequestError);
    });
  });
});
