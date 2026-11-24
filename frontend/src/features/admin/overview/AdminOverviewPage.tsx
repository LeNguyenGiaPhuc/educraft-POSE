import { useEffect, useState } from 'react'
import { AlertCircle, Archive, BookOpen, RotateCcw, School, Users } from 'lucide-react'
import type { ReactNode } from 'react'
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
        <span className="eyebrow"><span className="eyebrow-line" /> KHÔNG GIAN QUẢN TRỊ</span>
        <h1>Một nơi để tổ chức việc học.</h1>
        <p>Số liệu được tải trực tiếp từ hệ thống quản trị.</p>
      </div>

      <div className="metrics">
        <MetricCard icon={<School size={20} />} label="Lớp đang hoạt động" value={summary.classrooms.active} note={`${summary.classrooms.archived} lớp đã lưu trữ`} />
        <MetricCard icon={<Users size={20} />} label="Giáo viên hoạt động" value={summary.accounts.activeTeachers} note={`${summary.accounts.inactiveAccounts} tài khoản đang tắt`} />
        <MetricCard icon={<BookOpen size={20} />} label="Môn học hoạt động" value={summary.subjects.active} note={`${summary.unassignedActiveSubjects} môn chưa phân công`} />
      </div>

      <div className="overview-grid">
        <section className="panel focus-panel">
          <div className="panel-head"><div><span className="section-kicker">CẦN CHÚ Ý</span><h2>Việc cần chuẩn bị</h2></div><Archive size={19} /></div>
          <div className="focus-list">
            <div className="focus-item"><span className="focus-icon">!</span><div><strong>Môn chưa phân công</strong><p>Kiểm tra các môn đang thiếu giáo viên chuyên môn.</p></div><span className="focus-tag">{summary.unassignedActiveSubjects}</span></div>
            <div className="focus-item"><span className="focus-icon">!</span><div><strong>Tài khoản không hoạt động</strong><p>Rà soát các tài khoản đã bị tắt.</p></div><span className="focus-tag">{summary.accounts.inactiveAccounts}</span></div>
          </div>
        </section>
        <section className="panel explore-panel">
          <span className="section-kicker">QUẢN LÝ HỆ THỐNG</span>
          <h2>Đi tới công việc của bạn</h2>
          <p>Chọn Tài khoản, Lớp học hoặc Môn học của lớp ở thanh điều hướng.</p>
        </section>
      </div>
    </div>
  )
}

function MetricCard({ icon, label, value, note }: { icon: ReactNode; label: string; value: number; note: string }) {
  return <div className="metric-card"><span className="metric-icon">{icon}</span><p>{label}</p><strong>{String(value).padStart(2, '0')}</strong><small>{note}</small></div>
}
