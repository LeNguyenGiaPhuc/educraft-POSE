import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../../../../../../backend/src/lib/prisma.js';
import { adminDashboardService } from '../../../../../../backend/src/modules/admin/dashboard/dashboard.service.js';

describe('AdminDashboardService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns live counts for the admin dashboard', async () => {
    vi.spyOn(prisma.user, 'count')
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(40)
      .mockResolvedValueOnce(2);
    vi.spyOn(prisma.classroom, 'count')
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(1);
    vi.spyOn(prisma.subject, 'count')
      .mockResolvedValueOnce(8)
      .mockResolvedValueOnce(2);
    vi.spyOn(prisma.classroomSubject, 'count').mockResolvedValueOnce(4);

    await expect(adminDashboardService.getSummary()).resolves.toEqual({
      accounts: {
        activeTeachers: 3,
        activeStudents: 40,
        inactiveAccounts: 2,
      },
      classrooms: {
        active: 5,
        archived: 1,
      },
      subjects: {
        active: 8,
        inactive: 2,
      },
      unassignedActiveSubjects: 4,
    });
  });
});
