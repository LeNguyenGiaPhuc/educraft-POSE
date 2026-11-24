import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, Archive, FileCheck2, FileText, RotateCcw } from 'lucide-react'
import { useSearchParams } from 'react-router'
import { ApiError } from '../../../lib/api/client'
import { teacherActivitiesApi } from '../../../lib/api/teacher/activities'
import {
  teacherResultsApi,
  type TeacherExerciseResult,
  type TeacherNotebookResult,
  type TeacherSubmissionKind,
  type TeacherSubmissionStatus,
  type TeacherSubmissionSummary,
} from '../../../lib/api/teacher/results'
import { teacherNotebookChecksApi, type TeacherNotebookPeriod } from '../../../lib/api/teacher/notebookChecks'
import './submissions.css'

type Props = {
  classroomSubjectId: string
  classroomName?: string
  subjectName?: string
  readOnly?: boolean
}

const exerciseStatuses: TeacherSubmissionStatus[] = ['PENDING', 'PROCESSING', 'GRADED', 'FAILED']
const notebookStatuses: TeacherSubmissionStatus[] = ['CURRENT', 'LOCKED', 'FINALIZED']

const statusLabels: Record<TeacherSubmissionStatus, string> = {
  MISSING: 'ChÆ°a ná»™p',
  PENDING: 'Chờ chấm',
  PROCESSING: 'Đang chấm',
  GRADED: 'Đã chấm',
  FAILED: 'Chấm thất bại',
  CURRENT: 'Đang xử lý',
  LOCKED: 'Chờ giáo viên chốt',
  FINALIZED: 'Đã chốt',
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) return 'Bạn không có quyền xem bài nộp của môn này.'
    if (error.status === 404) return 'Không tìm thấy môn học hoặc bài nộp được yêu cầu.'
    return error.message
  }
  return 'Không thể tải bài nộp. Hãy thử lại.'
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString('vi-VN')
}

function getStatusOptions(kind: TeacherSubmissionKind | '', hasActivity: boolean): TeacherSubmissionStatus[] {
  const values = kind === 'EXERCISE'
    ? exerciseStatuses
    : kind === 'NOTEBOOK_CHECK'
      ? notebookStatuses
      : [...exerciseStatuses, ...notebookStatuses]
  return hasActivity ? [...values, 'MISSING'] : values
}

