import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../../../../../../backend/src/lib/prisma.js';
import { activityRepository } from '../../../../../../backend/src/modules/teacher/activities/activity.repository.js';
import * as teacherSubjectPolicy from '../../../../../../backend/src/modules/teacher/access/teacher-subject.policy.js';

describe('activityRepository.deleteActivityAtomically', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('deletes linked calendar events instead of keeping orphaned events', async () => {
    const scheduleEventDeleteMany = vi.fn().mockResolvedValue({ count: 1 });
    const tx = {
      activity: {
        findUnique: vi.fn().mockResolvedValue({ id: 'activity-1', classroom_subject_id: 'subject-1' }),
        delete: vi.fn().mockResolvedValue({}),
      },
      $queryRaw: vi.fn().mockResolvedValue([]),
      exerciseSubmission: { count: vi.fn().mockResolvedValue(0) },
      scheduleEvent: {
        findMany: vi.fn().mockResolvedValue([{ id: 'event-1' }]),
        deleteMany: scheduleEventDeleteMany,
        updateMany: vi.fn(),
      },
      questionCitation: { deleteMany: vi.fn().mockResolvedValue({}) },
      question: { deleteMany: vi.fn().mockResolvedValue({}) },
      exerciseActivityLesson: { deleteMany: vi.fn().mockResolvedValue({}) },
      notification: { deleteMany: vi.fn().mockResolvedValue({}) },
      exerciseActivity: { delete: vi.fn().mockResolvedValue({}) },
    };

    vi.spyOn(teacherSubjectPolicy, 'requireAssignedSubjectForMutation').mockResolvedValue({} as never);
    vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => callback(tx));

    await activityRepository.deleteActivityAtomically('teacher-1', 'activity-1');

    expect(scheduleEventDeleteMany).toHaveBeenCalledWith({ where: { id: { in: ['event-1'] } } });
    expect(tx.scheduleEvent.updateMany).not.toHaveBeenCalled();
  });
});
