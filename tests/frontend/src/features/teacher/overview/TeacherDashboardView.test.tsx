import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import {
  TeacherDashboardContent,
  TeacherDashboardError,
  TeacherDashboardLoading,
} from '../../../../../../frontend/src/features/teacher/overview/TeacherDashboardView'

function renderDashboard(summary = {
  classrooms: { active: 4, archived: 1 },
  openActivities: 6,
  pendingNotebookReviews: 8,
  upcomingEvents: 2,
}) {
  return renderToStaticMarkup(
    <MemoryRouter><TeacherDashboardContent summary={summary} /></MemoryRouter>,
  )
}

describe('Teacher Dashboard presentation', () => {
  it('maps every API metric to its exact dashboard region and supported route', () => {
    const html = renderDashboard()

    expect(html).toContain('Công việc cần xử lý')
    expect(html).toContain('data-dashboard-metric="pending-notebook-reviews"')
    expect(html).toContain('>8<')
    expect(html).toContain('data-dashboard-metric="classrooms"')
    expect(html).toContain('>4<')
    expect(html).toContain('1 lớp lưu trữ')
    expect(html).toContain('data-dashboard-metric="open-activities"')
    expect(html).toContain('>6<')
    expect(html).toContain('data-dashboard-metric="upcoming-events"')
    expect(html).toContain('>2<')
    expect(html).toContain('href="/teacher/classes"')
    expect(html).toContain('href="/teacher/calendar"')
    expect(html).toContain('Các hoạt động hiện đang mở trong lớp được phân công.')
    expect(html).not.toContain('Quiz, tự luận và kiểm tra vở đã công bố.')
  })

  it('keeps zero counts as valid data with neutral notebook copy', () => {
    const html = renderDashboard({
      classrooms: { active: 0, archived: 0 },
      openActivities: 0,
      pendingNotebookReviews: 0,
      upcomingEvents: 0,
    })

    expect(html).toContain('>0<')
    expect(html).toContain('Không có bài kiểm tra vở nào đang chờ đánh giá.')
    expect(html).not.toContain('Đang tải')
    expect(html).not.toContain('Không thể tải')
  })

  it('renders a geometry-preserving loading state without fake counts', () => {
    const html = renderToStaticMarkup(<TeacherDashboardLoading />)

    expect(html).toContain('aria-busy="true"')
    expect(html).toContain('class="td-skeleton')
    expect(html).not.toMatch(/>0<|>00</)
  })

  it('keeps large API counts intact without formatting or truncating them', () => {
    const html = renderDashboard({
      classrooms: { active: 128, archived: 34 },
      openActivities: 256,
      pendingNotebookReviews: 1024,
      upcomingEvents: 99,
    })

    expect(html).toContain('>1024<')
    expect(html).toContain('>128<')
    expect(html).toContain('34 lớp lưu trữ')
    expect(html).toContain('>256<')
    expect(html).toContain('>99<')
  })

  it('renders an alert and a real retry button for API errors', () => {
    const retry = vi.fn()
    const html = renderToStaticMarkup(<TeacherDashboardError message="Mất kết nối" onRetry={retry} />)

    expect(html).toContain('role="alert"')
    expect(html).toContain('Mất kết nối')
    expect(html).toContain('<button type="button"')
    expect(html).toContain('Thử lại')
    expect(html).not.toContain('data-dashboard-metric')
  })
})
