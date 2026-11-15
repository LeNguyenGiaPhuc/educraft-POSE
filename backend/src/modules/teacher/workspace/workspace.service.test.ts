import { describe, it, expect, vi, beforeEach } from 'vitest';
import { workspaceService } from './workspace.service.js';
import { workspaceRepository } from './workspace.repository.js';
import * as teacherSubjectPolicy from '../access/teacher-subject.policy.js';
import { NotFoundError } from '../../../shared/errors/app-error.js';

describe('WorkspaceService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('listAssignedClassrooms', () => {
    it('returns assigned classrooms with subject and student counts', async () => {
      vi.spyOn(workspaceRepository, 'findAssignedClassrooms').mockResolvedValue([
        {
          id: 'cls-1',
          name: '11A1',
          academic_year: '2026-2027',
          grade_level: 11,
          status: 'ACTIVE',
          classroomSubjects: [
            {
              id: 'cs-1',
              teacher_id: 'teacher-1',
              subject: { id: 'sub-history', name: 'Lịch sử' },
            },
          ],
          enrollments: [
            { student_id: 'student-1', left_at: null },
            { student_id: 'student-2', left_at: null },
          ],
        } as any,
      ]);

      const list = await workspaceService.listAssignedClassrooms('teacher-1');
      expect(list).toHaveLength(1);
      expect(list[0].id).toBe('cls-1');
      expect(list[0].studentCount).toBe(2);
      expect(list[0].readOnly).toBe(false);
      expect(list[0].subjects).toHaveLength(1);
      expect(list[0].subjects[0].name).toBe('Lịch sử');
    });

    it('includes archived assigned classrooms as read-only history', async () => {
      vi.spyOn(workspaceRepository, 'findAssignedClassrooms').mockResolvedValue([
        {
          id: 'cls-archived',
          name: '10A1',
          academic_year: '2025-2026',
          grade_level: 10,
          status: 'ARCHIVED',
          classroomSubjects: [
            {
              id: 'cs-archived',
              teacher_id: 'teacher-1',
              subject: { id: 'sub-history', name: 'Lịch sử' },
            },
          ],
          enrollments: [
            { student_id: 'student-1', left_at: new Date('2026-08-01') },
          ],
        } as any,
      ]);

      const list = await workspaceService.listAssignedClassrooms('teacher-1');

      expect(list[0].status).toBe('ARCHIVED');
      expect(list[0].readOnly).toBe(true);
      expect(list[0].studentCount).toBe(1);
    });
  });

  describe('getAssignedClassroomDetail', () => {
    it('returns classroom detail if teacher is assigned to it', async () => {
      vi.spyOn(workspaceRepository, 'findAssignedClassroomDetail').mockResolvedValue({
        id: 'cls-1',
        name: '11A1',
        academic_year: '2026-2027',
        grade_level: 11,
        status: 'ACTIVE',
        classroomSubjects: [
          {
            id: 'cs-1',
            teacher_id: 'teacher-1',
            subject: { id: 'sub-history', name: 'Lịch sử' },
          },
        ],
        enrollments: [
          {
            joined_at: new Date('2026-09-01'),
            left_at: null,
            student: {
              id: 'stu-1',
              full_name: 'Nguyễn Văn A',
              username: 'nguyenvana',
              contact: '0901234567',
            },
          },
        ],
      } as any);

      const detail = await workspaceService.getAssignedClassroomDetail('cls-1', 'teacher-1');
      expect(detail.id).toBe('cls-1');
      expect(detail.students).toHaveLength(1);
      expect(detail.students[0].name).toBe('Nguyễn Văn A');
      expect(detail.readOnly).toBe(false);
    });

    it('returns historical enrollments for an archived classroom', async () => {
      vi.spyOn(workspaceRepository, 'findAssignedClassroomDetail').mockResolvedValue({
        id: 'cls-archived',
        name: '10A1',
        academic_year: '2025-2026',
        grade_level: 10,
        status: 'ARCHIVED',
        classroomSubjects: [],
        enrollments: [
          {
            joined_at: new Date('2025-09-01'),
            left_at: new Date('2026-08-01'),
            student: {
              id: 'stu-1',
              full_name: 'Nguyễn Văn A',
              username: 'nguyenvana',
              contact: '0901234567',
            },
          },
        ],
      } as any);

      const detail = await workspaceService.getAssignedClassroomDetail('cls-archived', 'teacher-1');

      expect(detail.readOnly).toBe(true);
      expect(detail.students[0].leftAt).toBe('2026-08-01T00:00:00.000Z');
    });

    it('throws NotFoundError if classroom is not assigned to teacher', async () => {
      vi.spyOn(workspaceRepository, 'findAssignedClassroomDetail').mockResolvedValue(null);

      await expect(
        workspaceService.getAssignedClassroomDetail('cls-unassigned', 'teacher-1')
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('getClassroomSubjectContext', () => {
    it('returns workspace context with counts through policy', async () => {
      vi.spyOn(teacherSubjectPolicy, 'requireAssignedSubject').mockResolvedValue({
        classroomSubjectId: 'cs-1',
        classroomId: 'cls-1',
        classroomName: '11A1',
        classroomStatus: 'ACTIVE',
        academicYear: '2026-2027',
        gradeLevel: 11,
        subjectId: 'sub-1',
        subjectName: 'Lịch sử',
        teacherId: 'teacher-1',
      });

      vi.spyOn(workspaceRepository, 'findClassroomSubjectWorkspace').mockResolvedValue({
        _count: { lessons: 5, activities: 2 },
        classroom: {
          enrollments: [
            { student_id: 'student-1', left_at: null },
            { student_id: 'student-2', left_at: null },
          ],
        },
      } as any);

      const ctx = await workspaceService.getClassroomSubjectContext('cs-1', 'teacher-1');
      expect(ctx.classroomSubjectId).toBe('cs-1');
      expect(ctx.lessonCount).toBe(5);
      expect(ctx.activityCount).toBe(2);
      expect(ctx.studentCount).toBe(2);
      expect(ctx.readOnly).toBe(false);
    });
  });

  describe('getClassroomSubjectStudents', () => {
    it('returns historical roster rows for archived classrooms', async () => {
      vi.spyOn(teacherSubjectPolicy, 'requireAssignedSubject').mockResolvedValue({
        classroomSubjectId: 'cs-archived',
        classroomId: 'cls-archived',
        classroomName: '10A1',
        classroomStatus: 'ARCHIVED',
        academicYear: '2025-2026',
        gradeLevel: 10,
        subjectId: 'sub-history',
        subjectName: 'Lịch sử',
        teacherId: 'teacher-1',
      });
      vi.spyOn(workspaceRepository, 'findClassroomStudents').mockResolvedValue([
        {
          joined_at: new Date('2025-09-01'),
          left_at: new Date('2026-08-01'),
          student: {
            id: 'student-1',
            full_name: 'Nguyễn Văn A',
            username: 'nguyenvana',
            contact: null,
            created_at: new Date('2025-01-01'),
          },
        },
      ] as any);

      const students = await workspaceService.getClassroomSubjectStudents('cs-archived', 'teacher-1');

      expect(workspaceRepository.findClassroomStudents).toHaveBeenCalledWith('cls-archived', true);
      expect(students[0].leftAt).toBe('2026-08-01T00:00:00.000Z');
    });
  });
});
