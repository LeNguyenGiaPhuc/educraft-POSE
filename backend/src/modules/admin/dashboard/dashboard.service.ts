import { prisma } from '../../../lib/prisma.js';

export const adminDashboardService = {
  async getSummary() {
    const [
      activeTeachers,
      activeStudents,
      inactiveAccounts,
      activeClassrooms,
      archivedClassrooms,
      activeSubjects,
      inactiveSubjects,
      unassignedActiveSubjects,
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'TEACHER', status: 'ACTIVE' } }),
      prisma.user.count({ where: { role: 'STUDENT', status: 'ACTIVE' } }),
      prisma.user.count({ where: { status: 'INACTIVE' } }),
      prisma.classroom.count({ where: { status: 'ACTIVE' } }),
      prisma.classroom.count({ where: { status: 'ARCHIVED' } }),
      prisma.subject.count({ where: { is_active: true } }),
      prisma.subject.count({ where: { is_active: false } }),
      prisma.classroomSubject.count({
        where: {
          teacher_id: null,
          classroom: { status: 'ACTIVE' },
          subject: { is_active: true },
        },
      }),
    ]);

    return {
      accounts: {
        activeTeachers,
        activeStudents,
        inactiveAccounts,
      },
      classrooms: {
        active: activeClassrooms,
        archived: archivedClassrooms,
      },
      subjects: {
        active: activeSubjects,
        inactive: inactiveSubjects,
      },
      unassignedActiveSubjects,
    };
  },
};
