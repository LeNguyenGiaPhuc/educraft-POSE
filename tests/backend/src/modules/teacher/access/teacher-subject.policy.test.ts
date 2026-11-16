import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requireAssignedSubject } from '../../../../../../backend/src/modules/teacher/access/teacher-subject.policy.js';
import { prisma } from '../../../../../../backend/src/lib/prisma.js';
import { ForbiddenError, NotFoundError, BadRequestError } from '../../../../../../backend/src/shared/errors/app-error.js';

describe('TeacherSubjectPolicy', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockContext = {
    id: 'cs-history-11a1',
    classroom_id: 'cls-11a1',
    subject_id: 'sub-history',
    teacher_id: 'teacher-1',
    classroom: {
      id: 'cls-11a1',
      name: '11A1',
      status: 'ACTIVE' as const,
      academic_year: '2026-2027',
      grade_level: 11,
    },
    subject: {
      id: 'sub-history',
      name: 'Lịch sử',
      is_active: true,
    },
    teacher: {
      id: 'teacher-1',
      role: 'TEACHER' as const,
      status: 'ACTIVE' as const,
    },
  };

  it('authorizes currently assigned active teacher for active classroom', async () => {
    vi.spyOn(prisma.classroomSubject, 'findUnique').mockResolvedValue(mockContext as any);

    const ctx = await requireAssignedSubject('teacher-1', 'cs-history-11a1');
    expect(ctx.classroomSubjectId).toBe('cs-history-11a1');
    expect(ctx.classroomName).toBe('11A1');
    expect(ctx.subjectName).toBe('Lịch sử');
    expect(ctx.teacherId).toBe('teacher-1');
  });

  it('rejects if teacher is no longer assigned (reassignment check)', async () => {
    vi.spyOn(prisma.classroomSubject, 'findUnique').mockResolvedValue({
      ...mockContext,
      teacher_id: 'new-teacher-2', // reassigned!
    } as any);

    await expect(requireAssignedSubject('teacher-1', 'cs-history-11a1')).rejects.toThrow(
      ForbiddenError
    );
  });

  it('rejects if teacher account is INACTIVE', async () => {
    vi.spyOn(prisma.classroomSubject, 'findUnique').mockResolvedValue({
      ...mockContext,
      teacher: {
        ...mockContext.teacher,
        status: 'INACTIVE',
      },
    } as any);

    await expect(requireAssignedSubject('teacher-1', 'cs-history-11a1')).rejects.toThrow(
      ForbiddenError
    );
  });

  it('rejects if classroomSubject is not found', async () => {
    vi.spyOn(prisma.classroomSubject, 'findUnique').mockResolvedValue(null);

    await expect(requireAssignedSubject('teacher-1', 'cs-nonexistent')).rejects.toThrow(
      NotFoundError
    );
  });

  it('allows reading archived class when allowArchived: true', async () => {
    vi.spyOn(prisma.classroomSubject, 'findUnique').mockResolvedValue({
      ...mockContext,
      classroom: {
        ...mockContext.classroom,
        status: 'ARCHIVED',
      },
    } as any);

    const ctx = await requireAssignedSubject('teacher-1', 'cs-history-11a1', {
      allowArchived: true,
    });
    expect(ctx.classroomStatus).toBe('ARCHIVED');
  });

  it('rejects mutation on archived class when allowArchived: false', async () => {
    vi.spyOn(prisma.classroomSubject, 'findUnique').mockResolvedValue({
      ...mockContext,
      classroom: {
        ...mockContext.classroom,
        status: 'ARCHIVED',
      },
    } as any);

    await expect(
      requireAssignedSubject('teacher-1', 'cs-history-11a1', { allowArchived: false })
    ).rejects.toThrow(BadRequestError);
  });
});
