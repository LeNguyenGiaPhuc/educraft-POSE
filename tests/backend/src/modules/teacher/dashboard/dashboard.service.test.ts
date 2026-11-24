import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../../../../../../backend/src/lib/prisma.js';
import { teacherDashboardService } from '../../../../../../backend/src/modules/teacher/dashboard/dashboard.service.js';

describe('TeacherDashboardService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns live counts limited to the teacher assignments', async () => {
    vi.spyOn(prisma.classroom, 'count')
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1);
    vi.spyOn(prisma.activity, 'count').mockResolvedValueOnce(6);
    vi.spyOn(prisma.notebookSubmission, 'count').mockResolvedValueOnce(7);
    vi.spyOn(prisma.scheduleEvent, 'count').mockResolvedValueOnce(3);

    await expect(teacherDashboardService.getSummary('teacher-1')).resolves.toEqual({
      classrooms: {
        active: 2,
        archived: 1,
      },
      openActivities: 6,
      pendingNotebookReviews: 7,
      upcomingEvents: 3,
    });

    expect(prisma.activity.count).toHaveBeenCalledWith({
      where: {
        status: 'PUBLISHED',
        classroomSubject: { teacher_id: 'teacher-1' },
      },
    });
  });
});
