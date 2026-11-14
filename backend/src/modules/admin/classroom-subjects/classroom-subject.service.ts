import { NotFoundError } from '../../../shared/errors/app-error.js';
import { classroomSubjectRepository } from './classroom-subject.repository.js';
import type { AssignTeacherInput } from './classroom-subject.schemas.js';

export const classroomSubjectService = {
  async listEligibleTeachers(classroomId: string, subjectId: string) {
    const classroom = await classroomSubjectRepository.findClassroomById(classroomId);
    if (!classroom) {
      throw new NotFoundError('Không tìm thấy lớp học');
    }

    const classroomSubject = await classroomSubjectRepository.findClassroomSubject(
      classroomId,
      subjectId
    );
    if (!classroomSubject) {
      throw new NotFoundError('Không tìm thấy môn học trong lớp này');
    }

    const teachers = await classroomSubjectRepository.findEligibleTeachers(subjectId);
    return teachers.map((t) => ({
      id: t.id,
      username: t.username,
      fullName: t.full_name,
      contact: t.contact,
      qualification: t.teacherProfile?.qualification ?? '',
    }));
  },

  async assignTeacher(classroomId: string, subjectId: string, input: AssignTeacherInput) {
    const updated = await classroomSubjectRepository.assignTeacherAtomically(
      classroomId,
      subjectId,
      input.teacherId
    );

    return {
      id: updated.id,
      classroomId: updated.classroom_id,
      subjectId: updated.subject_id,
      teacherId: updated.teacher_id,
      teacher: updated.teacher
        ? {
            id: updated.teacher.id,
            fullName: updated.teacher.full_name,
            username: updated.teacher.username,
          }
        : null,
    };
  },
};
