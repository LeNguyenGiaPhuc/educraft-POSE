import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../../../../../../backend/src/lib/prisma.js';
import { notebookCheckRepository } from '../../../../../../backend/src/modules/teacher/notebook-checks/notebook-check.repository.js';
import * as teacherSubjectPolicy from '../../../../../../backend/src/modules/teacher/access/teacher-subject.policy.js';

describe('notebookCheckRepository.deleteNotebookCheckAtomically', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('deletes linked calendar events instead of keeping orphaned events', async () => {
    const scheduleEventDeleteMany = vi.fn().mockResolvedValue({ count: 1 });
    const tx = {
      activity: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'activity-1',
          kind: 'NOTEBOOK_CHECK',
          classroom_subject_id: 'subject-1',
          notebookCheck: { criteria_locked_at: null },
        }),
        delete: vi.fn().mockResolvedValue({}),
      },
      $queryRaw: vi.fn().mockResolvedValue([]),
      notebookSubmission: { count: vi.fn().mockResolvedValue(0) },
      scheduleEvent: {
        findMany: vi.fn().mockResolvedValue([{ id: 'event-1' }]),
        deleteMany: scheduleEventDeleteMany,
        updateMany: vi.fn(),
      },
      notebookReferenceFile: {
        findMany: vi.fn().mockResolvedValue([]),
        deleteMany: vi.fn().mockResolvedValue({}),
      },
      notebookCriterion: { deleteMany: vi.fn().mockResolvedValue({}) },
      notebookCheckPeriod: { deleteMany: vi.fn().mockResolvedValue({}) },
      notification: { deleteMany: vi.fn().mockResolvedValue({}) },
      notebookCheckActivity: { delete: vi.fn().mockResolvedValue({}) },
    };

    vi.spyOn(teacherSubjectPolicy, 'requireAssignedSubjectForMutation').mockResolvedValue({} as never);
    vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => callback(tx));

    await notebookCheckRepository.deleteNotebookCheckAtomically('teacher-1', 'activity-1');

    expect(scheduleEventDeleteMany).toHaveBeenCalledWith({ where: { id: { in: ['event-1'] } } });
    expect(tx.scheduleEvent.updateMany).not.toHaveBeenCalled();
  });
});
