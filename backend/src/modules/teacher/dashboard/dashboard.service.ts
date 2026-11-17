import { prisma } from '../../../lib/prisma.js';

export const teacherDashboardService = {
  async getSummary(teacherId: string) {
    const now = new Date();
    const assignedClassrooms = {
      classroomSubjects: { some: { teacher_id: teacherId } },
    };
    const assignedSubject = {
      classroomSubject: { teacher_id: teacherId },
    };

    const [
      activeClassrooms,
      archivedClassrooms,
      openActivities,
      pendingNotebookReviews,
      upcomingEvents,
    ] = await Promise.all([
      prisma.classroom.count({ where: { status: 'ACTIVE', ...assignedClassrooms } }),
      prisma.classroom.count({ where: { status: 'ARCHIVED', ...assignedClassrooms } }),
      prisma.activity.count({ where: { status: 'PUBLISHED', ...assignedSubject } }),
      prisma.notebookSubmission.count({
        where: {
          status: { in: ['CURRENT', 'LOCKED'] },
          period: {
            activity: {
              activity: assignedSubject,
            },
          },
        },
      }),
      prisma.scheduleEvent.count({
        where: {
          starts_at: { gte: now },
          classroomSubject: { teacher_id: teacherId },
        },
      }),
    ]);

    return {
      classrooms: {
        active: activeClassrooms,
        archived: archivedClassrooms,
      },
      openActivities,
      pendingNotebookReviews,
      upcomingEvents,
    };
  },
};
