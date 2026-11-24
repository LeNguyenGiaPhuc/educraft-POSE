import type { Prisma } from '@prisma/client';
import { prisma } from '../../../lib/prisma.js';
import { BadRequestError, ConflictError, NotFoundError } from '../../../shared/errors/app-error.js';

async function lockClassroom(tx: Prisma.TransactionClient, classroomId: string): Promise<void> {
  await tx.$queryRaw`SELECT id FROM classrooms WHERE id = ${classroomId}::uuid FOR UPDATE`;
}

async function lockTeacher(tx: Prisma.TransactionClient, teacherId: string): Promise<void> {
  await tx.$queryRaw`SELECT id FROM users WHERE id = ${teacherId}::uuid FOR UPDATE`;
}

export const classroomSubjectRepository = {
  async findClassroomById(id: string) {
    return prisma.classroom.findUnique({
      where: { id },
    });
  },

  async findClassroomSubject(classroomId: string, subjectId: string) {
    return prisma.classroomSubject.findUnique({
      where: {
        classroom_id_subject_id: {
          classroom_id: classroomId,
          subject_id: subjectId,
        },
      },
    });
  },

  async findTeacherWithProfile(teacherId: string) {
    return prisma.user.findUnique({
      where: { id: teacherId },
      include: {
        teacherProfile: true,
      },
    });
  },

  async findEligibleTeachers(subjectId: string) {
    return prisma.user.findMany({
      where: {
        role: 'TEACHER',
        status: 'ACTIVE',
        teacherProfile: {
          specialized_subject_id: subjectId,
        },
      },
      include: {
        teacherProfile: true,
      },
      orderBy: { full_name: 'asc' },
    });
  },

  async assignTeacherAtomically(
    classroomId: string,
    subjectId: string,
    teacherId: string | null,
    expectedTeacherId?: string | null
  ) {
    return prisma.$transaction(async (tx) => {
      // Classroom is always locked first so assignment operations use one lock order.
      await lockClassroom(tx, classroomId);
      if (teacherId !== null) {
        await lockTeacher(tx, teacherId);
      }

      // 1. Authoritative classroom check inside transaction
      const classroom = await tx.classroom.findUnique({
        where: { id: classroomId },
      });

      if (!classroom) {
        throw new NotFoundError('Không tìm thấy lớp học');
      }

      if (classroom.status === 'ARCHIVED') {
        throw new BadRequestError('Không thể phân công giáo viên cho lớp học đã lưu trữ');
      }

      // 2. Authoritative classroomSubject check inside transaction
      const classroomSubject = await tx.classroomSubject.findUnique({
        where: {
          classroom_id_subject_id: {
            classroom_id: classroomId,
            subject_id: subjectId,
          },
        },
      });

      if (!classroomSubject) {
        throw new NotFoundError('Không tìm thấy môn học trong lớp này');
      }

      if (expectedTeacherId !== undefined && classroomSubject.teacher_id !== expectedTeacherId) {
        throw new ConflictError('Phân công giáo viên vừa thay đổi. Vui lòng tải lại rồi thử lại.');
      }

      // 3. If assigning teacher, verify eligibility inside transaction
      if (teacherId !== null) {
        const teacher = await tx.user.findUnique({
          where: { id: teacherId },
          include: {
            teacherProfile: true,
          },
        });

        if (!teacher) {
          throw new NotFoundError('Không tìm thấy tài khoản giáo viên');
        }

        if (teacher.role !== 'TEACHER') {
          throw new BadRequestError('Tài khoản được chọn không phải là giáo viên');
        }

        if (teacher.status !== 'ACTIVE') {
          throw new BadRequestError('Tài khoản giáo viên đang bị khóa hoặc không hoạt động');
        }

        if (teacher.teacherProfile?.specialized_subject_id !== subjectId) {
          throw new BadRequestError('Giáo viên không có chuyên môn phù hợp với môn học này');
        }
      }

      // 4. Update assignment inside transaction
      return tx.classroomSubject.update({
        where: { id: classroomSubject.id },
        data: {
          teacher_id: teacherId,
        },
        include: {
          teacher: {
            select: {
              id: true,
              full_name: true,
              username: true,
            },
          },
        },
      });
    });
  },

  async updateTeacherAssignment(classroomSubjectId: string, teacherId: string | null) {
    return prisma.classroomSubject.update({
      where: { id: classroomSubjectId },
      data: {
        teacher_id: teacherId,
      },
      include: {
        teacher: {
          select: {
            id: true,
            full_name: true,
            username: true,
          },
        },
      },
    });
  },
};
