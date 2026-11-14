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
        _count: {
          select: {
            enrollments: {
              where: {
                left_at: null,
              },
            },
          },
        },
      },
      orderBy: [
        { status: 'asc' }, // ACTIVE first
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
          where: {
            left_at: null,
          },
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
            _count: {
              select: {
                enrollments: {
                  where: { left_at: null },
                },
              },
            },
          },
        },
      },
    });
  },

  async findClassroomStudents(classroomId: string) {
    return prisma.classroomEnrollment.findMany({
      where: {
        classroom_id: classroomId,
        left_at: null,
      },
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