export function SubmissionsPage({ classroomSubjectId, classroomName, subjectName, readOnly = false }: Props) {
  const [params, setParams] = useSearchParams()
  const [items, setItems] = useState<TeacherSubmissionSummary[]>([])
  const [meta, setMeta] = useState({ page: 1, pageSize: 20, totalItems: 0, totalPages: 0, hasNextPage: false, hasPrevPage: false })
  const [selectedResult, setSelectedResult] = useState<TeacherExerciseResult | TeacherNotebookResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingDetail, setIsLoadingDetail] = useState(Boolean(params.get('submissionId')))
  const [loadError, setLoadError] = useState('')
  const [detailError, setDetailError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [notebookPeriods, setNotebookPeriods] = useState<TeacherNotebookPeriod[]>([])
  const [isLoadingPeriods, setIsLoadingPeriods] = useState(false)
  const [availableActivities, setAvailableActivities] = useState<Array<{ id: string; title: string; kind: TeacherSubmissionKind }>>([])

  const kind = params.get('submissionKind') as TeacherSubmissionKind | null
  const status = params.get('submissionStatus') as TeacherSubmissionStatus | null
  const activityId = params.get('submissionActivityId') ?? ''
  const periodId = params.get('submissionPeriodId') ?? ''
  const studentSearch = params.get('submissionSearch') ?? ''
  const selectedId = params.get('submissionId') ?? ''
  const page = Number(params.get('submissionPage') ?? '1') || 1

  useEffect(() => {
    let cancelled = false

    teacherResultsApi.listSubmissions(classroomSubjectId, {
      activityId: activityId || undefined,
      periodId: periodId || undefined,
      kind: kind ?? undefined,
      status: status ?? undefined,
      page,
      pageSize: 20,
    })
      .then((result) => {
        if (cancelled) return
        setItems(result.items)
        setMeta(result.meta)
      })
      .catch((error) => {
        if (!cancelled) {
          setItems([])
          setMeta((current) => ({ ...current, totalItems: 0, totalPages: 0, hasNextPage: false, hasPrevPage: false }))
          setLoadError(errorMessage(error))
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [activityId, classroomSubjectId, kind, page, periodId, reloadKey, status])

  useEffect(() => {
    let cancelled = false
    Promise.all([
      teacherActivitiesApi.list(classroomSubjectId),
      teacherNotebookChecksApi.list(classroomSubjectId),
    ])
      .then(([exercises, notebooks]) => {
        if (cancelled) return
        setAvailableActivities([
          ...exercises.map((activity) => ({ id: activity.id, title: activity.title, kind: 'EXERCISE' as const })),
          ...notebooks.map((activity) => ({ id: activity.id, title: activity.title, kind: 'NOTEBOOK_CHECK' as const })),
        ])
      })
      .catch(() => {
        if (!cancelled) setAvailableActivities([])
      })

    return () => {
      cancelled = true
    }
  }, [classroomSubjectId])

  useEffect(() => {
    let cancelled = false
    if (kind !== 'NOTEBOOK_CHECK' || !activityId) {
      setNotebookPeriods([])
      return
    }

    setIsLoadingPeriods(true)
    teacherNotebookChecksApi.getDetail(activityId)
      .then((detail) => {
        if (cancelled) return
        setNotebookPeriods(detail.periods)
        if (!periodId && detail.periods[0]) {
          const next = new URLSearchParams(params)
          next.set('submissionPeriodId', detail.periods[0].id)
          next.delete('submissionPage')
          next.delete('submissionId')
          setParams(next)
        }
      })
      .catch(() => {
        if (!cancelled) setNotebookPeriods([])
      })
      .finally(() => {
        if (!cancelled) setIsLoadingPeriods(false)
      })

    return () => {
      cancelled = true
    }
  }, [activityId, kind, params, periodId, setParams])

  const visibleItems = useMemo(() => {
    const normalized = studentSearch.trim().toLocaleLowerCase('vi')
    if (!normalized) return items
    return items.filter((item) => `${item.student.fullName} ${item.student.username}`.toLocaleLowerCase('vi').includes(normalized))
  }, [items, studentSearch])

  const activityOptions = useMemo(() => {
    if (availableActivities.length > 0) return availableActivities
    const values = new Map<string, string>()
    for (const item of items) values.set(item.activityId, item.activityTitle)
    return Array.from(values, ([id, title]) => ({ id, title, kind: 'EXERCISE' as const }))
  }, [availableActivities, items])

  const selectedSummary = items.find((item) => item.id === selectedId) ?? null

  useEffect(() => {
    let cancelled = false
    if (!selectedSummary) {
      return
    }

    if (!selectedSummary.submissionId) {
      setSelectedResult(null)
      setIsLoadingDetail(false)
      return
    }

    const load = selectedSummary.kind === 'EXERCISE'
      ? teacherResultsApi.getExerciseResult(selectedSummary.submissionId)
      : teacherResultsApi.getNotebookResult(selectedSummary.submissionId)

    load
      .then((result) => {
        if (!cancelled) setSelectedResult(result)
      })
      .catch((error) => {
        if (!cancelled) {
          setSelectedResult(null)
          setDetailError(errorMessage(error))
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingDetail(false)
      })

    return () => {
      cancelled = true
    }
  }, [selectedSummary])

  function updateQuery(values: Record<string, string | null>) {
    const isListChange = Object.keys(values).some((key) => key !== 'submissionId')
    if (isListChange) {
      setIsLoading(true)
      setLoadError('')
      setSelectedResult(null)
      setIsLoadingDetail(false)
      setDetailError('')
    }
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(values)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    if ('submissionKind' in values || 'submissionStatus' in values || 'submissionActivityId' in values || 'submissionPeriodId' in values || 'submissionSearch' in values) {
      next.delete('submissionPage')
      next.delete('submissionId')
    }
    setParams(next)
  }

  function selectItem(item: TeacherSubmissionSummary) {
    setSelectedResult(null)
    setIsLoadingDetail(true)
    setDetailError('')
    updateQuery({ submissionId: item.id })
  }

  function changeKind(value: string) {
    const nextKind = value as TeacherSubmissionKind | ''
    const allowedStatuses = getStatusOptions(nextKind, false)
    const nextStatus = status && allowedStatuses.includes(status) ? status : ''
    updateQuery({ submissionKind: nextKind || null, submissionStatus: nextStatus || null, submissionActivityId: null, submissionPeriodId: null })
  }

  return (
    <div className="page-content ts-page">
      <div className="page-heading">
        <span className="section-kicker">BÀI NỘP & KẾT QUẢ</span>
        <h1>{subjectName ? `${subjectName} · Bài nộp` : 'Bài nộp & kết quả'}</h1>
        <p>{classroomName ? `${classroomName} · ` : ''}Theo dõi bài học sinh đã nộp và xem kết quả từ backend.</p>
      </div>

      {readOnly && <div className="ts-notice"><Archive size={16} /> Lớp đã lưu trữ. Dữ liệu chỉ được xem, không có thao tác thay đổi.</div>}

      <section className="ts-filters" aria-label="Bộ lọc bài nộp">
        <label>Loại bài
          <select value={kind ?? ''} onChange={(event) => changeKind(event.target.value)}>
            <option value="">Tất cả</option>
            <option value="EXERCISE">Quiz / Tự luận</option>
            <option value="NOTEBOOK_CHECK">Kiểm tra vở</option>
          </select>
        </label>
        <label>Hoạt động
          <select value={activityId} onChange={(event) => updateQuery({ submissionActivityId: event.target.value || null, submissionPeriodId: null })}>
            <option value="">Tất cả hoạt động</option>
            {activityOptions.map((activity) => <option value={activity.id} key={activity.id}>{activity.kind === 'NOTEBOOK_CHECK' ? 'Kiểm tra vở · ' : 'Bài tập · '}{activity.title}</option>)}
          </select>
        </label>
        <label>Trạng thái
          <select value={status ?? ''} onChange={(event) => updateQuery({ submissionStatus: event.target.value || null })}>
            <option value="">Tất cả</option>
            {getStatusOptions(kind ?? '', Boolean(activityId)).map((value) => <option value={value} key={value}>{statusLabels[value]}</option>)}
          </select>
        </label>
        {kind === 'NOTEBOOK_CHECK' && activityId && <label>Đợt kiểm tra vở
          <select value={periodId} onChange={(event) => updateQuery({ submissionPeriodId: event.target.value || null })} disabled={isLoadingPeriods}>
            <option value="">{isLoadingPeriods ? 'Đang tải đợt...' : 'Chọn đợt'}</option>
            {notebookPeriods.map((period) => <option value={period.id} key={period.id}>Đợt {period.periodNo} · hạn {formatDate(period.dueAt)}</option>)}
          </select>
        </label>}
        <label>Tìm học sinh
          <input value={studentSearch} onChange={(event) => updateQuery({ submissionSearch: event.target.value || null })} placeholder="Tên hoặc tài khoản" />
        </label>
      </section>

      <div className="ts-stats">
        <div><strong>{meta.totalItems}</strong><span>Tổng bài nộp</span></div>
        <div><strong>{visibleItems.filter((item) => item.kind === 'EXERCISE').length}</strong><span>Quiz / Tự luận trong trang</span></div>
        <div><strong>{visibleItems.filter((item) => item.kind === 'NOTEBOOK_CHECK').length}</strong><span>Kiểm tra vở trong trang</span></div>
      </div>

      {isLoading && <div className="ts-state" role="status">Đang tải danh sách bài nộp...</div>}
      {!isLoading && loadError && (
        <div className="ts-state ts-error" role="alert">
          <AlertCircle size={20} /><span>{loadError}</span>
          <button type="button" onClick={() => { setIsLoading(true); setLoadError(''); setReloadKey((value) => value + 1) }}><RotateCcw size={14} /> Thử lại</button>
        </div>
      )}
      {!isLoading && !loadError && visibleItems.length === 0 && (
        <div className="ts-state"><FileCheck2 size={24} /><h2>Chưa có bài nộp phù hợp</h2><p>Thử đổi bộ lọc hoặc đợi học sinh nộp bài.</p></div>
      )}

      {!isLoading && !loadError && visibleItems.length > 0 && (
        <div className="ts-layout">
          <section className="ts-card" aria-label="Danh sách bài nộp">
            <div className="ts-card-head"><h2>Danh sách bài nộp</h2><span>{visibleItems.length} bài trên trang</span></div>
            <div className="ts-list">
              {visibleItems.map((item) => (
                <button type="button" key={item.id} className={`ts-list-item ${item.id === selectedId ? 'is-selected' : ''}`} onClick={() => selectItem(item)}>
                  <span className={`ts-kind ${item.kind === 'EXERCISE' ? 'exercise' : 'notebook'}`}>{item.kind === 'EXERCISE' ? <FileText size={17} /> : <FileCheck2 size={17} />}</span>
                  <span className="ts-item-main"><strong>{item.activityTitle}</strong><small>{item.student.fullName} · {item.submittedAt ? formatDate(item.submittedAt) : 'Chưa nộp'}{!item.isCurrentMember && ' · Đã rời lớp'}</small></span>
                  <span className="ts-item-status">{statusLabels[item.status]}</span>
                </button>
              ))}
            </div>
            <div className="ts-pagination">
              <button type="button" disabled={!meta.hasPrevPage} onClick={() => updateQuery({ submissionPage: String(Math.max(1, page - 1)) })}>Trang trước</button>
              <span>Trang {meta.page} / {Math.max(meta.totalPages, 1)}</span>
              <button type="button" disabled={!meta.hasNextPage} onClick={() => updateQuery({ submissionPage: String(page + 1) })}>Trang sau</button>
            </div>
          </section>

          <section className="ts-card" aria-label="Chi tiết bài nộp">
            {!selectedSummary && <div className="ts-detail-empty"><FileCheck2 size={28} /><h2>Chọn một bài nộp</h2><p>Chọn trong danh sách để xem kết quả chi tiết.</p></div>}
            {selectedSummary && isLoadingDetail && <div className="ts-detail-empty" role="status">Đang tải chi tiết bài nộp...</div>}
            {selectedSummary && !selectedSummary.submissionId && !isLoadingDetail && <div className="ts-detail-empty"><FileCheck2 size={28} /><h2>Học sinh chưa nộp</h2><p>Học sinh này đang thuộc lớp hiện tại và chưa có bài nộp cho hoạt động này.</p></div>}
            {selectedSummary && !isLoadingDetail && detailError && <div className="ts-detail-empty ts-error" role="alert"><AlertCircle size={20} /><p>{detailError}</p></div>}
            {selectedSummary && selectedResult?.kind === 'EXERCISE' && <ExerciseResultDetail result={selectedResult} />}
            {selectedSummary && selectedResult?.kind === 'NOTEBOOK_CHECK' && <NotebookResultDetail result={selectedResult} />}
          </section>
        </div>
      )}
    </div>
  )
}

function ExerciseResultDetail({ result }: { result: TeacherExerciseResult }) {
  return (
    <div className="ts-detail">
      <span className="section-kicker">{result.activity.exerciseType === 'QUIZ' ? 'QUIZ' : 'TỰ LUẬN'}</span>
      <h2>{result.activity.title}</h2>
      <p className="ts-muted">{result.student.fullName} · Nộp lúc {formatDate(result.submittedAt)}</p>
      <div className="ts-result-summary"><strong>{result.totalScore === null ? 'Chưa có điểm' : `${result.totalScore} điểm`}</strong><span>{statusLabels[result.gradingStatus]}</span></div>
      <h3>Câu trả lời</h3>
      <div className="ts-answer-list">
        {result.answers.length === 0 && <p>Chưa có câu trả lời chi tiết.</p>}
        {result.answers.map((answer, index) => (
          <article key={answer.id}>
            <strong>Câu {index + 1}. {answer.question.prompt}</strong>
            <p>{answer.answer || 'Không có câu trả lời.'}</p>
            <small>{answer.earnedPoints === null ? 'Chưa có điểm câu này' : `${answer.earnedPoints}/${answer.question.maxPoints ?? '?'} điểm`}</small>
          </article>
        ))}
      </div>
    </div>
  )
}

function NotebookResultDetail({ result }: { result: TeacherNotebookResult }) {
  return (
    <div className="ts-detail">
      <span className="section-kicker">KIỂM TRA VỞ</span>
      <h2>{result.activity.title}</h2>
      <p className="ts-muted">{result.student.fullName} · Đợt {result.period.periodNo} · Nộp lúc {formatDate(result.submittedAt)}</p>
      <div className="ts-result-summary"><strong>Không tính điểm tổng</strong><span>{statusLabels[result.status]}</span></div>
      <h3>Tiêu chí kiểm tra</h3>
      <div className="ts-criteria-list">
        {result.criteria.map((criterion) => {
          const assessment = result.assessment?.results.find((item) => item.criterionId === criterion.id)
          return <article key={criterion.id}><strong>{criterion.orderIndex + 1}. {criterion.content}</strong><span>{assessment?.status ?? 'Chưa đánh giá'}</span>{assessment?.note && <small>{assessment.note}</small>}</article>
        })}
      </div>
      {result.assessment?.teacherComment && <p className="ts-comment"><strong>Nhận xét giáo viên:</strong> {result.assessment.teacherComment}</p>}
      {!result.assessment && <p className="ts-muted">Chưa có kết quả chốt chính thức.</p>}
    </div>
  )
}
