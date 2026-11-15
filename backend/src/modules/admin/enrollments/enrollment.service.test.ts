import { describe, it, expect, vi, beforeEach } from 'vitest';
import { enrollmentService } from './enrollment.service.js';
import { enrollmentRepository } from './enrollment.repository.js';
import { BadRequestError, ConflictError } from '../../../shared/errors/app-error.js';

describe('EnrollmentService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('enrollStudent', () => {
    it('successfully enrolls an active unassigned student', async () => {
      vi.spyOn(enrollmentRepository, 'enrollStudentAtomically').mockResolvedValue({
        id: 'enr-1',
        student_id: 'stu-1',
        classroom_id: 'cls-1',
        joined_at: new Date('2026-09-01'),
        left_at: null,
        student: { id: 'stu-1', full_name: 'Nguyễn Văn A', username: 'nguyenvana' },
      } as any);

      const result = await enrollmentService.enrollStudent('cls-1', { studentId: 'stu-1' });
      expect(result.id).toBe('enr-1');
      expect(result.studentId).toBe('stu-1');
      expect(result.classroomId).toBe('cls-1');
      expect(enrollmentRepository.enrollStudentAtomically).toHaveBeenCalledWith('cls-1', 'stu-1');
    });

    it('rejects enrolling into an ARCHIVED classroom', async () => {
      vi.spyOn(enrollmentRepository, 'enrollStudentAtomically').mockRejectedValue(
        new BadRequestError('Không thể thêm học sinh vào lớp học đã lưu trữ')
      );

      await expect(
        enrollmentService.enrollStudent('cls-archived', { studentId: 'stu-1' })
      ).rejects.toThrow(BadRequestError);
    });

    it('rejects if student is INACTIVE or not a STUDENT', async () => {
      vi.spyOn(enrollmentRepository, 'enrollStudentAtomically').mockRejectedValue(
        new BadRequestError('Tài khoản được chọn không phải là học sinh')
      );

      await expect(
        enrollmentService.enrollStudent('cls-1', { studentId: 'user-teacher' })
      ).rejects.toThrow(BadRequestError);
    });

    it('rejects if student is already enrolled in a classroom', async () => {
      vi.spyOn(enrollmentRepository, 'enrollStudentAtomically').mockRejectedValue(
        new ConflictError(
          'Học sinh đã được phân lớp. Vui lòng sử dụng tính năng chuyển lớp nếu muốn chuyển sang lớp khác.'
        )
      );

      await expect(
        enrollmentService.enrollStudent('cls-1', { studentId: 'stu-1' })
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('transferStudent', () => {
    it('successfully transfers a student to target classroom', async () => {
      vi.spyOn(enrollmentRepository, 'transferStudentAtomically').mockResolvedValue({
        studentId: 'stu-1',
        previousClassroomId: 'cls-source',
        newClassroomId: 'cls-target',
        transferredAt: new Date('2026-09-10'),
      });

      const result = await enrollmentService.transferStudent('stu-1', {
        targetClassroomId: 'cls-target',
      });

      expect(result.previousClassroomId).toBe('cls-source');
      expect(result.newClassroomId).toBe('cls-target');
      expect(enrollmentRepository.transferStudentAtomically).toHaveBeenCalledWith(
        'stu-1',
        'cls-target'
      );
    });

    it('rejects transfer if target classroom is ARCHIVED', async () => {
      vi.spyOn(enrollmentRepository, 'transferStudentAtomically').mockRejectedValue(
        new BadRequestError('Không thể chuyển học sinh vào lớp học đã lưu trữ')
      );

      await expect(
        enrollmentService.transferStudent('stu-1', { targetClassroomId: 'cls-archived' })
      ).rejects.toThrow(BadRequestError);
    });

    it('rejects transfer if student has no active enrollment', async () => {
      vi.spyOn(enrollmentRepository, 'transferStudentAtomically').mockRejectedValue(
        new BadRequestError(
          'Học sinh hiện chưa thuộc lớp học nào để thực hiện chuyển lớp. Hãy thêm học sinh vào lớp trước.'
        )
      );

      await expect(
        enrollmentService.transferStudent('stu-1', { targetClassroomId: 'cls-target' })
      ).rejects.toThrow(BadRequestError);
    });

    it('rejects transfer if student is already in target classroom', async () => {
      vi.spyOn(enrollmentRepository, 'transferStudentAtomically').mockRejectedValue(
        new ConflictError('Học sinh đã ở trong lớp học này')
      );

      await expect(
        enrollmentService.transferStudent('stu-1', { targetClassroomId: 'cls-target' })
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('listUnassignedStudents', () => {
    it('returns paginated students with no active enrollment', async () => {
      vi.spyOn(enrollmentRepository, 'listUnassignedStudents').mockResolvedValue({
        items: [
          {
            id: 'stu-free-1',
            username: 'free.student',
            fullName: 'Học sinh Tự do',
            contact: '0123456789',
            createdAt: new Date('2026-09-01'),
          },
        ],
        total: 1,
      });

      const res = await enrollmentService.listUnassignedStudents({
        page: 1,
        limit: 20,
        skip: 0,
        take: 20,
      });
      expect(res.items).toHaveLength(1);
      expect(res.total).toBe(1);
    });
  });

  describe('removeStudent', () => {
    it('closes the current enrollment and keeps the student account', async () => {
      vi.spyOn(enrollmentRepository, 'removeStudentAtomically').mockResolvedValue({
        studentId: 'stu-1',
        classroomId: 'cls-1',
        removedAt: new Date('2026-09-12'),
      });

      const result = await enrollmentService.removeStudent('cls-1', 'stu-1');

      expect(result).toEqual({
        studentId: 'stu-1',
        classroomId: 'cls-1',
        removedAt: '2026-09-12T00:00:00.000Z',
      });
      expect(enrollmentRepository.removeStudentAtomically).toHaveBeenCalledWith('cls-1', 'stu-1');
    });

    it('rejects removing a student who is no longer in the selected classroom', async () => {
      vi.spyOn(enrollmentRepository, 'removeStudentAtomically').mockRejectedValue(
        new BadRequestError('Học sinh hiện không thuộc lớp học này')
      );

      await expect(enrollmentService.removeStudent('cls-1', 'stu-1')).rejects.toThrow(
        BadRequestError
      );
    });
  });
});
