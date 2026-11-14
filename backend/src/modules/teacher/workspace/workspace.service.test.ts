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
          _count: { enrollments: 30 },
        } as any,
      ]);

      const list = await workspaceService.listAssignedClassrooms('teacher-1');
      expect(list).toHaveLength(1);
      expect(list[0].id).toBe('cls-1');
      expect(list[0].studentCount).toBe(30);
      expect(list[0].subjects).toHaveLength(1);
      expect(list[0].subjects[0].name).toBe('Lịch sử');
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
        classroom: { _count: { enrollments: 35 } },
      } as any);

      const ctx = await workspaceService.getClassroomSubjectContext('cs-1', 'teacher-1');
      expect(ctx.classroomSubjectId).toBe('cs-1');
      expect(ctx.lessonCount).toBe(5);
      expect(ctx.activityCount).toBe(2);
      expect(ctx.studentCount).toBe(35);
    });
  });
});
