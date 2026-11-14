import { NotFoundError } from '../../../shared/errors/app-error.js';
import { requireAssignedSubject } from '../access/teacher-subject.policy.js';
import { workspaceRepository } from './workspace.repository.js';

export const workspaceService = {
  async listAssignedClassrooms(teacherId: string) {
    const classrooms = await workspaceRepository.findAssignedClassrooms(teacherId);

    return classrooms.map((c) => ({
      id: c.id,
      name: c.name,
      academicYear: c.academic_year,
      gradeLevel: c.grade_level,
      status: c.status,
      studentCount: c._count.enrollments,
      subjects: c.classroomSubjects.map((cs) => ({
        id: cs.id,
        classroomId: c.id,
        name: cs.subject.name,
        subjectId: cs.subject.id,
        teacherId: cs.teacher_id,
      })),
    }));
  },

  async getAssignedClassroomDetail(classroomId: string, teacherId: string) {
    const classroom = await workspaceRepository.findAssignedClassroomDetail(classroomId, teacherId);
    if (!classroom) {
      throw new NotFoundError('Không tìm thấy lớp học hoặc bạn không được phân công lớp này');
    }

    return {
      id: classroom.id,
      name: classroom.name,
      academicYear: classroom.academic_year,
      gradeLevel: classroom.grade_level,
      status: classroom.status,
      students: classroom.enrollments.map((enr) => ({
        id: enr.student.id,
        name: enr.student.full_name,
        username: enr.student.username,
        contact: enr.student.contact,
      })),
      subjects: classroom.classroomSubjects.map((cs) => ({
        id: cs.id,
        classroomId: classroom.id,
        name: cs.subject.name,
        subjectId: cs.subject.id,
        teacherId: cs.teacher_id,
      })),
    };
  },

  async getClassroomSubjectContext(classroomSubjectId: string, teacherId: string) {
    const policyCtx = await requireAssignedSubject(teacherId, classroomSubjectId, {
      allowArchived: true,
    });

    const workspaceData = await workspaceRepository.findClassroomSubjectWorkspace(classroomSubjectId);

    return {
      ...policyCtx,
      lessonCount: workspaceData?._count.lessons ?? 0,
      activityCount: workspaceData?._count.activities ?? 0,
      studentCount: workspaceData?.classroom._count.enrollments ?? 0,
    };
  },

  async getClassroomSubjectStudents(classroomSubjectId: string, teacherId: string) {
    const policyCtx = await requireAssignedSubject(teacherId, classroomSubjectId, {
      allowArchived: true,
    });

    const enrollments = await workspaceRepository.findClassroomStudents(policyCtx.classroomId);

    return enrollments.map((e) => ({
      id: e.student.id,
      name: e.student.full_name,
      username: e.student.username,
      contact: e.student.contact,
      joinedAt: e.joined_at.toISOString(),
    }));
  },
};
