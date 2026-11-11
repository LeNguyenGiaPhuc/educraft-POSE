// Route elements and the legacy registry are shared with the role shell.
/* oxlint-disable react/only-export-components */
import { type ComponentType, type ReactNode } from 'react'
import { Navigate, Route, useLocation, useParams } from 'react-router'
import { assignedSubjects, getTeacherSubjectContext, isTeacherPreviewItem, sampleLessons, teacherSubjectPath, type TeacherWorkspaceTab } from './fixtures'
import { assignedActivities } from './insights/fixtures'
import { TeacherBackButton } from './components/TeacherBackButton'
import { readActivityPreviews } from './activities/activities.mock'
import { ActivitiesPage } from './activities/ActivitiesPage'
import { PromptSummaryPage } from './ai-summary/PromptSummaryPage'
import { AssignedClassesPage } from './classes/AssignedClassesPage'
import { TeacherSubjectWorkspace } from './classes/TeacherSubjectWorkspace'
import { LessonsPage } from './lessons/LessonsPage'
import { ProgressPage } from './progress/ProgressPage'
import { SchedulePage } from './schedule/SchedulePage'
import { ClassStatisticsPage } from './statistics/ClassStatisticsPage'
import { SubmissionsPage } from './submissions/SubmissionsPage'
import { StudentDetailPage } from './students/StudentDetailPage'

export const teacherPages: Record<string, ComponentType> = {
  classes: AssignedClassesPage,
  lessons: LessonsPage,
  activities: ActivitiesPage,
  schedule: SchedulePage,
  statistics: ClassStatisticsPage,
  submissions: SubmissionsPage,
  progress: ProgressPage,
  'ai-summary': PromptSummaryPage,
}

export function TeacherContextRoute({ children, tab = 'lessons' }: { children: ReactNode; tab?: TeacherWorkspaceTab }) {
  const { classroomId, classroomSubjectId, lessonId, activityId, studentId } = useParams()
  const context = getTeacherSubjectContext(classroomSubjectId, classroomId)
  if (!context) return <Navigate to="/teacher/classes" replace />
  const parent = teacherSubjectPath(context.subject.id, tab)
  const invalidLesson = lessonId && lessonId !== 'new' && !isTeacherPreviewItem('lesson', lessonId, context.subject.id) && !sampleLessons.some((item) => item.id === lessonId && item.classroomSubjectId === context.subject.id)
  const invalidActivity = activityId && activityId !== 'new' && !isTeacherPreviewItem('activity', activityId, context.subject.id) && !readActivityPreviews().some((item) => item.id === activityId && item.classroomSubjectId === context.subject.id) && !assignedActivities.some((item) => item.id === activityId && item.subjectId === context.subject.id)
  const invalidStudent = studentId && !context.classroom.students.some((item) => item.id === studentId)
  if (invalidLesson || invalidActivity || invalidStudent) return <Navigate to={parent} replace />
  return <>{!lessonId && !activityId && <TeacherBackButton fallbackTo={studentId ? parent : '/teacher/classes'} />}{children}</>
}

function TeacherWorkspaceRoute() {
  return <TeacherContextRoute><TeacherSubjectWorkspace /></TeacherContextRoute>
}

function LegacyTeacherRedirect({ section }: { section: string }) {
  const location = useLocation()
  const query = new URLSearchParams(location.search)
  const requested = query.get('classroomSubjectId')
  const context = getTeacherSubjectContext(requested ?? assignedSubjects[0]?.id)
  if (requested && !context) return <Navigate to="/teacher/classes" replace />
  if (section === 'schedule') return <Navigate to={`/teacher/calendar${location.search}`} replace />
  if (!context) return <Navigate to="/teacher/classes" replace />
  const tab: TeacherWorkspaceTab = section === 'lessons' ? 'lessons' : section === 'statistics' ? 'statistics' : section === 'progress' || section === 'ai-summary' ? 'students' : 'activities'
  query.set('tab', tab)
  query.set('classroomSubjectId', context.subject.id)
  const base = teacherSubjectPath(context.subject.id, tab).split('?')[0]
  return <Navigate to={`${base}?${query}`} replace />
}

export const teacherRouteElements = <>
  <Route path="classes" element={<><TeacherBackButton fallbackTo="/teacher" /><AssignedClassesPage /></>} />
  <Route path="classes/:classroomId/subjects/:classroomSubjectId" element={<TeacherWorkspaceRoute />} />
  <Route path="classes/:classroomId/subjects/:classroomSubjectId/lessons/:lessonId" element={<TeacherContextRoute><LessonsPage /></TeacherContextRoute>} />
  <Route path="classes/:classroomId/subjects/:classroomSubjectId/activities/:activityId" element={<TeacherContextRoute tab="activities"><ActivitiesPage /></TeacherContextRoute>} />
  <Route path="classes/:classroomId/subjects/:classroomSubjectId/students/:studentId" element={<TeacherContextRoute tab="students"><StudentDetailPage /></TeacherContextRoute>} />
  <Route path="calendar" element={<SchedulePage />} />
  {['lessons', 'activities', 'submissions', 'progress', 'statistics', 'ai-summary', 'schedule'].map((section) => <Route key={section} path={section} element={<LegacyTeacherRedirect section={section} />} />)}
  <Route path="*" element={<Navigate to="/teacher/classes" replace />} />
</>
