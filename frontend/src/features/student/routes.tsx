/* oxlint-disable react/only-export-components */
import type { ComponentType } from 'react'
import { Navigate, Route, useLocation } from 'react-router'
import { ActivitiesPage } from './activities/ActivitiesPage'
import { AssistantPage } from './assistant/AssistantPage'
import { CalendarPage } from './calendar/CalendarPage'
import { PracticePage } from './practice/PracticePage'
import { ProfilePage } from './profile/ProfilePage'
import { LessonPage } from './subjects/LessonPage'
import { SubjectDetailPage } from './subjects/SubjectDetailPage'
import { SubjectsPage } from './subjects/SubjectsPage'

export const studentPages: Record<string, ComponentType> = {
  subjects: SubjectsPage,
  activities: ActivitiesPage,
  practice: PracticePage,
  profile: ProfilePage,
  calendar: CalendarPage,
  assistant: AssistantPage,
}

function LegacyStudentRedirect({ to, view }: { to: string; view?: string }) {
  const location = useLocation()
  const query = new URLSearchParams(location.search)
  if (view) query.set('view', view)
  const suffix = query.size ? `?${query}` : ''
  return <Navigate to={`${to}${suffix}`} replace />
}

export const studentRouteElements = <>
  <Route path="subjects" element={<SubjectsPage />} />
  <Route path="subjects/:subjectId" element={<SubjectDetailPage />} />
  <Route path="lessons/:lessonId" element={<LessonPage />} />
  <Route path="activities" element={<ActivitiesPage />} />
  <Route path="practice" element={<PracticePage />} />
  <Route path="profile" element={<ProfilePage />} />
  <Route path="calendar" element={<CalendarPage />} />
  <Route path="assistant" element={<AssistantPage />} />
  <Route path="results" element={<LegacyStudentRedirect to="/student/activities" view="results" />} />
  <Route path="chat-history" element={<LegacyStudentRedirect to="/student/assistant" view="history" />} />
  <Route path="summary" element={<LegacyStudentRedirect to="/student/subjects/history-11a2" />} />
  <Route path="*" element={<Navigate to="/student" replace />} />
</>
