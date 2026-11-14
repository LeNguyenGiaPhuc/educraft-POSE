import type { Prisma } from '@prisma/client';
import { prisma } from '../../../lib/prisma.js';
import type { PaginationParams } from '../../../shared/pagination/pagination.dto.js';
import { BadRequestError, ConflictError, NotFoundError } from '../../../shared/errors/app-error.js';

async function lockClassroom(tx: Prisma.TransactionClient, classroomId: string): Promise<void> {
  await tx.$queryRaw`SELECT id FROM classrooms WHERE id = ${classroomId}::uuid FOR UPDATE`;
}

async function lockStudent(tx: Prisma.TransactionClient, studentId: string): Promise<void> {
  await tx.$queryRaw`SELECT id FROM users WHERE id = ${studentId}::uuid FOR UPDATE`;
}

export const enrollmentRepository = {
  async listUnassignedStudents(params: PaginationParams) {
    const where: Prisma.UserWhereInput = {
      role: 'STUDENT',
      status: 'ACTIVE',
      enrollments: {
        none: {
          left_at: null,
        },
      },
    };

    if (params.search) {
      where.OR = [
        { full_name: { contains: params.search, mode: 'insensitive' } },
        { username: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [students, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { full_name: 'asc' },
        select: {
          id: true,
          username: true,
          full_name: true,
          contact: true,
          created_at: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      items: students.map((s) => ({
        id: s.id,
        username: s.username,
        fullName: s.full_name,
        contact: s.contact,
        createdAt: s.created_at,
      })),
      total,
    };
  },

  async enrollStudentAtomically(classroomId: string, studentId: string) {
    return prisma.$transaction(async (tx) => {
      // Keep the lock order stable across enrollment operations to avoid deadlocks.
      await lockClassroom(tx, classroomId);
      await lockStudent(tx, studentId);

      // 1. Authoritative classroom check in transaction
      const classroom = await tx.classroom.findUnique({
        where: { id: classroomId },
      });

      if (!classroom) {
        throw new NotFoundError('Không tìm thấy lớp học');
      }

      if (classroom.status === 'ARCHIVED') {
        throw new BadRequestError('Không thể thêm học sinh vào lớp học đã lưu trữ');
      }

      // 2. Authoritative student check in transaction
      const student = await tx.user.findUnique({
        where: { id: studentId },
      });

      if (!student) {
        throw new NotFoundError('Không tìm thấy tài khoản học sinh');
      }

      if (student.role !== 'STUDENT') {
        throw new BadRequestError('Tài khoản được chọn không phải là học sinh');
      }

      if (student.status !== 'ACTIVE') {
        throw new BadRequestError('Tài khoản học sinh đang bị khóa hoặc không hoạt động');
      }

      // 3. Authoritative active enrollment check in transaction
      const currentEnrollment = await tx.classroomEnrollment.findFirst({
        where: {
          student_id: studentId,
          left_at: null,
        },
      });

      if (currentEnrollment) {
        throw new ConflictError(
          'Học sinh đã được phân lớp. Vui lòng sử dụng tính năng chuyển lớp nếu muốn chuyển sang lớp khác.'
        );
      }

      // 4. Create new enrollment
      try {
        return await tx.classroomEnrollment.create({
          data: {
            classroom_id: classroomId,
            student_id: studentId,
            left_at: null,
          },
          include: {
            student: {
              select: {
                id: true,
                full_name: true,
                username: true,
              },
            },
          },
        });
      } catch (err: unknown) {
        if ((err as { code?: string })?.code === 'P2002') {
          throw new ConflictError(
            'Học sinh đã được phân lớp. Vui lòng sử dụng tính năng chuyển lớp nếu muốn chuyển sang lớp khác.'
          );
        }
        throw err;
      }
    });
  },

  async transferStudentAtomically(studentId: string, targetClassroomId: string) {
    return prisma.$transaction(async (tx) => {
      // Keep the lock order stable across enrollment operations to avoid deadlocks.
      await lockClassroom(tx, targetClassroomId);
      await lockStudent(tx, studentId);

      // 1. Authoritative target classroom check in transaction
      const targetClassroom = await tx.classroom.findUnique({
        where: { id: targetClassroomId },
      });

      if (!targetClassroom) {
        throw new NotFoundError('Không tìm thấy lớp học đích');
      }

      if (targetClassroom.status === 'ARCHIVED') {
        throw new BadRequestError('Không thể chuyển học sinh vào lớp học đã lưu trữ');
      }

      // 2. Authoritative student check in transaction
      const student = await tx.user.findUnique({
        where: { id: studentId },
      });

      if (!student) {
        throw new NotFoundError('Không tìm thấy tài khoản học sinh');
      }

      if (student.role !== 'STUDENT') {
        throw new BadRequestError('Tài khoản được chọn không phải là học sinh');
      }

      if (student.status !== 'ACTIVE') {
        throw new BadRequestError('Tài khoản học sinh đang bị khóa hoặc không hoạt động');
      }

      // 3. Authoritative current enrollment check in transaction
      const currentEnrollment = await tx.classroomEnrollment.findFirst({
        where: {
          student_id: studentId,
          left_at: null,
        },
      });

      if (!currentEnrollment) {
        throw new BadRequestError(
          'Học sinh hiện chưa thuộc lớp học nào để thực hiện chuyển lớp. Hãy thêm học sinh vào lớp trước.'
        );
      }

      if (currentEnrollment.classroom_id === targetClassroomId) {
        throw new ConflictError('Học sinh đã ở trong lớp học này');
      }

      const now = new Date();

      // 4. Close old enrollment
      await tx.classroomEnrollment.update({
        where: { id: currentEnrollment.id },
        data: { left_at: now },
      });

      // 5. Create new enrollment
      try {
        await tx.classroomEnrollment.create({
          data: {
            student_id: studentId,
            classroom_id: targetClassroomId,
            joined_at: now,
            left_at: null,
          },
        });
      } catch (err: unknown) {
        if ((err as { code?: string })?.code === 'P2002') {
          throw new ConflictError('Học sinh đã có phân lớp hoạt động khác.');
        }
        throw err;
      }

      return {
        studentId,
        previousClassroomId: currentEnrollment.classroom_id,
        newClassroomId: targetClassroomId,
        transferredAt: now,
      };
    });
  },
};
