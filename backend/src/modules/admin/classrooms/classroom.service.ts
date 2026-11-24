import { NotFoundError, ConflictError, BadRequestError } from '../../../shared/errors/app-error.js';
import { classroomRepository, type ClassroomFilterParams } from './classroom.repository.js';
import type { CreateClassroomInput, UpdateClassroomInput } from './classroom.schemas.js';

export const classroomService = {
  async listClassrooms(params: ClassroomFilterParams) {
    return classroomRepository.listClassrooms(params);
  },

  async getClassroomDetail(id: string) {
    const classroom = await classroomRepository.findDetailById(id);
    if (!classroom) {
      throw new NotFoundError('Không tìm thấy lớp học');
    }

    const mapStudent = (enr: (typeof classroom.enrollments)[number]) => ({
      id: enr.student.id,
      enrollmentId: enr.id,
      fullName: enr.student.full_name,
      username: enr.student.username,
      contact: enr.student.contact,
      joinedAt: enr.joined_at.toISOString(),
      leftAt: enr.left_at ? enr.left_at.toISOString() : null,
      mustChangePassword: enr.student.must_change_password,
      passwordChangedAt: enr.student.password_changed_at
        ? enr.student.password_changed_at.toISOString()
        : null,
    });

    return {
      id: classroom.id,
      name: classroom.name,
      gradeLevel: classroom.grade_level,
      academicYear: classroom.academic_year,
      status: classroom.status,
      createdAt: classroom.created_at.toISOString(),
      updatedAt: classroom.updated_at.toISOString(),
      students: classroom.enrollments.filter((enr) => !enr.left_at).map(mapStudent),
      studentHistory: classroom.enrollments.filter((enr) => Boolean(enr.left_at)).map(mapStudent),
      subjects: classroom.classroomSubjects.map((cs) => ({
        id: cs.id,
        subjectId: cs.subject.id,
        subjectName: cs.subject.name,
        isSubjectActive: cs.subject.is_active,
        teacher: cs.teacher
          ? {
              id: cs.teacher.id,
              fullName: cs.teacher.full_name,
              username: cs.teacher.username,
              contact: cs.teacher.contact,
              qualification: cs.teacher.teacherProfile?.qualification ?? '',
            }
          : null,
        lessonCount: cs._count.lessons,
      })),
    };
  },

  async createClassroom(data: CreateClassroomInput) {
    const existing = await classroomRepository.findByNameAndAcademicYear(
      data.name,
      data.academicYear
    );
    if (existing) {
      throw new ConflictError(
        `Lớp học "${data.name}" trong năm học ${data.academicYear} đã tồn tại`
      );
    }

    try {
      const created = await classroomRepository.createClassroomWithSubjects(data);
      return {
        id: created.id,
        name: created.name,
        gradeLevel: created.grade_level,
        academicYear: created.academic_year,
        status: created.status,
        studentCount: created._count?.enrollments ?? 0,
        subjectCount: created._count?.classroomSubjects ?? 0,
        assignedTeacherCount: created.classroomSubjects?.length ?? 0,
        createdAt: created.created_at.toISOString(),
        updatedAt: created.updated_at.toISOString(),
      };
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') {
        throw new ConflictError(
          `Lớp học "${data.name}" trong năm học ${data.academicYear} đã tồn tại`
        );
      }
      throw error;
    }
  },

  async updateClassroom(id: string, data: UpdateClassroomInput) {
    const existing = await classroomRepository.findByIdRaw(id);
    if (!existing) {
      throw new NotFoundError('Không tìm thấy lớp học');
    }

    if (existing.status === 'ARCHIVED') {
      throw new BadRequestError('Không thể chỉnh sửa thông tin lớp học đã lưu trữ');
    }

    const targetName = data.name ?? existing.name;
    const targetAcademicYear = data.academicYear ?? existing.academic_year;

    if (
      targetName.toLowerCase() !== existing.name.toLowerCase() ||
      targetAcademicYear !== existing.academic_year
    ) {
      const duplicate = await classroomRepository.findByNameAndAcademicYear(
        targetName,
        targetAcademicYear
      );
      if (duplicate && duplicate.id !== id) {
        throw new ConflictError(
          `Lớp học "${targetName}" trong năm học ${targetAcademicYear} đã tồn tại`
        );
      }
    }

    try {
      const updated = await classroomRepository.updateClassroom(id, data);
      return {
        id: updated.id,
        name: updated.name,
        gradeLevel: updated.grade_level,
        academicYear: updated.academic_year,
        status: updated.status,
        createdAt: updated.created_at.toISOString(),
        updatedAt: updated.updated_at.toISOString(),
      };
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') {
        throw new ConflictError(
          `Lớp học "${targetName}" trong năm học ${targetAcademicYear} đã tồn tại`
        );
      }
      throw error;
    }
  },

  async archiveClassroom(id: string) {
    const existing = await classroomRepository.findByIdRaw(id);
    if (!existing) {
      throw new NotFoundError('Không tìm thấy lớp học');
    }

    const archived = await classroomRepository.archiveClassroom(id);
    return {
      id: archived.id,
      name: archived.name,
      gradeLevel: archived.grade_level,
      academicYear: archived.academic_year,
      status: archived.status,
      createdAt: archived.created_at.toISOString(),
      updatedAt: archived.updated_at.toISOString(),
    };
  },
};
