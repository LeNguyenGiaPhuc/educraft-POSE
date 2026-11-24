import { useEffect, useState } from 'react'
import { AlertCircle, Archive, CalendarDays, ClipboardList, RotateCcw } from 'lucide-react'
import type { ReactNode } from 'react'
import { ApiError } from '../../../lib/api/client'
import { teacherDashboardApi, type TeacherDashboardSummary } from '../../../lib/api/teacher/dashboard'

function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : 'Không thể tải tổng quan giáo viên.'
}

export function TeacherOverviewPage() {
  const [summary, setSummary] = useState<TeacherDashboardSummary | null>(null)
  const [loadError, setLoadError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    teacherDashboardApi.getSummary()
      .then((data) => {
        if (!cancelled) setSummary(data)
      })
      .catch((error) => {
        if (!cancelled) setLoadError(errorMessage(error))
      })

    return () => {
      cancelled = true
    }
  }, [reloadKey])

  if (!summary && !loadError) return <div className="page-content"><p>Đang tải tổng quan...</p></div>

  if (loadError || !summary) {
    return (
      <div className="page-content">
        <div className="panel tc-empty" role="alert">
          <AlertCircle size={28} />
          <h2>Không thể tải tổng quan</h2>
          <p>{loadError || 'Chưa có dữ liệu tổng quan.'}</p>
          <button type="button" onClick={() => { setSummary(null); setLoadError(''); setReloadKey((value) => value + 1) }}>
            <RotateCcw size={14} /> Thử lại
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="page-content">
      <div className="page-heading">
        <span className="eyebrow"><span className="eyebrow-line" /> KHÔNG GIAN GIÁO VIÊN</span>
        <h1>Dạy học có thêm thời gian để quan tâm.</h1>
        <p>Số liệu được tải trực tiếp từ các lớp và môn bạn được phân công.</p>
      </div>

      <div className="metrics">
        <MetricCard icon={<ClipboardList size={20} />} label="Lớp đang phụ trách" value={summary.classrooms.active} note={`${summary.classrooms.archived} lớp trong lịch sử`} />
        <MetricCard icon={<CalendarDays size={20} />} label="Hoạt động đang mở" value={summary.openActivities} note="Quiz, tự luận và kiểm tra vở" />
        <MetricCard icon={<Archive size={20} />} label="Bài kiểm tra vở cần xem" value={summary.pendingNotebookReviews} note={`${summary.upcomingEvents} sự kiện sắp tới`} />
      </div>

      <div className="overview-grid">
        <section className="panel focus-panel">
          <div className="panel-head"><div><span className="section-kicker">CẦN CHÚ Ý HÔM NAY</span><h2>Việc cần xử lý</h2></div><ClipboardList size={19} /></div>
          <div className="focus-list">
            <div className="focus-item"><span className="focus-icon">!</span><div><strong>Kiểm tra vở chờ xem</strong><p>Mở Hoạt động để xem gợi ý Gemini và chốt kết quả.</p></div><span className="focus-tag">{summary.pendingNotebookReviews}</span></div>
            <div className="focus-item"><span className="focus-icon">→</span><div><strong>Lịch sắp tới</strong><p>Xem các hoạt động và hạn cần chuẩn bị.</p></div><span className="focus-tag">{summary.upcomingEvents}</span></div>
          </div>
        </section>
        <section className="panel explore-panel">
          <span className="section-kicker">KHÔNG GIAN GIẢNG DẠY</span>
          <h2>Đi tới lớp của tôi</h2>
          <p>Mở lớp để xem bài học, hoạt động, bài nộp và thống kê theo từng môn.</p>
        </section>
      </div>
    </div>
  )
}

function MetricCard({ icon, label, value, note }: { icon: ReactNode; label: string; value: number; note: string }) {
  return <div className="metric-card"><span className="metric-icon">{icon}</span><p>{label}</p><strong>{String(value).padStart(2, '0')}</strong><small>{note}</small></div>
}
