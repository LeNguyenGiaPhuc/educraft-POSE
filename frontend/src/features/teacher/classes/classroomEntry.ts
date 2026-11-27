import { teacherWorkspacePath } from '../../../lib/api/teacher/workspace'

type AssignedSubject = {
  id: string
  name: string
}

export type ClassroomEntryOption = {
  label: string
  path: string
}

export function classroomEntryOptions(
  classroomId: string,
  subjects: AssignedSubject[]
): ClassroomEntryOption[] {
  return subjects.map((subject) => ({
    label: subject.name,
    path: teacherWorkspacePath(classroomId, subject.id),
  }))
}
