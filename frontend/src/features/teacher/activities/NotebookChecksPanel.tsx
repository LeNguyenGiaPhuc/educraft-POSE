import { useCallback, useEffect, useMemo, useState } from 'react'
import { Archive, CalendarPlus, Eye, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { ApiError } from '../../../lib/api/client'
import {
  teacherNotebookChecksApi,
  type TeacherNotebookCheckDetail,
  type TeacherNotebookCheckStatus,
  type TeacherNotebookPeriod,
  type TeacherNotebookSubmissionSummary,
} from '../../../lib/api/teacher/notebookChecks'
import { NotebookCheckForm } from './NotebookCheckForm'
import { NotebookSubmissionReviewPanel } from './NotebookSubmissionReviewPanel'

type Props = {
  classroomSubjectId: string
  readOnly: boolean
}

const statusLabels: Record<TeacherNotebookCheckStatus, string> = {
  DRAFT: 'Bản nháp',
  PUBLISHED: 'Đang mở',
  CLOSED: 'Đã đóng',
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  return 'Không thể hoàn tất thao tác. Hãy thử lại.'
}

function toIso(value: string): string {
  return new Date(value).toISOString()
}

async function openPrivateFile(download: () => Promise<{ blob: Blob }>) {
  const result = await download()
  const url = URL.createObjectURL(result.blob)
  window.open(url, '_blank', 'noopener,noreferrer')
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

export function NotebookChecksPanel({ classroomSubjectId, readOnly }: Props) {
  const [checks, setChecks] = useState<Awaited<ReturnType<typeof teacherNotebookChecksApi.list>>>([])
  const [detail, setDetail] = useState<TeacherNotebookCheckDetail | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<TeacherNotebookCheckStatus | ''>('')

  const loadList = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      setChecks(await teacherNotebookChecksApi.list(classroomSubjectId))
    } catch (loadError) {
      setError(errorMessage(loadError))
    } finally {
      setIsLoading(false)
    }
  }, [classroomSubjectId])

  useEffect(() => {
    void loadList()
  }, [loadList])

  const visibleChecks = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('vi')
    return checks.filter((check) => {
      if (status && check.status !== status) return false
      return !normalizedSearch || check.title.toLocaleLowerCase('vi').includes(normalizedSearch)
    })
  }, [checks, search, status])

  async function openDetail(id: string) {
    setError('')
    try {
      setDetail(await teacherNotebookChecksApi.getDetail(id))
      setShowForm(false)
    } catch (detailError) {
      setError(errorMessage(detailError))
    }
  }

  async function saveForm(input: { title: string; description: string; closesAt: string | null; criteria: Array<{ content: string }>; files: File[] }) {
    setIsSaving(true)
    setError('')
    setNotice('')
    try {
      let saved = detail
        ? await teacherNotebookChecksApi.update(detail.id, {
            title: input.title,
            description: input.description,
            closesAt: input.closesAt,
          })
        : await teacherNotebookChecksApi.create(classroomSubjectId, {
            title: input.title,
            description: input.description,
            closesAt: input.closesAt,
          })

      if (input.criteria.length > 0 && !saved.criteriaLockedAt) {
        saved = await teacherNotebookChecksApi.putCriteria(saved.id, input.criteria)
      }
      for (const file of input.files) {
        await teacherNotebookChecksApi.uploadReferenceFile(saved.id, file)
      }

      const refreshed = await teacherNotebookChecksApi.getDetail(saved.id)
      setDetail(refreshed)
      setShowForm(false)
      setNotice('Đã lưu kiểm tra vở vào backend.')
      await loadList()
    } catch (saveError) {
      setError(errorMessage(saveError))
    } finally {
      setIsSaving(false)
    }
  }

  async function publish() {
    if (!detail) return
    setIsSaving(true)
    setError('')
    try {
      setDetail(await teacherNotebookChecksApi.publish(detail.id))
      setNotice('Đã công bố kiểm tra vở.')
      await loadList()
    } catch (publishError) {
      setError(errorMessage(publishError))
    } finally {
      setIsSaving(false)
    }
  }

  async function remove() {
    if (!detail || !window.confirm(`Xóa hoạt động “${detail.title}”?`)) return
    setIsSaving(true)
    setError('')
    try {
      await teacherNotebookChecksApi.remove(detail.id)
      setDetail(null)
      setNotice('Đã xóa kiểm tra vở.')
      await loadList()
    } catch (removeError) {
      setError(errorMessage(removeError))
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) return <section className="panel tn-panel"><p>Đang tải kiểm tra vở...</p></section>

  if (showForm) {
    return (
      <section className="panel tn-panel">
        <button type="button" className="ta-back" onClick={() => setShowForm(false)}>← Danh sách kiểm tra vở</button>
        <div className="ta-editor-head"><span className="ta-step">NOTEBOOK CHECK · API</span><h2>{detail ? 'Sửa kiểm tra vở' : 'Tạo kiểm tra vở'}</h2><p>Giáo viên nhập tiêu chí, tải ảnh mẫu và lưu bản nháp trước khi công bố.</p></div>
        <NotebookCheckForm activity={detail ?? undefined} isSaving={isSaving} onCancel={() => setShowForm(false)} onSave={saveForm} />
      </section>
    )
  }

  if (!detail) {
    return (
      <section className="panel tn-panel">
        <div className="tn-panel-heading"><div><span className="ta-step">KIỂM TRA VỞ</span><h2>Danh sách kiểm tra vở</h2><p>Ảnh mẫu và tiêu chí được lưu bằng API thật.</p></div>{!readOnly && <button type="button" className="ta-primary" onClick={() => setShowForm(true)}><Plus size={15} /> Tạo kiểm tra vở</button>}</div>
        <div className="ta-history-filters"><label>Tìm hoạt động<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tên kiểm tra vở" /></label><label>Trạng thái<select value={status} onChange={(event) => setStatus(event.target.value as TeacherNotebookCheckStatus | '')}><option value="">Tất cả</option><option value="DRAFT">Bản nháp</option><option value="PUBLISHED">Đang mở</option><option value="CLOSED">Đã đóng</option></select></label></div>
        {error && <p className="ta-error" role="alert">{error} <button type="button" className="ta-secondary" onClick={() => void loadList()}><RotateCcw size={13} /> Thử lại</button></p>}
        {notice && <p className="ta-success" role="status">{notice}</p>}
        {visibleChecks.length === 0 ? <p className="tn-empty">Chưa có kiểm tra vở phù hợp.</p> : <div className="tn-list">{visibleChecks.map((check) => <button type="button" className="tn-list-row" key={check.id} onClick={() => void openDetail(check.id)}><div><strong>{check.title}</strong><small>{check.criteriaCount} tiêu chí · {check.referenceCount} ảnh mẫu · {check.periodCount} đợt nộp</small></div><span className={`ta-status ${check.status === 'CLOSED' ? 'closed' : ''}`}>{statusLabels[check.status]}</span><Eye size={16} /></button>)}</div>}
      </section>
    )
  }

  return <NotebookCheckDetail detail={detail} readOnly={readOnly} isSaving={isSaving} notice={notice} error={error} onBack={() => setDetail(null)} onEdit={() => setShowForm(true)} onPublish={() => void publish()} onDelete={() => void remove()} onRefresh={(next) => setDetail(next)} />
}

