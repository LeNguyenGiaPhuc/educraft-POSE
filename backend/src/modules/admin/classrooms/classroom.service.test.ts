import { describe, it, expect, vi, beforeEach } from 'vitest';
import { classroomService } from './classroom.service.js';
import { classroomRepository } from './classroom.repository.js';
import { ConflictError, NotFoundError, BadRequestError } from '../../../shared/errors/app-error.js';

describe('ClassroomService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('createClassroom', () => {
    it('creates a classroom with all active subjects in transaction', async () => {
      vi.spyOn(classroomRepository, 'findByNameAndAcademicYear').mockResolvedValue(null);
      vi.spyOn(classroomRepository, 'createClassroomWithSubjects').mockResolvedValue({
        id: 'cls-1',
        name: '10A1',
        grade_level: 10,
        academic_year: '2026-2027',
        status: 'ACTIVE',
        created_at: new Date('2026-09-01T00:00:00Z'),
        updated_at: new Date('2026-09-01T00:00:00Z'),
        _count: { enrollments: 0, classroomSubjects: 3 },
      } as any);

      const result = await classroomService.createClassroom({
        name: '10A1',
        gradeLevel: 10,
        academicYear: '2026-2027',
      });

      expect(result.id).toBe('cls-1');
      expect(result.name).toBe('10A1');
      expect(classroomRepository.createClassroomWithSubjects).toHaveBeenCalledWith({
        name: '10A1',
        gradeLevel: 10,
        academicYear: '2026-2027',
      });
    });

    it('rejects duplicate classroom name within same academic year (case-insensitive)', async () => {
      vi.spyOn(classroomRepository, 'findByNameAndAcademicYear').mockResolvedValue({
        id: 'existing-id',
        name: '10a1',
        academic_year: '2026-2027',
      } as any);

      await expect(
        classroomService.createClassroom({
          name: '10A1',
          gradeLevel: 10,
          academicYear: '2026-2027',
        })
      ).rejects.toThrow(ConflictError);
    });

    it('maps database uniqueness race (P2002) to ConflictError during classroom creation', async () => {
      vi.spyOn(classroomRepository, 'findByNameAndAcademicYear').mockResolvedValue(null);
      vi.spyOn(classroomRepository, 'createClassroomWithSubjects').mockRejectedValue({ code: 'P2002' });

      await expect(
        classroomService.createClassroom({
          name: '10A1',
          gradeLevel: 10,
          academicYear: '2026-2027',
        })
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('updateClassroom', () => {
    it('rejects updating an archived classroom', async () => {
      vi.spyOn(classroomRepository, 'findByIdRaw').mockResolvedValue({
        id: 'cls-archived',
        name: '12A1',
        grade_level: 12,
        academic_year: '2025-2026',
        status: 'ARCHIVED',
      } as any);

      await expect(
        classroomService.updateClassroom('cls-archived', { name: '12A1-renamed' })
      ).rejects.toThrow(BadRequestError);
    });

    it('rejects conflict when renaming to an existing classroom name in same year', async () => {
      vi.spyOn(classroomRepository, 'findByIdRaw').mockResolvedValue({
        id: 'cls-1',
        name: '10A1',
        grade_level: 10,
        academic_year: '2026-2027',
        status: 'ACTIVE',
      } as any);

      vi.spyOn(classroomRepository, 'findByNameAndAcademicYear').mockResolvedValue({
        id: 'cls-2',
        name: '10A2',
        academic_year: '2026-2027',
      } as any);

      await expect(
        classroomService.updateClassroom('cls-1', { name: '10a2' })
      ).rejects.toThrow(ConflictError);
    });

    it('maps database uniqueness race (P2002) to ConflictError during classroom update', async () => {
      vi.spyOn(classroomRepository, 'findByIdRaw').mockResolvedValue({
        id: 'cls-1',
        name: '10A1',
        grade_level: 10,
        academic_year: '2026-2027',
        status: 'ACTIVE',
      } as any);

      vi.spyOn(classroomRepository, 'findByNameAndAcademicYear').mockResolvedValue(null);
      vi.spyOn(classroomRepository, 'updateClassroom').mockRejectedValue({ code: 'P2002' });

      await expect(
        classroomService.updateClassroom('cls-1', { name: '10A2' })
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('archiveClassroom', () => {
    it('successfully archives an active classroom', async () => {
      vi.spyOn(classroomRepository, 'findByIdRaw').mockResolvedValue({
        id: 'cls-1',
        name: '10A1',
        status: 'ACTIVE',
      } as any);

      vi.spyOn(classroomRepository, 'archiveClassroom').mockResolvedValue({
        id: 'cls-1',
        name: '10A1',
        grade_level: 10,
        academic_year: '2026-2027',
        status: 'ARCHIVED',
        created_at: new Date(),
        updated_at: new Date(),
        _count: { enrollments: 30, classroomSubjects: 5 },
      } as any);

      const res = await classroomService.archiveClassroom('cls-1');
      expect(res.status).toBe('ARCHIVED');
    });

    it('throws NotFoundError if classroom does not exist', async () => {
      vi.spyOn(classroomRepository, 'findByIdRaw').mockResolvedValue(null);

      await expect(classroomService.archiveClassroom('missing-id')).rejects.toThrow(NotFoundError);
    });
  });

  describe('getClassroomDetail', () => {
    it('returns detail including active students and subjects with teacher info', async () => {
      vi.spyOn(classroomRepository, 'findDetailById').mockResolvedValue({
        id: 'cls-1',
        name: '10A1',
        grade_level: 10,
        academic_year: '2026-2027',
        status: 'ACTIVE',
        created_at: new Date('2026-09-01'),
        updated_at: new Date('2026-09-01'),
        enrollments: [
          {
            id: 'enr-1',
            joined_at: new Date('2026-09-02'),
            student: {
              id: 'stu-1',
              full_name: 'Nguyễn Văn A',
              username: 'nguyenvana',
              contact: '0901234567',
              created_at: new Date('2026-09-01'),
            },
          },
        ],
        classroomSubjects: [
          {
            id: 'cs-1',
            subject: { id: 'sub-1', name: 'Toán học', is_active: true },
            teacher: { id: 'tea-1', full_name: 'Thầy Bình', username: 'thaybinh' },
            _count: { lessons: 4 },
          },
          {
            id: 'cs-2',
            subject: { id: 'sub-2', name: 'Lịch sử', is_active: true },
            teacher: null,
            _count: { lessons: 0 },
          },
        ],
      } as any);

      const detail = await classroomService.getClassroomDetail('cls-1');
      expect(detail.id).toBe('cls-1');
      expect(detail.students).toHaveLength(1);
      expect(detail.students[0].fullName).toBe('Nguyễn Văn A');
      expect(detail.subjects).toHaveLength(2);
      expect(detail.subjects[0].teacher?.fullName).toBe('Thầy Bình');
      expect(detail.subjects[1].teacher).toBeNull();
    });
  });
});
