import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '../../../../../../backend/src/lib/prisma.js'
import { calendarRepository } from '../../../../../../backend/src/modules/teacher/calendar/calendar.repository.js'
import { ConflictError } from '../../../../../../backend/src/shared/errors/app-error.js'
import * as teacherSubjectPolicy from '../../../../../../backend/src/modules/teacher/access/teacher-subject.policy.js'

describe('calendarRepository.updateEventAtomically', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('rejects a stale update when the event changed after it was loaded', async () => {
    const existingUpdatedAt = new Date('2026-11-18T10:00:00.000Z')
    const mockTx = {
      scheduleEvent: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'event-1',
          classroom_subject_id: 'cs-1',
          lesson_id: null,
          activity_id: null,
          title: 'Current title',
          details: 'Current details',
          event_type: 'LESSON',
          starts_at: new Date('2026-11-20T08:00:00.000Z'),
          updated_at: existingUpdatedAt,
        }),
        update: vi.fn(),
      },
    }

    vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => callback(mockTx))
    vi.spyOn(teacherSubjectPolicy, 'requireAssignedSubjectForMutation').mockResolvedValue({} as any)

    await expect(calendarRepository.updateEventAtomically('teacher-1', 'event-1', {
      expectedUpdatedAt: '2026-11-18T09:00:00.000Z',
      title: 'Stale title',
    })).rejects.toThrow(ConflictError)

    expect(mockTx.scheduleEvent.update).not.toHaveBeenCalled()
  })
})
