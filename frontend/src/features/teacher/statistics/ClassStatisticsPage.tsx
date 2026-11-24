import { useEffect, useState } from 'react'
import { AlertCircle, RotateCcw } from 'lucide-react'
import { Link, useParams, useSearchParams } from 'react-router'
import { ApiError } from '../../../lib/api/client'
import { teacherActivitiesApi } from '../../../lib/api/teacher/activities'
import { teacherNotebookChecksApi, type TeacherNotebookPeriod } from '../../../lib/api/teacher/notebookChecks'
import { teacherResultsApi, type TeacherStatisticsResult } from '../../../lib/api/teacher/results'
import type { TeacherSubjectStudent } from '../../../lib/api/teacher/types'
import { teacherWorkspaceApi, teacherWorkspacePath } from '../../../lib/api/teacher/workspace'
import { TeacherBackButton } from '../components/TeacherBackButton'
import { EmptyState, InfoNotice } from '../insights/TeacherUI'
import { getEligibleStatisticsActivities, getStatisticsActivityId, getStatisticsPeriodId, type StatisticsActivityOption } from './statisticsFilters'
import { createStatisticsSubmissionsPath } from './statisticsNavigation'

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
  const [params, setParams] = useSearchParams()
  const subjectId = classroomSubjectId ?? route.classroomSubjectId ?? params.get('classroomSubjectId') ?? ''
  const requestedActivityId = params.get('statisticsActivityId') ?? ''
  const requestedPeriodId = params.get('statisticsPeriodId') ?? ''
  const [statistics, setStatistics] = useState<TeacherStatisticsResult | null>(null)
  const [students, setStudents] = useState<TeacherSubjectStudent[]>([])
  const [activityOptions, setActivityOptions] = useState<StatisticsActivityOption[]>([])
  const [notebookPeriods, setNotebookPeriods] = useState<TeacherNotebookPeriod[]>([])
  const [periodsActivityId, setPeriodsActivityId] = useState('')
  const [loadedScope, setLoadedScope] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const scopeKey = `${subjectId}:${reloadKey}`
  const selectedActivityId = getStatisticsActivityId(requestedActivityId, activityOptions)
  const selectedActivity = activityOptions.find((item) => item.id === selectedActivityId)
  const selectedActivityKind = selectedActivity?.kind
  const selectedPeriodId = getStatisticsPeriodId(requestedPeriodId, notebookPeriods)

  useEffect(() => {
    if (!subjectId) {
      setActivityOptions([])
      setNotebookPeriods([])
      setPeriodsActivityId('')
      setStudents([])
      setStatistics(null)
      setLoadedScope('')
      setIsLoading(false)
      return
    }
    let cancelled = false
    setIsLoading(true)
    setLoadError('')
    Promise.all([
      teacherActivitiesApi.list(subjectId),
      teacherNotebookChecksApi.list(subjectId),
      teacherWorkspaceApi.listClassroomSubjectStudents(subjectId),
    ])
      .then(([exerciseActivities, notebookActivities, nextStudents]) => {
        if (!cancelled) {
          setActivityOptions(getEligibleStatisticsActivities([...exerciseActivities, ...notebookActivities]))
          setNotebookPeriods([])
          setPeriodsActivityId('')
          setStudents(nextStudents)
          setLoadedScope(scopeKey)
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setStatistics(null)
          setStudents([])
          setActivityOptions([])
          setLoadedScope('')
          setLoadError(statisticsError(error))
          setIsLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [subjectId, reloadKey, scopeKey])

  useEffect(() => {
    if (loadedScope !== scopeKey) {
      return
    }

    if (!selectedActivityId || selectedActivityKind !== 'NOTEBOOK_CHECK') {
      setNotebookPeriods([])
      setPeriodsActivityId(selectedActivityId)
      return
    }

    let cancelled = false
    setNotebookPeriods([])
    setPeriodsActivityId('')
    teacherNotebookChecksApi.getDetail(selectedActivityId)
      .then((detail) => {
        if (cancelled) return
        setNotebookPeriods(detail.periods)
        setPeriodsActivityId(selectedActivityId)
        if (requestedPeriodId && !detail.periods.some((period) => period.id === requestedPeriodId)) {
          const next = new URLSearchParams(params)
          next.delete('statisticsPeriodId')
          setParams(next, { replace: true })
        }
      })
      .catch(() => {
        if (!cancelled) {
          setNotebookPeriods([])
          setPeriodsActivityId(selectedActivityId)
        }
      })

    return () => { cancelled = true }
  }, [loadedScope, scopeKey, selectedActivityId, selectedActivityKind, requestedPeriodId, params, setParams])

  useEffect(() => {
    if (loadedScope !== scopeKey || !requestedActivityId || selectedActivityId) {
      return
    }

    const next = new URLSearchParams(params)
    next.delete('statisticsActivityId')
    setParams(next, { replace: true })
  }, [loadedScope, scopeKey, requestedActivityId, selectedActivityId, params, setParams])

  useEffect(() => {
    if (!subjectId || loadedScope !== scopeKey || (requestedActivityId && !selectedActivityId)) {
      return
    }
    if (selectedActivityKind === 'NOTEBOOK_CHECK' && periodsActivityId !== selectedActivityId) {
      return
    }

    let cancelled = false
    setIsLoading(true)
    setLoadError('')
    teacherResultsApi.getStatistics(subjectId, selectedActivityId || undefined, selectedPeriodId || undefined)
      .then((nextStatistics) => {
        if (!cancelled) setStatistics(nextStatistics)
      })
      .catch((error) => {
        if (!cancelled) {
          setStatistics(null)
          setLoadError(statisticsError(error))
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => { cancelled = true }
  }, [subjectId, loadedScope, scopeKey, requestedActivityId, selectedActivityId, selectedActivityKind, periodsActivityId, selectedPeriodId])

  function changeActivity(value: string) {
    const next = new URLSearchParams(params)
    if (value) {
      next.set('statisticsActivityId', value)
    } else {
      next.delete('statisticsActivityId')
    }
    next.delete('statisticsPeriodId')
    setParams(next)
  }

  function changePeriod(value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set('statisticsPeriodId', value)
    else next.delete('statisticsPeriodId')
    setParams(next)
  }

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
  const submissionsPath = createStatisticsSubmissionsPath(
    context.classroom.id,
    context.id,
    selectedActivityId,
    selectedActivity?.kind,
    selectedPeriodId
  )

  return (
    <div className={embedded ? 'tw-statistics' : 'page-content'}>
      {!embedded && <TeacherBackButton fallbackTo={workspacePath} />}
      <div className="page-heading"><h1>Thống kê học tập</h1><p>{context.classroom.name} · {context.subject.name} — dữ liệu tổng hợp từ backend.</p></div>
      <InfoNotice>Quiz và tự luận được tổng hợp điểm riêng. Kiểm tra vở chỉ tổng hợp tình trạng nộp/chốt, không tính vào điểm.</InfoNotice>

      <section className="ti-card" aria-label="Phạm vi thống kê">
        <label htmlFor="statistics-activity">Phạm vi hoạt động</label>
        <select id="statistics-activity" value={selectedActivityId} onChange={(event) => changeActivity(event.target.value)}>
          <option value="">Tất cả hoạt động</option>
          {activityOptions.map((activity) => (
            <option value={activity.id} key={activity.id}>
              {activity.title} · {activity.kind === 'EXERCISE' ? 'Quiz / tự luận' : 'Kiểm tra vở'}
            </option>
          ))}
        </select>
        {selectedActivity?.kind === 'NOTEBOOK_CHECK' && periodsActivityId === selectedActivityId && <label htmlFor="statistics-period">Đợt kiểm tra<select id="statistics-period" value={selectedPeriodId} onChange={(event) => changePeriod(event.target.value)}><option value="">Tất cả đợt</option>{notebookPeriods.map((period) => <option value={period.id} key={period.id}>Đợt {period.periodNo}</option>)}</select></label>}
        <p className="ti-muted">
          {selectedActivity ? `Đang xem riêng: ${selectedActivity.title}.` : 'Đang xem số liệu tổng hợp của môn học.'}
        </p>
        <Link className="ti-button" to={submissionsPath}>Xem bài nộp{selectedActivity ? ' của hoạt động này' : ''}</Link>
      </section>

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
