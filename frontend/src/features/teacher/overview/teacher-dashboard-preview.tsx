import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router'
import '../../../index.css'
import '../../../design-system/foundation.css'
import './teacher-dashboard.css'
import {
  TeacherDashboardContent,
  TeacherDashboardError,
  TeacherDashboardLoading,
} from './TeacherDashboardView'

type PreviewState = 'positive' | 'large' | 'zero' | 'loading' | 'error'

const state = new URLSearchParams(window.location.search).get('state') as PreviewState | null

export function Preview() {
  const selectedState: PreviewState = state ?? 'positive'
  const summary = selectedState === 'zero'
    ? { classrooms: { active: 0, archived: 0 }, openActivities: 0, pendingNotebookReviews: 0, upcomingEvents: 0 }
    : selectedState === 'large'
      ? { classrooms: { active: 128, archived: 34 }, openActivities: 256, pendingNotebookReviews: 1024, upcomingEvents: 99 }
      : { classrooms: { active: 8, archived: 3 }, openActivities: 6, pendingNotebookReviews: 4, upcomingEvents: 2 }
  const content = selectedState === 'loading'
    ? <TeacherDashboardLoading />
    : selectedState === 'error'
      ? <TeacherDashboardError message="Không thể kết nối tới máy chủ. Vui lòng thử lại." onRetry={() => undefined} />
      : <TeacherDashboardContent summary={summary} />

  return (
    <div className="role-teacher td-state-preview">
      <p className="td-state-preview-label">Development fixture · {selectedState}</p>
      <MemoryRouter>{content}</MemoryRouter>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Preview />
  </StrictMode>,
)
