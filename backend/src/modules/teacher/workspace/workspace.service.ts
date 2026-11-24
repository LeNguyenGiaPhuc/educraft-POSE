import { NotFoundError } from '../../../shared/errors/app-error.js';
import { env } from '../../../config/env.js';
import { normalizeAcademicYear } from '../../../shared/academic-year.js';
import { requireAssignedSubject } from '../access/teacher-subject.policy.js';
import { workspaceRepository } from './workspace.repository.js';

type EnrollmentCountRow = {
  student_id: string;
  left_at: Date | null;
};

function countStudents(enrollments: EnrollmentCountRow[], status: 'ACTIVE' | 'ARCHIVED'): number {
  const studentIds = new Set<string>();

  for (const enrollment of enrollments) {
    if (status === 'ACTIVE' && enrollment.left_at !== null) {
      continue;
    }

    studentIds.add(enrollment.student_id);
  }

  return studentIds.size;
}

export const workspaceService = {
  async listAssignedClassrooms(teacherId: string) {
    const classrooms = await workspaceRepository.findAssignedClassrooms(teacherId);

    return classrooms.map((c) => ({
      id: c.id,
      name: c.name,
      academicYear: c.academic_year,
      gradeLevel: c.grade_level,
      status: c.status,
      readOnly: c.status === 'ARCHIVED',
      promptTopicsEligible: c.status === 'ACTIVE' && normalizeAcademicYear(c.academic_year) === env.CURRENT_ACADEMIC_YEAR,
      studentCount: countStudents(c.enrollments, c.status),
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

    const visibleEnrollments = classroom.enrollments.filter(
      (enrollment) => classroom.status === 'ARCHIVED' || enrollment.left_at === null
    );

    return {
      id: classroom.id,
      name: classroom.name,
      academicYear: classroom.academic_year,
      gradeLevel: classroom.grade_level,
      status: classroom.status,
      readOnly: classroom.status === 'ARCHIVED',
      students: visibleEnrollments.map((enr) => ({
        id: enr.student.id,
        name: enr.student.full_name,
        username: enr.student.username,
        contact: enr.student.contact,
        joinedAt: enr.joined_at?.toISOString() ?? null,
        leftAt: enr.left_at?.toISOString() ?? null,
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
      readOnly: policyCtx.classroomStatus === 'ARCHIVED',
      promptTopicsEligible: policyCtx.classroomStatus === 'ACTIVE' && normalizeAcademicYear(policyCtx.academicYear) === env.CURRENT_ACADEMIC_YEAR,
      lessonCount: workspaceData?._count.lessons ?? 0,
      activityCount: workspaceData?._count.activities ?? 0,
      studentCount: workspaceData
        ? countStudents(workspaceData.classroom.enrollments, policyCtx.classroomStatus)
        : 0,
    };
  },

  async getClassroomSubjectStudents(classroomSubjectId: string, teacherId: string) {
    const policyCtx = await requireAssignedSubject(teacherId, classroomSubjectId, {
      allowArchived: true,
    });

    const enrollments = await workspaceRepository.findClassroomStudents(
      policyCtx.classroomId,
      policyCtx.classroomStatus === 'ARCHIVED'
    );

    return enrollments.map((e) => ({
      id: e.student.id,
      name: e.student.full_name,
      username: e.student.username,
      contact: e.student.contact,
      joinedAt: e.joined_at.toISOString(),
      leftAt: e.left_at?.toISOString() ?? null,
    }));
  },
};
