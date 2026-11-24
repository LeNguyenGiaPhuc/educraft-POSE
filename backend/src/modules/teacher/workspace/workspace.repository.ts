import { prisma } from '../../../lib/prisma.js';

export const workspaceRepository = {
  async findAssignedClassrooms(teacherId: string) {
    return prisma.classroom.findMany({
      where: {
        classroomSubjects: {
          some: {
            teacher_id: teacherId,
          },
        },
      },
      include: {
        classroomSubjects: {
          where: {
            teacher_id: teacherId,
          },
          include: {
            subject: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        enrollments: {
          select: {
            student_id: true,
            left_at: true,
          },
        },
      },
      orderBy: [
        { status: 'asc' }, // ACTIVE first
        { academic_year: 'desc' },
        { name: 'asc' },
      ],
    });
  },

  async findAssignedClassroomDetail(classroomId: string, teacherId: string) {
    return prisma.classroom.findFirst({
      where: {
        id: classroomId,
        classroomSubjects: {
          some: {
            teacher_id: teacherId,
          },
        },
      },
      include: {
        classroomSubjects: {
          where: {
            teacher_id: teacherId,
          },
          include: {
            subject: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        enrollments: {
          orderBy: {
            joined_at: 'asc',
          },
          include: {
            student: {
              select: {
                id: true,
                full_name: true,
                username: true,
                contact: true,
              },
            },
          },
        },
      },
    });
  },

  async findClassroomSubjectWorkspace(classroomSubjectId: string) {
    return prisma.classroomSubject.findUnique({
      where: { id: classroomSubjectId },
      include: {
        _count: {
          select: {
            lessons: true,
            activities: true,
          },
        },
        classroom: {
          include: {
            enrollments: {
              select: {
                student_id: true,
                left_at: true,
              },
            },
          },
        },
      },
    });
  },

  async findClassroomStudents(classroomId: string, includeHistorical: boolean) {
    const where = includeHistorical
      ? { classroom_id: classroomId }
      : { classroom_id: classroomId, left_at: null };

    return prisma.classroomEnrollment.findMany({
      where,
      orderBy: {
        joined_at: 'asc',
      },
      include: {
        student: {
          select: {
            id: true,
            full_name: true,
            username: true,
            contact: true,
            created_at: true,
          },
        },
      },
    });
  },
};
