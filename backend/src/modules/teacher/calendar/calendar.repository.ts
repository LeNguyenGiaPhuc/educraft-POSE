import { prisma } from '../../../lib/prisma.js';
import { BadRequestError, NotFoundError } from '../../../shared/errors/app-error.js';
import { requireAssignedSubjectForMutation } from '../access/teacher-subject.policy.js';
import type { CreateCalendarEventInput, UpdateCalendarEventInput } from './calendar.schemas.js';

export const calendarRepository = {
  async findEvents(params: {
    teacherId: string;
    from: Date;
    to: Date;
    classroomId?: string;
  }) {
    const where: any = {
      starts_at: {
        gte: params.from,
        lte: params.to,
      },
      classroomSubject: {
        teacher_id: params.teacherId,
      },
    };

    if (params.classroomId) {
      where.classroomSubject.classroom_id = params.classroomId;
    }

    return prisma.scheduleEvent.findMany({
      where,
      orderBy: { starts_at: 'asc' },
      include: {
        classroomSubject: {
          include: {
            classroom: true,
            subject: true,
          },
        },
        lesson: {
          select: {
            id: true,
            title: true,
          },
        },
        activity: {
          select: {
            id: true,
            title: true,
            kind: true,
          },
        },
      },
    });
  },

  async findEventById(eventId: string) {
    return prisma.scheduleEvent.findUnique({
      where: { id: eventId },
      include: {
        classroomSubject: {
          include: {
            classroom: true,
            subject: true,
          },
        },
        lesson: {
          select: {
            id: true,
            title: true,
          },
        },
        activity: {
          select: {
            id: true,
            title: true,
            kind: true,
          },
        },
      },
    });
  },

  async createEventAtomically(
    actorId: string,
    classroomSubjectId: string,
    input: CreateCalendarEventInput
  ) {
    return prisma.$transaction(async (tx) => {
      // 1. Authoritative mutation authorization check inside transaction
      await requireAssignedSubjectForMutation(tx, actorId, classroomSubjectId);

      // 2. Validate exclusive linkage
      if (input.lessonId && input.activityId) {
        throw new BadRequestError('Sự kiện chỉ có thể liên kết với một bài học hoặc một hoạt động');
      }

      // 3. Validate lesson link scope if supplied
      if (input.lessonId) {
        const lesson = await tx.lesson.findUnique({
          where: { id: input.lessonId },
        });
        if (!lesson || lesson.classroom_subject_id !== classroomSubjectId) {
          throw new BadRequestError('Bài học liên kết không thuộc môn học của lớp này');
        }
      }

      // 4. Validate activity link scope if supplied
      if (input.activityId) {
        const activity = await tx.activity.findUnique({
          where: { id: input.activityId },
        });
        if (!activity || activity.classroom_subject_id !== classroomSubjectId) {
          throw new BadRequestError('Hoạt động liên kết không thuộc môn học của lớp này');
        }
      }

      // 5. Create schedule event in DRAFT state (published_at is null)
      return tx.scheduleEvent.create({
        data: {
          classroom_subject_id: classroomSubjectId,
          created_by_id: actorId,
          title: input.title,
          details: input.details,
          event_type: input.eventType,
          starts_at: new Date(input.startsAt),
          lesson_id: input.lessonId || null,
          activity_id: input.activityId || null,
          published_at: null,
        },
        include: {
          classroomSubject: {
            include: {
              classroom: true,
              subject: true,
            },
          },
          lesson: {
            select: {
              id: true,
              title: true,
            },
          },
          activity: {
            select: {
              id: true,
              title: true,
              kind: true,
            },
          },
        },
      });
    });
  },

  async updateEventAtomically(
    actorId: string,
    eventId: string,
    input: UpdateCalendarEventInput
  ) {
    return prisma.$transaction(async (tx) => {
      // 1. Find event
      const existing = await tx.scheduleEvent.findUnique({
        where: { id: eventId },
      });

      if (!existing) {
        throw new NotFoundError('Không tìm thấy sự kiện lịch');
      }

      // 2. Authoritative check
      await requireAssignedSubjectForMutation(tx, actorId, existing.classroom_subject_id);

      // 3. Determine target lessonId & activityId
      const targetLessonId = input.lessonId !== undefined ? input.lessonId : existing.lesson_id;
      const targetActivityId = input.activityId !== undefined ? input.activityId : existing.activity_id;

      if (targetLessonId && targetActivityId) {
        throw new BadRequestError('Sự kiện chỉ có thể liên kết với một bài học hoặc một hoạt động');
      }

      // 4. Validate scope
      if (targetLessonId && targetLessonId !== existing.lesson_id) {
        const lesson = await tx.lesson.findUnique({
          where: { id: targetLessonId },
        });
        if (!lesson || lesson.classroom_subject_id !== existing.classroom_subject_id) {
          throw new BadRequestError('Bài học liên kết không thuộc môn học của lớp này');
        }
      }

      if (targetActivityId && targetActivityId !== existing.activity_id) {
        const activity = await tx.activity.findUnique({
          where: { id: targetActivityId },
        });
        if (!activity || activity.classroom_subject_id !== existing.classroom_subject_id) {
          throw new BadRequestError('Hoạt động liên kết không thuộc môn học của lớp này');
        }
      }

      // 5. Update event
      return tx.scheduleEvent.update({
        where: { id: eventId },
        data: {
          title: input.title !== undefined ? input.title : existing.title,
          details: input.details !== undefined ? input.details : existing.details,
          event_type: input.eventType !== undefined ? input.eventType : existing.event_type,
          starts_at: input.startsAt !== undefined ? new Date(input.startsAt) : existing.starts_at,
          lesson_id: targetLessonId,
          activity_id: targetActivityId,
        },
        include: {
          classroomSubject: {
            include: {
              classroom: true,
              subject: true,
            },
          },
          lesson: {
            select: {
              id: true,
              title: true,
            },
          },
          activity: {
            select: {
              id: true,
              title: true,
              kind: true,
            },
          },
        },
      });
    });
  },

  async publishEventAtomically(actorId: string, eventId: string) {
    return prisma.$transaction(async (tx) => {
      // 1. Find event
      const existing = await tx.scheduleEvent.findUnique({
        where: { id: eventId },
        include: {
          classroomSubject: true,
        },
      });

      if (!existing) {
        throw new NotFoundError('Không tìm thấy sự kiện lịch');
      }

      // 2. Authoritative check
      const context = await requireAssignedSubjectForMutation(
        tx,
        actorId,
        existing.classroom_subject_id
      );

      // 3. Mark published
      const now = new Date();
      const updated = await tx.scheduleEvent.update({
        where: { id: eventId },
        data: {
          published_at: existing.published_at ?? now,
        },
        include: {
          classroomSubject: {
            include: {
              classroom: true,
              subject: true,
            },
          },
          lesson: {
            select: {
              id: true,
              title: true,
            },
          },
          activity: {
            select: {
              id: true,
              title: true,
              kind: true,
            },
          },
        },
      });

      // 4. Idempotent notification creation for active students in the classroom
      const activeEnrollments = await tx.classroomEnrollment.findMany({
        where: {
          classroom_id: context.classroomId,
          left_at: null,
        },
        select: { student_id: true },
      });

      // Proposed dedupe key:
      // event linked to activity: 'activity:<activityId>'
      // independent or lesson-linked event: 'event:<eventId>'
      const dedupeKey = existing.activity_id
        ? `activity:${existing.activity_id}`
        : `event:${existing.id}`;

      const notifTitle = `Lịch học: ${existing.title}`;
      const notifBody = `Sự kiện "${existing.title}" môn ${context.subjectName} đã được công bố cho ngày ${existing.starts_at.toLocaleDateString('vi-VN')}.`;

      if (activeEnrollments.length > 0) {
        await tx.notification.createMany({
          data: activeEnrollments.map((enr) => ({
            recipient_id: enr.student_id,
            schedule_event_id: existing.id,
            activity_id: null,
            dedupe_key: dedupeKey,
            title: notifTitle,
            body: notifBody,
          })),
          skipDuplicates: true,
        });
      }

      return updated;
    });
  },

  async deleteEventAtomically(actorId: string, eventId: string) {
    return prisma.$transaction(async (tx) => {
      // 1. Find event
      const existing = await tx.scheduleEvent.findUnique({
        where: { id: eventId },
      });

      if (!existing) {
        throw new NotFoundError('Không tìm thấy sự kiện lịch');
      }

      // 2. Authoritative check
      await requireAssignedSubjectForMutation(tx, actorId, existing.classroom_subject_id);

      // 3. Delete notifications owned by this event (does NOT touch lesson or activity)
      await tx.notification.deleteMany({
        where: { schedule_event_id: eventId },
      });

      // 4. Delete the schedule event itself
      await tx.scheduleEvent.delete({
        where: { id: eventId },
      });

      return { success: true };
    });
  },
};
