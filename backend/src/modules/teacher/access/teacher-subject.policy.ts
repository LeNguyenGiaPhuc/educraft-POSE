import type { Prisma } from '@prisma/client';
import { prisma } from '../../../lib/prisma.js';
import { ForbiddenError, NotFoundError, BadRequestError } from '../../../shared/errors/app-error.js';

export interface AssignedSubjectContext {
  classroomSubjectId: string;
  classroomId: string;
  classroomName: string;
  classroomStatus: 'ACTIVE' | 'ARCHIVED';
  academicYear: string;
  gradeLevel: number;
  subjectId: string;
  subjectName: string;
  teacherId: string;
}

export interface RequireAssignedSubjectOptions {
  allowArchived?: boolean;
}

export async function requireAssignedSubject(
  actorId: string,
  classroomSubjectId: string,
  options: RequireAssignedSubjectOptions = { allowArchived: true },
  client: Pick<Prisma.TransactionClient, 'classroomSubject'> = prisma
): Promise<AssignedSubjectContext> {
  const cs = await client.classroomSubject.findUnique({
    where: { id: classroomSubjectId },
    include: {
      classroom: true,
      subject: true,
      teacher: true,
    },
  });

  if (!cs) {
    throw new NotFoundError('Không tìm thấy môn học của lớp');
  }

  if (cs.teacher_id !== actorId) {
    throw new ForbiddenError('Bạn không được phân công giảng dạy môn học này');
  }

  if (cs.teacher?.status !== 'ACTIVE') {
    throw new ForbiddenError('Tài khoản giáo viên đang bị khóa hoặc không hoạt động');
  }

  if (options.allowArchived === false && cs.classroom.status === 'ARCHIVED') {
    throw new BadRequestError('Không thể thực hiện thao tác này trên lớp học đã lưu trữ');
  }

  return {
    classroomSubjectId: cs.id,
    classroomId: cs.classroom.id,
    classroomName: cs.classroom.name,
    classroomStatus: cs.classroom.status,
    academicYear: cs.classroom.academic_year,
    gradeLevel: cs.classroom.grade_level,
    subjectId: cs.subject.id,
    subjectName: cs.subject.name,
    teacherId: cs.teacher_id,
  };
}

export async function requireAssignedSubjectForMutation(
  tx: Prisma.TransactionClient,
  actorId: string,
  classroomSubjectId: string
): Promise<AssignedSubjectContext> {
  const subjectLink = await tx.classroomSubject.findUnique({
    where: { id: classroomSubjectId },
    select: { classroom_id: true },
  });

  if (!subjectLink) {
    throw new NotFoundError('Không tìm thấy môn học của lớp');
  }

  // This order matches Admin assignment writes and prevents reassignment races.
  await tx.$queryRaw`SELECT id FROM classrooms WHERE id = ${subjectLink.classroom_id}::uuid FOR UPDATE`;
  await tx.$queryRaw`SELECT id FROM users WHERE id = ${actorId}::uuid FOR UPDATE`;

  return requireAssignedSubject(actorId, classroomSubjectId, { allowArchived: false }, tx);
}
