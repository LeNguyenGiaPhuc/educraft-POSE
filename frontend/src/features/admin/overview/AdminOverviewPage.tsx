import { useEffect, useState } from 'react'
import { AlertCircle, RotateCcw } from 'lucide-react'
import { ApiError } from '../../../lib/api/client'
import { adminDashboardApi, type AdminDashboardSummary } from '../../../lib/api/adminDashboard'

function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : 'Không thể tải tổng quan quản trị.'
}

export function AdminOverviewPage() {
  const [summary, setSummary] = useState<AdminDashboardSummary | null>(null)
  const [loadError, setLoadError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    adminDashboardApi.getSummary()
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

  if (!summary && !loadError) return <div className="page-content admin-campus"><div className="admin-campus-skeleton" role="status">Đang tải tổng quan...</div></div>

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
    <div className="page-content admin-campus">
      <div className="page-heading admin-campus-heading">
        <h1>Không gian quản trị.</h1>
        <p>Theo dõi lớp học, con người và danh mục môn học trong một nhịp vận hành thống nhất.</p>
      </div>

      <div className="admin-campus-grid">
        <MetricCard className="is-classrooms" label="Lớp học" value={summary.classrooms.active} title="Lớp đang hoạt động" note={`${summary.classrooms.archived} lớp đã lưu trữ`} />
        <MetricCard className="is-people" label="Đội ngũ" value={summary.accounts.activeTeachers} title="Giáo viên hoạt động" note={`${summary.accounts.inactiveAccounts} tài khoản đang tắt`} />
        <MetricCard className="is-subjects" label="Danh mục" value={summary.subjects.active} title="Môn học hoạt động" note={`${summary.unassignedActiveSubjects} môn chưa phân công`} />
        <section className="admin-attention-board">
          <div className="admin-attention-head"><h2>Cần xử lý</h2><span>{summary.unassignedActiveSubjects + summary.accounts.inactiveAccounts}</span></div>
          <div className="focus-list">
            <div className="focus-item"><div><strong>Môn chưa phân công</strong><p>Bổ sung giáo viên chuyên môn cho các lớp đang học.</p></div><span className="focus-tag">{summary.unassignedActiveSubjects}</span></div>
            <div className="focus-item"><div><strong>Tài khoản đang tắt</strong><p>Kiểm tra trước khi kích hoạt lại tài khoản.</p></div><span className="focus-tag">{summary.accounts.inactiveAccounts}</span></div>
          </div>
        </section>
      </div>
    </div>
  )
}

function MetricCard({ className, label, value, title, note }: { className: string; label: string; value: number; title: string; note: string }) {
  return <section className={`admin-campus-card ${className}`}><span>{label}</span><strong>{value}</strong><h2>{title}</h2><p>{note}</p></section>
}