function NotebookCheckDetail({ detail, readOnly, isSaving, notice, error, onBack, onEdit, onPublish, onDelete, onRefresh }: {
  detail: TeacherNotebookCheckDetail
  readOnly: boolean
  isSaving: boolean
  notice: string
  error: string
  onBack: () => void
  onEdit: () => void
  onPublish: () => void
  onDelete: () => void
  onRefresh: (detail: TeacherNotebookCheckDetail) => void
}) {
  const [periods, setPeriods] = useState<TeacherNotebookPeriod[]>(detail.periods)
  const [selectedPeriodId, setSelectedPeriodId] = useState(detail.periods[0]?.id ?? '')
  const [submissions, setSubmissions] = useState<TeacherNotebookSubmissionSummary[]>([])
  const [selectedSubmissionId, setSelectedSubmissionId] = useState('')
  const [dueAt, setDueAt] = useState('')
  const [periodError, setPeriodError] = useState('')
  const [fileError, setFileError] = useState('')

  useEffect(() => {
    setPeriods(detail.periods)
    setSelectedPeriodId((current) => detail.periods.some((period) => period.id === current) ? current : detail.periods[0]?.id ?? '')
  }, [detail])

  useEffect(() => {
    if (!selectedPeriodId) {
      setSubmissions([])
      return
    }
    teacherNotebookChecksApi.listSubmissions(selectedPeriodId).then(setSubmissions).catch((loadError) => setPeriodError(errorMessage(loadError)))
  }, [selectedPeriodId])

  async function createPeriod() {
    if (!dueAt) {
      setPeriodError('Chọn hạn đóng đợt nộp.')
      return
    }
    try {
      const period = await teacherNotebookChecksApi.createPeriod(detail.id, toIso(dueAt))
      setPeriods((current) => [...current, period])
      setSelectedPeriodId(period.id)
      setDueAt('')
      setPeriodError('')
    } catch (createError) {
      setPeriodError(errorMessage(createError))
    }
  }

  async function closePeriod(period: TeacherNotebookPeriod) {
    try {
      const closed = await teacherNotebookChecksApi.closePeriod(period.id)
      setPeriods((current) => current.map((item) => item.id === closed.id ? closed : item))
    } catch (closeError) {
      setPeriodError(errorMessage(closeError))
    }
  }

  async function openReferenceFile(fileId: string) {
    try {
      await openPrivateFile(() => teacherNotebookChecksApi.downloadReferenceFile(detail.id, fileId))
      setFileError('')
    } catch (openError) {
      setFileError(errorMessage(openError))
    }
  }

  async function deleteReferenceFile(fileId: string) {
    if (!window.confirm('Xóa ảnh vở mẫu này?')) return
    try {
      await teacherNotebookChecksApi.deleteReferenceFile(detail.id, fileId)
      onRefresh(await teacherNotebookChecksApi.getDetail(detail.id))
      setFileError('')
    } catch (deleteError) {
      setFileError(errorMessage(deleteError))
    }
  }

  return (
    <section className="panel tn-panel">
      <button type="button" className="ta-back" onClick={onBack}>← Danh sách kiểm tra vở</button>
      <div className="tn-panel-heading"><div><span className="ta-step">NOTEBOOK CHECK · API</span><h2>{detail.title}</h2><p>{detail.description || 'Không có mô tả.'}</p><p>Trạng thái: <strong>{statusLabels[detail.status]}</strong> · {detail.criteria.length} tiêu chí · {detail.referenceFiles.length} ảnh mẫu</p></div>{!readOnly && <div className="ta-actions"><button type="button" className="ta-secondary" onClick={onEdit} disabled={isSaving || Boolean(detail.criteriaLockedAt)}>Sửa</button>{detail.status === 'DRAFT' && <button type="button" className="ta-primary" onClick={onPublish} disabled={isSaving}>Công bố</button>}{detail.status === 'DRAFT' && <button type="button" className="ta-delete-btn" onClick={onDelete} disabled={isSaving}><Trash2 size={14} /> Xóa</button>}</div>}</div>
      {readOnly && <div className="ta-readonly"><Archive size={16} /> Lớp đã lưu trữ. Chỉ xem dữ liệu Notebook.</div>}
      {notice && <p className="ta-success" role="status">{notice}</p>}
      {error && <p className="ta-error" role="alert">{error}</p>}

      <div className="tn-detail-grid">
        <section className="tn-section"><h3>Tiêu chí</h3><ol className="tn-criteria-readonly">{detail.criteria.map((criterion) => <li key={criterion.id}>{criterion.content}</li>)}</ol></section>
        <section className="tn-section"><h3>Ảnh vở mẫu</h3><p className="tn-help">{detail.referenceFiles.length} file đã tải lên private storage.</p>{fileError && <p className="ta-error" role="alert">{fileError}</p>}<ul className="tn-file-list">{detail.referenceFiles.map((file) => <li key={file.id}><span>Ảnh {file.sortOrder} · {file.mimeType} · {(file.byteSize / 1024 / 1024).toFixed(2)}MB</span><span className="tn-file-actions"><button type="button" className="ta-secondary" onClick={() => void openReferenceFile(file.id)}>Mở ảnh</button>{!readOnly && !detail.criteriaLockedAt && <button type="button" className="ta-delete-btn" onClick={() => void deleteReferenceFile(file.id)}>Xóa</button>}</span></li>)}</ul></section>
      </div>

      <section className="tn-section"><div className="tn-section-heading"><div><h3>Đợt nộp</h3><p className="tn-help">Mỗi hoạt động chỉ có một đợt đang mở.</p></div>{!readOnly && detail.status === 'PUBLISHED' && <div className="tn-period-create"><input type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} /><button type="button" className="ta-secondary" onClick={() => void createPeriod()}><CalendarPlus size={14} /> Tạo đợt</button></div>}</div>{periodError && <p className="ta-error" role="alert">{periodError}</p>}{periods.length === 0 ? <p className="tn-empty">Chưa có đợt nộp.</p> : <div className="tn-period-list">{periods.map((period) => <div className={`tn-period-row ${selectedPeriodId === period.id ? 'is-selected' : ''}`} key={period.id}><button type="button" onClick={() => setSelectedPeriodId(period.id)}><strong>Đợt {period.periodNo}</strong><span>Hạn {new Date(period.dueAt).toLocaleString('vi-VN')} · {period.submissionCount} bài nộp</span></button>{!readOnly && !period.closedAt && <button type="button" className="ta-secondary" onClick={() => void closePeriod(period)}>Đóng đợt</button>}</div>)}</div>}</section>

      {selectedPeriodId && <section className="tn-section"><h3>Danh sách bài nộp</h3>{submissions.length === 0 ? <p className="tn-empty">Chưa có bài nộp trong đợt này.</p> : <div className="tn-submission-list">{submissions.map((submission) => <button type="button" key={submission.id} className={`tn-submission-row ${selectedSubmissionId === submission.id ? 'is-selected' : ''}`} onClick={() => setSelectedSubmissionId(submission.id)}><span><strong>{submission.studentName}</strong><small>{submission.files.length} ảnh · {submission.status} · {submission.processingStatus}</small></span><Eye size={15} /></button>)}</div>}</section>}
      {selectedSubmissionId && <NotebookSubmissionReviewPanel submissionId={selectedSubmissionId} readOnly={readOnly} onFinalized={() => { void teacherNotebookChecksApi.getDetail(detail.id).then(onRefresh) }} />}
    </section>
  )
}
