// Route elements are shared with the role shell.
/* oxlint-disable react/only-export-components */
import { type ReactNode } from 'react'
import { Navigate, Route, useLocation, useParams } from 'react-router'
import { getWorkspaceTabFromSection, teacherSubjectPath, type TeacherWorkspaceTab } from './navigation'
import { TeacherBackButton } from './components/TeacherBackButton'
import { ActivitiesPage } from './activities/ActivitiesPage'
import { PromptSummaryPage } from './ai-summary/PromptSummaryPage'
import { AssignedClassesPage } from './classes/AssignedClassesPage'
import { TeacherSubjectWorkspace } from './classes/TeacherSubjectWorkspace'
import { TeacherLessonPage } from './lessons/TeacherLessonPage'
import { SchedulePage } from './schedule/SchedulePage'
import { StudentDetailPage } from './students/StudentDetailPage'
import { teacherWorkspaceApi, teacherWorkspacePath } from '../../lib/api/teacher/workspace'
import type { TeacherClassroomSubjectContext } from '../../lib/api/teacher/types'
import { useEffect, useState } from 'react'
import './teacher-studio.css'

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

function LegacyTeacherRedirect({ section }: { section: string }) {
  const location = useLocation()
  const query = new URLSearchParams(location.search)
  const requested = query.get('classroomSubjectId')
  if (section === 'schedule') return <Navigate to={`/teacher/calendar${location.search}`} replace />
  if (!requested) return <Navigate to="/teacher/classes" replace />
  return <LegacyTeacherContextRedirect requestedId={requested} section={section} query={query} />
}

function LegacyTeacherContextRedirect({ requestedId, section, query }: { requestedId: string; section: string; query: URLSearchParams }) {
  const [context, setContext] = useState<TeacherClassroomSubjectContext | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    teacherWorkspaceApi.getClassroomSubject(requestedId)
      .then((nextContext) => {
        if (!cancelled) setContext(nextContext)
      })
      .catch(() => {
        if (!cancelled) setContext(null)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [requestedId])

  if (isLoading) return <div className="page-content"><p>Đang mở không gian môn học...</p></div>
  if (!context) return <Navigate to="/teacher/classes" replace />

  const tab: TeacherWorkspaceTab = getWorkspaceTabFromSection(section)
  const nextQuery = new URLSearchParams(query)
  nextQuery.set('tab', tab)
  nextQuery.set('classroomSubjectId', context.classroomSubjectId)
  const base = teacherSubjectPath(context.classroomId, context.classroomSubjectId, tab).split('?')[0]
  return <Navigate to={`${base}?${nextQuery}`} replace />
}

export const teacherRouteElements = <>
  <Route path="classes" element={<AssignedClassesPage />} />
  <Route path="classes/:classroomId" element={<Navigate to="/teacher/classes" replace />} />
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
