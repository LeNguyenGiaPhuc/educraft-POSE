export type TeacherWorkspaceTab = 'lessons' | 'activities' | 'submissions' | 'students' | 'statistics'

export function teacherSubjectPath(
  classroomId: string,
  classroomSubjectId: string,
  tab: TeacherWorkspaceTab = 'lessons',
): string {
  return `/teacher/classes/${classroomId}/subjects/${classroomSubjectId}?tab=${tab}`
}

export function getWorkspaceTabFromSection(section: string): TeacherWorkspaceTab {
  if (section === 'lessons') return 'lessons'
  if (section === 'statistics') return 'statistics'
  if (section === 'submissions') return 'submissions'
  if (section === 'progress' || section === 'ai-summary') return 'students'
  return 'activities'
}
