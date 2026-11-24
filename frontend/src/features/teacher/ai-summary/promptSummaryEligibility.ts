import type { TeacherClassroomSummary } from '../../../lib/api/teacher/types'

export function getPromptEligibleClassrooms(classrooms: TeacherClassroomSummary[]): TeacherClassroomSummary[] {
  return classrooms.filter((classroom) => classroom.promptTopicsEligible)
}
