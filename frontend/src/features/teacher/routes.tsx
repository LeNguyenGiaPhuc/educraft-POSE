// Route elements are shared with the role shell.
/* oxlint-disable react/only-export-components */
import { type ReactNode } from 'react'
import { Navigate, Route, useLocation, useParams } from 'react-router'
import { assignedSubjects, getTeacherSubjectContext } from './demo/teacherDemoData'
import { getWorkspaceTabFromSection, teacherSubjectPath, type TeacherWorkspaceTab } from './navigation'
import { TeacherBackButton } from './components/TeacherBackButton'
import { ActivitiesPage } from './activities/ActivitiesPage'
import { PromptSummaryPage } from './ai-summary/PromptSummaryPage'
import { AssignedClassesPage } from './classes/AssignedClassesPage'
import { TeacherClassroomDetailPage } from './classes/TeacherClassroomDetailPage'
import { TeacherSubjectWorkspace } from './classes/TeacherSubjectWorkspace'
import { TeacherLessonPage } from './lessons/TeacherLessonPage'
import { SchedulePage } from './schedule/SchedulePage'
import { StudentDetailPage } from './students/StudentDetailPage'
import { teacherWorkspacePath } from '../../lib/api/teacher/workspace'

export function TeacherContextRoute({ children, tab = 'lessons' }: { children: ReactNode; tab?: TeacherWorkspaceTab }) {
  const { classroomId, classroomSubjectId, lessonId, activityId, studentId } = useParams()
  if (!classroomId || !classroomSubjectId) return <Navigate to="/teacher/classes" replace />
  const parent = `${teacherWorkspacePath(classroomId, classroomSubjectId)}?tab=${tab}`
  void lessonId
  void activityId
  void studentId
  return <>{!lessonId && !activityId && <TeacherBackButton fallbackTo={studentId ? parent : '/teacher/classes'} />}{children}</>
}

function TeacherWorkspaceRoute() {
  const { classroomSubjectId } = useParams()
  return <TeacherContextRoute><TeacherSubjectWorkspace key={classroomSubjectId} /></TeacherContextRoute>
}

function TeacherClassRoute() {
  const { classroomId } = useParams()
  if (!classroomId) return <Navigate to="/teacher/classes" replace />
  return <TeacherClassroomDetailPage classroomId={classroomId} />
}

function LegacyTeacherRedirect({ section }: { section: string }) {
  const location = useLocation()
  const query = new URLSearchParams(location.search)
  const requested = query.get('classroomSubjectId')
  const context = getTeacherSubjectContext(requested ?? assignedSubjects[0]?.id)
  if (requested && !context) return <Navigate to="/teacher/classes" replace />
  if (section === 'schedule') return <Navigate to={`/teacher/calendar${location.search}`} replace />
  if (!context) return <Navigate to="/teacher/classes" replace />
  const tab: TeacherWorkspaceTab = getWorkspaceTabFromSection(section)
  query.set('tab', tab)
  query.set('classroomSubjectId', context.subject.id)
  const base = teacherSubjectPath(context.subject.classroomId, context.subject.id, tab).split('?')[0]
  return <Navigate to={`${base}?${query}`} replace />
}

export const teacherRouteElements = <>
  <Route path="classes" element={<><TeacherBackButton fallbackTo="/teacher" /><AssignedClassesPage /></>} />
  <Route path="classes/:classroomId" element={<TeacherClassRoute />} />
  <Route path="classes/:classroomId/subjects/:classroomSubjectId" element={<TeacherWorkspaceRoute />} />
  <Route path="classes/:classroomId/subjects/:classroomSubjectId/lessons/:lessonId" element={<TeacherContextRoute><TeacherLessonPage /></TeacherContextRoute>} />
  <Route path="classes/:classroomId/subjects/:classroomSubjectId/activities/:activityId" element={<TeacherContextRoute tab="activities"><ActivitiesPage /></TeacherContextRoute>} />
  <Route path="classes/:classroomId/subjects/:classroomSubjectId/students/:studentId" element={<TeacherContextRoute tab="students"><StudentDetailPage /></TeacherContextRoute>} />
  <Route path="ai-summary" element={<PromptSummaryPage />} />
  <Route path="ai-summary/:studentId" element={<PromptSummaryPage />} />
  <Route path="calendar" element={<SchedulePage />} />
  {['lessons', 'activities', 'submissions', 'progress', 'statistics', 'schedule'].map((section) => <Route key={section} path={section} element={<LegacyTeacherRedirect section={section} />} />)}
  <Route path="*" element={<Navigate to="/teacher/classes" replace />} />
</>
