import { ArrowRight, RotateCcw } from 'lucide-react'
import { Link } from 'react-router'
import classroomIllustration from '../../../assets/educraft/illustrations/classroom.svg'
import calendarIllustration from '../../../assets/educraft/illustrations/calendar.svg'
import notebookIllustration from '../../../assets/educraft/illustrations/notebook.svg'
import type { TeacherDashboardSummary } from '../../../lib/api/teacher/dashboard'

export function TeacherDashboardContent({ summary }: { summary: TeacherDashboardSummary }) {
  const pendingCopy = summary.pendingNotebookReviews === 0
    ? 'Không có bài kiểm tra vở nào đang chờ đánh giá.'
    : 'Bài nộp đang chờ giáo viên xem và chốt kết quả.'

  return (
    <div className="td-dashboard-content">
      <header className="td-dashboard-heading">
        <h1>Không gian giảng dạy.</h1>
        <p>Theo dõi công việc từ các lớp và môn bạn đang phụ trách.</p>
      </header>

      <section className="td-bento" aria-label="Tổng quan công việc giảng dạy">
        <article className="td-metric td-review-card ec-geometry ec-nest" data-dashboard-metric="pending-notebook-reviews">
          <div className="ec-nest-body td-review-content">
            <span className="td-card-label">Công việc cần xử lý</span>
            <strong className="td-metric-value">{summary.pendingNotebookReviews}</strong>
            <h2>Bài kiểm tra vở chờ đánh giá</h2>
            <p>{pendingCopy}</p>
            <Link className="td-card-link" to="/teacher/classes">
              Mở lớp của tôi <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
          <img className="td-review-illustration" src={notebookIllustration} alt="" />
        </article>

        <article className="td-metric td-classrooms-card" data-dashboard-metric="classrooms">
          <div className="td-card-copy">
            <span className="td-card-label">Lớp học</span>
            <strong className="td-metric-value">{summary.classrooms.active}</strong>
            <h2>Lớp đang hoạt động</h2>
            <p>{summary.classrooms.archived} lớp lưu trữ · chỉ xem</p>
          </div>
          <img src={classroomIllustration} alt="" />
          <Link className="td-card-link" to="/teacher/classes">
            Xem lớp được phân công <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </article>

        <article className="td-metric td-activities-card" data-dashboard-metric="open-activities">
          <span className="td-card-label">Hoạt động</span>
          <strong className="td-metric-value">{summary.openActivities}</strong>
          <h2>Hoạt động đang mở</h2>
          <p>Các hoạt động hiện đang mở trong lớp được phân công.</p>
        </article>

        <article className="td-metric td-events-card ec-geometry ec-ticket" data-dashboard-metric="upcoming-events">
          <div className="td-event-content">
            <span className="td-card-label">Lịch giảng dạy</span>
            <strong className="td-metric-value">{summary.upcomingEvents}</strong>
            <h2>Sự kiện sắp tới</h2>
            <p>Được tổng hợp từ lịch của các lớp và môn phụ trách.</p>
            <Link className="td-card-link" to="/teacher/calendar">
              Mở lịch <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
          <img src={calendarIllustration} alt="" />
        </article>
      </section>
    </div>
  )
}

export function TeacherDashboardLoading() {
  return (
    <div className="td-dashboard-content" aria-busy="true" aria-label="Đang tải tổng quan giáo viên">
      <div className="td-dashboard-heading td-skeleton-heading">
        <span className="td-skeleton td-skeleton-title" />
        <span className="td-skeleton td-skeleton-copy" />
      </div>
      <div className="td-bento td-loading-bento" aria-hidden="true">
        <div className="td-skeleton td-skeleton-review" />
        <div className="td-skeleton td-skeleton-card" />
        <div className="td-skeleton td-skeleton-card" />
        <div className="td-skeleton td-skeleton-event" />
      </div>
    </div>
  )
}

export function TeacherDashboardError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="td-dashboard-error" role="alert">
      <span className="td-error-symbol" aria-hidden="true">!</span>
      <div>
        <h1>Không thể tải tổng quan</h1>
        <p>{message}</p>
        <button type="button" onClick={onRetry}>
          <RotateCcw size={16} aria-hidden="true" /> Thử lại
        </button>
      </div>
    </div>
  )
}
