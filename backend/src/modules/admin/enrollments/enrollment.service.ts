import type { PaginationParams } from '../../../shared/pagination/pagination.dto.js';
import { enrollmentRepository } from './enrollment.repository.js';
import type { EnrollStudentInput, TransferStudentInput } from './enrollment.schemas.js';

export const enrollmentService = {
  async listUnassignedStudents(params: PaginationParams) {
    return enrollmentRepository.listUnassignedStudents(params);
  },

  async enrollStudent(classroomId: string, input: EnrollStudentInput) {
    const created = await enrollmentRepository.enrollStudentAtomically(
      classroomId,
      input.studentId
    );

    return {
      id: created.id,
      studentId: created.student_id,
      classroomId: created.classroom_id,
      joinedAt: created.joined_at.toISOString(),
      leftAt: created.left_at ? created.left_at.toISOString() : null,
      student: {
        id: created.student.id,
        fullName: created.student.full_name,
        username: created.student.username,
      },
    };
  },

  async transferStudent(studentId: string, input: TransferStudentInput) {
    const transferred = await enrollmentRepository.transferStudentAtomically(
      studentId,
      input.targetClassroomId
    );

    return {
      studentId,
      previousClassroomId: transferred.previousClassroomId,
      newClassroomId: transferred.newClassroomId,
      transferredAt: transferred.transferredAt.toISOString(),
    };
  },
};
