import { accounts, classroomSubjects, subjects, type ClassroomSubject } from '../fixtures'

export function eligibleTeachers(subjectId: string) {
  return accounts.filter((account) => account.role === 'TEACHER' && account.status === 'ACTIVE' && account.specializedSubjectId === subjectId)
}

export function validateAssignment(classroomId: string, subjectId: string, teacherId: string, existing?: ClassroomSubject): string[] {
  const errors: string[] = []
  if (!subjectId) errors.push('Hãy chọn môn học từ danh mục.')
  if (subjectId && !subjects.some((subject) => subject.id === subjectId)) errors.push('Môn học không nằm trong danh mục.')
  if (!existing && classroomSubjects.some((item) => item.classroomId === classroomId && item.subjectId === subjectId)) errors.push('Môn này đã được mở trong lớp. Hãy chọn môn khác hoặc thay giáo viên cho môn hiện có.')
  if (!teacherId) errors.push('Mỗi môn của lớp cần đúng một giáo viên phụ trách.')
  if (teacherId && !eligibleTeachers(subjectId).some((teacher) => teacher.id === teacherId)) errors.push('Giáo viên phải đang hoạt động và có chuyên môn đúng môn đã chọn.')
  return errors
}
