import { useEffect, useState } from 'react'
import { AlertCircle, RotateCcw } from 'lucide-react'
import { Link, useParams, useSearchParams } from 'react-router'
import { ApiError } from '../../../lib/api/client'
import { teacherResultsApi, type TeacherStatisticsResult } from '../../../lib/api/teacher/results'
import type { TeacherSubjectStudent } from '../../../lib/api/teacher/types'
import { teacherWorkspaceApi, teacherWorkspacePath } from '../../../lib/api/teacher/workspace'
import { TeacherBackButton } from '../components/TeacherBackButton'
import { EmptyState, PreviewNotice } from '../insights/TeacherUI'

function percentage(value: number | null): string {
  return value === null ? 'Chưa có dữ liệu' : `${Math.round(value * 100)}%`
}

function statisticsError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) return 'Bạn không còn quyền xem thống kê của môn học này.'
    if (error.status === 404) return 'Không tìm thấy môn học cần thống kê.'
    return error.message
  }
  return 'Không thể tải thống kê. Hãy thử lại.'
}

export function ClassStatisticsPage({ classroomSubjectId, embedded = false }: { classroomSubjectId?: string; embedded?: boolean }) {
  const route = useParams()
  const [params] = useSearchParams()
  const subjectId = classroomSubjectId ?? route.classroomSubjectId ?? params.get('classroomSubjectId') ?? ''
  const [statistics, setStatistics] = useState<TeacherStatisticsResult | null>(null)
  const [students, setStudents] = useState<TeacherSubjectStudent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!subjectId) {
      setIsLoading(false)
      return
    }
    let cancelled = false
    setIsLoading(true)
    setLoadError('')
    Promise.all([
      teacherResultsApi.getStatistics(subjectId),
      teacherWorkspaceApi.listClassroomSubjectStudents(subjectId),
    ])
      .then(([nextStatistics, nextStudents]) => {
        if (!cancelled) {
          setStatistics(nextStatistics)
          setStudents(nextStudents)
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setStatistics(null)
          setStudents([])
          setLoadError(statisticsError(error))
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => { cancelled = true }
  }, [subjectId, reloadKey])

  if (!subjectId) {
    return <div className={embedded ? 'tw-statistics' : 'page-content'}><EmptyState title="Chọn một môn được phân công" detail="Mở Lớp của tôi để xem thống kê đúng lớp và môn." /></div>
  }

  if (isLoading) return <div className={embedded ? 'tw-statistics' : 'page-content'}><p>Đang tải thống kê...</p></div>

  if (loadError || !statistics) {
    return (
      <div className={embedded ? 'tw-statistics' : 'page-content'}>
        <div className="ti-empty" role="alert"><AlertCircle size={26} /><strong>Không thể tải thống kê</strong><p>{loadError}</p><button type="button" className="ti-button" onClick={() => setReloadKey((value) => value + 1)}><RotateCcw size={14} /> Thử lại</button></div>
      </div>
    )
  }

  const context = statistics.classroomSubject
  const workspacePath = `${teacherWorkspacePath(context.classroom.id, context.id)}?tab=statistics`
  const studentBase = teacherWorkspacePath(context.classroom.id, context.id)

  return (
    <div className={embedded ? 'tw-statistics' : 'page-content'}>
      {!embedded && <TeacherBackButton fallbackTo={workspacePath} />}
      <div className="page-heading"><h1>Thống kê học tập</h1><p>{context.classroom.name} · {context.subject.name} — dữ liệu tổng hợp từ backend.</p></div>
      <PreviewNotice>Quiz và tự luận được tổng hợp điểm riêng. Kiểm tra vở chỉ tổng hợp tình trạng nộp/chốt, không tính vào điểm.</PreviewNotice>

      <section className="ti-card">
        <h2>Quiz & tự luận</h2>
        <div className="ti-table-wrap">
          <table className="ti-table"><thead><tr><th>Hoạt động</th><th>Đã nộp / cần nộp</th><th>Trạng thái chấm</th><th>Điểm trung bình</th><th>Tỷ lệ nộp</th></tr></thead><tbody><tr><td>{statistics.exercise.activityCount}</td><td>{statistics.exercise.submittedSubmissions}/{statistics.exercise.expectedSubmissions}</td><td>{statistics.exercise.gradedSubmissions} đã chấm · {statistics.exercise.pendingSubmissions} đang chấm · {statistics.exercise.failedSubmissions} lỗi</td><td>{statistics.exercise.averageScore === null ? 'Chưa có điểm' : statistics.exercise.averageScore.toFixed(1)}</td><td>{percentage(statistics.exercise.submissionRate)}</td></tr></tbody></table>
        </div>
      </section>

      <section className="ti-card">
        <h2>Kiểm tra vở · không tính điểm tổng</h2>
        <p>{statistics.notebook.activityCount} hoạt động · {statistics.notebook.periodCount} đợt · {statistics.notebook.submittedSubmissions}/{statistics.notebook.expectedSubmissions} bài đã nộp · {statistics.notebook.finalizedSubmissions} bài đã chốt.</p>
        <p className="ti-muted">Tỷ lệ nộp: {percentage(statistics.notebook.submissionRate)} · Tỷ lệ đã chốt: {percentage(statistics.notebook.finalizationRate)}</p>
        {statistics.notebook.criteria.length > 0 && <ul>{statistics.notebook.criteria.map((item) => <li key={item.criterionId}>{item.content}: {item.needsSupplementation} cần bổ sung · {item.undetermined} chưa xác định</li>)}</ul>}
      </section>

      <section className="ti-card">
        <h2>Xem bằng chứng theo học sinh</h2>
        {students.length === 0 ? <EmptyState title="Lớp chưa có học sinh" detail="Danh sách sẽ xuất hiện khi lớp có học sinh." /> : <ul className="tw-topics">{students.map((student) => <li key={student.id}><Link state={{ returnTo: workspacePath }} to={`${studentBase}/students/${student.id}`}>{student.name} · Bài nộp & kết quả</Link></li>)}</ul>}
      </section>
    </div>
  )
}
