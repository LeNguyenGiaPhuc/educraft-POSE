import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, Archive, FileText, Plus, RotateCcw, Sparkles, Trash2 } from 'lucide-react'
import { useParams, useSearchParams } from 'react-router'
import { ApiError } from '../../../lib/api/client'
import { teacherActivitiesApi, type TeacherActivityDetail, type TeacherActivityStatus, type TeacherActivitySummary, type TeacherAiDraftResult, type TeacherCreateActivityInput, type TeacherQuestionInput, type TeacherUpdateActivityInput, type TeacherUpdateExerciseContentInput } from '../../../lib/api/teacher/activities'
import { teacherLessonsApi, type TeacherLessonSummary } from '../../../lib/api/teacher/lessons'
import { teacherWorkspaceApi } from '../../../lib/api/teacher/workspace'
import type { TeacherClassroomSubjectContext } from '../../../lib/api/teacher/types'
import { ExerciseActivityForm } from './ExerciseActivityForm'
import { NotebookChecksPanel } from './NotebookChecksPanel'
import './activities.css'

type Props = { classroomSubjectId?: string }
type ActivityFilter = '' | 'QUIZ' | 'WRITTEN'
type StatusFilter = '' | TeacherActivityStatus
type ActivityMode = 'EXERCISE' | 'NOTEBOOK'

const statusLabels: Record<TeacherActivityStatus, string> = {
  DRAFT: 'Bản nháp',
  PUBLISHED: 'Đang mở nhận bài',
  CLOSED: 'Đã đóng nhận bài',
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) return 'Bạn không có quyền thay đổi hoạt động của môn này.'
    if (error.status === 404) return 'Không tìm thấy hoạt động hoặc môn học được yêu cầu.'
    if (error.status === 409) return error.message || 'Hoạt động đã có bài nộp và không thể sửa nội dung.'
    return error.message
  }
  return 'Không thể hoàn tất thao tác. Hãy thử lại.'
}

function formatDate(value: string | null): string {
  return value ? new Date(value).toLocaleString('vi-VN') : 'Không đặt hạn'
}

function localDateTime(value: string | null): string {
  if (!value) return ''
  const date = new Date(value)
  const offset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

function toIso(value: string): string | null {
  return value ? new Date(value).toISOString() : null
}

function activityTypeLabel(activity: TeacherActivitySummary): string {
  return activity.exercise?.exercise_type === 'WRITTEN' ? 'Tự luận' : 'Quiz'
}

export function ActivitiesPage({ classroomSubjectId: propClassroomSubjectId }: Props = {}) {
  const route = useParams<{ classroomSubjectId?: string; activityId?: string }>()
  const [params, setParams] = useSearchParams()
  const classroomSubjectId = propClassroomSubjectId ?? route.classroomSubjectId ?? ''
  const selectedActivityId = route.activityId ?? params.get('activityId') ?? ''
  const [context, setContext] = useState<TeacherClassroomSubjectContext | null>(null)
  const [lessons, setLessons] = useState<TeacherLessonSummary[]>([])
  const [activities, setActivities] = useState<TeacherActivitySummary[]>([])
  const [detail, setDetail] = useState<TeacherActivityDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingDetail, setIsLoadingDetail] = useState(Boolean(selectedActivityId))
  const [isSaving, setIsSaving] = useState(false)
  const [isAiLoading, setIsAiLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [actionError, setActionError] = useState('')
  const [notice, setNotice] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [activityForm, setActivityForm] = useState<{ mode: 'create' | 'edit'; type: 'QUIZ' | 'WRITTEN'; activity?: TeacherActivityDetail } | null>(null)
  const [filterType, setFilterType] = useState<ActivityFilter>('')
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('')
  const [search, setSearch] = useState('')
  const [reopenAt, setReopenAt] = useState('')
  const [aiDraft, setAiDraft] = useState<TeacherAiDraftResult | null>(null)
  const [activityMode, setActivityMode] = useState<ActivityMode>('EXERCISE')

  useEffect(() => {
    if (!classroomSubjectId) return
    let cancelled = false
    setIsLoading(true)
    setLoadError('')
    const notebookMode = activityMode === 'NOTEBOOK'
    Promise.all([
      teacherWorkspaceApi.getClassroomSubject(classroomSubjectId),
      notebookMode ? Promise.resolve([] as TeacherLessonSummary[]) : teacherLessonsApi.list(classroomSubjectId),
      notebookMode ? Promise.resolve([] as TeacherActivitySummary[]) : teacherActivitiesApi.list(classroomSubjectId),
    ])
      .then(([nextContext, nextLessons, nextActivities]) => {
        if (cancelled) return
        setContext(nextContext)
        setLessons(nextLessons)
        setActivities(nextActivities)
      })
      .catch((error) => {
        if (!cancelled) setLoadError(errorMessage(error))
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [activityMode, classroomSubjectId, reloadKey])

  useEffect(() => {
    if (!selectedActivityId) return
    let cancelled = false
    teacherActivitiesApi.getDetail(selectedActivityId)
      .then((nextDetail) => {
        if (!cancelled) {
          setDetail(nextDetail)
          setReopenAt(localDateTime(nextDetail.closes_at))
        }
      })
      .catch((error) => {
        if (!cancelled) setActionError(errorMessage(error))
      })
      .finally(() => {
        if (!cancelled) setIsLoadingDetail(false)
      })
    return () => {
      cancelled = true
    }
  }, [selectedActivityId])

  const visibleActivities = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('vi')
    return activities.filter((activity) => {
      if (filterType && activity.exercise?.exercise_type !== filterType) return false
      if (filterStatus && activity.status !== filterStatus) return false
      if (normalizedSearch && !activity.title.toLocaleLowerCase('vi').includes(normalizedSearch)) return false
      return true
    })
  }, [activities, filterStatus, filterType, search])

  function selectActivity(id: string) {
    setDetail(null)
    setAiDraft(null)
    setIsLoadingDetail(true)
    setActionError('')
    const next = new URLSearchParams(params)
    next.set('activityId', id)
    setParams(next)
  }

  function clearSelection() {
    setDetail(null)
    setAiDraft(null)
    setActionError('')
    const next = new URLSearchParams(params)
    next.delete('activityId')
    setParams(next)
  }

  function replaceActivity(nextDetail: TeacherActivityDetail) {
    setDetail(nextDetail)
    setActivities((current) => current.map((activity) => activity.id === nextDetail.id ? nextDetail : activity))
  }

  async function saveActivity(input: TeacherCreateActivityInput | TeacherUpdateActivityInput, questions: TeacherQuestionInput[]) {
    setIsSaving(true)
    setActionError('')
    try {
      let saved: TeacherActivityDetail
      if (activityForm?.mode === 'edit' && activityForm.activity) {
        saved = await teacherActivitiesApi.updateExerciseContent(
          activityForm.activity.id,
          { ...(input as TeacherUpdateActivityInput), questions } as TeacherUpdateExerciseContentInput,
        )
      } else {
        if (!('exerciseType' in input)) throw new Error('Thiếu loại hoạt động.')
        saved = await teacherActivitiesApi.publishGenerated(classroomSubjectId, { ...input, questions })
      }
      replaceActivity(saved)
      setActivityForm(null)
      setNotice(activityForm?.mode === 'edit' ? 'Đã lưu thay đổi hoạt động.' : 'Đã công bố hoạt động và tạo thông báo.')
      selectActivity(saved.id)
      setReloadKey((value) => value + 1)
    } finally {
      setIsSaving(false)
    }
  }

  async function runAction(action: () => Promise<TeacherActivityDetail>, message: string): Promise<boolean> {
    setIsSaving(true)
    setActionError('')
    try {
      const nextDetail = await action()
      replaceActivity(nextDetail)
      setNotice(message)
      setReloadKey((value) => value + 1)
      return true
    } catch (error) {
      setActionError(errorMessage(error))
      return false
    } finally {
      setIsSaving(false)
    }
  }

  async function deleteActivity() {
    if (!detail || !window.confirm(`Xóa hoạt động “${detail.title}”?`)) return
    setIsSaving(true)
    setActionError('')
    try {
      await teacherActivitiesApi.remove(detail.id)
      setActivities((current) => current.filter((activity) => activity.id !== detail.id))
      clearSelection()
      setNotice('Đã xóa hoạt động.')
    } catch (error) {
      setActionError(errorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }

  async function generateAiDraft() {
    if (!detail) return
    const lessonIds = detail.lessons.filter((lesson) => lesson.status === 'PUBLISHED').map((lesson) => lesson.id)
    if (lessonIds.length === 0) {
      setActionError('Hoạt động cần ít nhất một bài học đã công bố để tạo bản nháp AI.')
      return
    }
    setIsAiLoading(true)
    setActionError('')
    try {
      const result = await teacherActivitiesApi.aiDraft(detail.id, {
        lessonIds,
        questionCount: detail.exercise?.question_count ?? 5,
        difficulty: detail.exercise?.difficulty ?? 'BASIC',
      })
      setAiDraft(result)
      if (result.status !== 'READY') setNotice(result.message ?? 'AI chưa sẵn sàng; giáo viên có thể nhập câu hỏi thủ công.')
    } catch (error) {
      setActionError(errorMessage(error))
    } finally {
      setIsAiLoading(false)
    }
  }

  async function saveAiDraft() {
    if (!detail || !aiDraft || aiDraft.status !== 'READY') return
    const saved = await runAction(
      () => teacherActivitiesApi.putQuestions(detail.id, aiDraft.questions),
      'Đã lưu bản nháp AI. Giáo viên cần kiểm tra trước khi công bố.'
    )
    if (saved) setAiDraft(null)
  }

  if (isLoading) return <div className="page-content ta-page"><p>Đang tải hoạt động...</p></div>
  if (loadError || !context) return <div className="page-content ta-page"><div className="ta-error" role="alert"><AlertCircle size={17} /> {loadError || 'Không tìm thấy môn học.'}<button type="button" onClick={() => { setIsLoading(true); setLoadError(''); setReloadKey((value) => value + 1) }}><RotateCcw size={14} /> Thử lại</button></div></div>

  if (activityMode === 'NOTEBOOK') {
    return (
      <div className="page-content ta-page">
        <div className="page-heading"><span className="section-kicker">HOẠT ĐỘNG</span><h1>{context.subjectName} · Kiểm tra vở</h1><p>{context.classroomName} · Luồng Notebook Check dùng API thật.</p></div>
        <ActivityModeTabs mode={activityMode} onChange={setActivityMode} />
        <NotebookChecksPanel classroomSubjectId={context.classroomSubjectId} readOnly={context.readOnly} />
      </div>
    )
  }

  return (
    <div className="page-content ta-page">
      <div className="page-heading"><span className="section-kicker">HOẠT ĐỘNG</span><h1>{context.subjectName} · Quiz & Tự luận</h1><p>{context.classroomName} · Dữ liệu hoạt động được tải từ backend.</p></div>
      <ActivityModeTabs mode={activityMode} onChange={setActivityMode} />
      {context.readOnly && <div className="ta-readonly"><Archive size={16} /> Lớp đã lưu trữ. Bạn chỉ có thể xem hoạt động và câu hỏi.</div>}
      {notice && <p className="ta-success" role="status">{notice}</p>}
      {actionError && <p className="ta-error" role="alert"><AlertCircle size={16} /> {actionError}</p>}

      {!activityForm && !selectedActivityId && <>
        {!context.readOnly && <div className="ta-actions"><button type="button" className="ta-primary" onClick={() => setActivityForm({ mode: 'create', type: 'QUIZ' })}><Plus size={16} /> Tạo Quiz</button><button type="button" className="ta-primary" onClick={() => setActivityForm({ mode: 'create', type: 'WRITTEN' })}><Plus size={16} /> Tạo Tự luận</button></div>}
        <section className="panel ta-editor"><div className="ta-history-filters"><label>Tìm hoạt động<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tên hoạt động" /></label><label>Loại<select value={filterType} onChange={(event) => setFilterType(event.target.value as ActivityFilter)}><option value="">Tất cả</option><option value="QUIZ">Quiz</option><option value="WRITTEN">Tự luận</option></select></label><label>Trạng thái<select value={filterStatus} onChange={(event) => setFilterStatus(event.target.value as StatusFilter)}><option value="">Tất cả</option><option value="DRAFT">Bản nháp</option><option value="PUBLISHED">Đang mở</option><option value="CLOSED">Đã đóng</option></select></label></div>{visibleActivities.length === 0 ? <p className="ta-empty">Chưa có hoạt động phù hợp.</p> : <div className="ta-activity-list">{visibleActivities.map((activity) => <button type="button" className="ta-activity-row" key={activity.id} onClick={() => selectActivity(activity.id)}><div><strong>{activity.title}</strong><small>{activityTypeLabel(activity)} · {activity.submissionCount} bài nộp · Đóng: {formatDate(activity.closes_at)}</small></div><span className={`ta-status ${activity.status === 'CLOSED' ? 'closed' : ''}`}>{statusLabels[activity.status]}</span><span>Xem chi tiết</span></button>)}</div>}</section>
      </>}

      {activityForm && <section className="panel ta-editor"><div className="ta-editor-head"><span className="ta-step">ACTIVITY API</span><h2>{activityForm.mode === 'edit' ? 'Sửa hoạt động' : activityForm.type === 'QUIZ' ? 'Tạo Quiz' : 'Tạo Tự luận'}</h2><p>{activityForm.mode === 'edit' ? 'Giáo viên kiểm tra và lưu thay đổi trước khi tiếp tục.' : 'Gemini tạo bản nháp trong luồng hiện tại; chỉ khi giáo viên xác nhận thì hoạt động mới được công bố.'}</p></div><ExerciseActivityForm activity={activityForm.activity} exerciseType={activityForm.type} lessons={lessons} classroomSubjectId={classroomSubjectId} isSaving={isSaving} onCancel={() => setActivityForm(null)} onSave={saveActivity} /></section>}

      {selectedActivityId && !activityForm && <>
        <button type="button" className="ta-back" onClick={clearSelection}>← Danh sách hoạt động</button>
        {isLoadingDetail && <div className="panel ta-empty">Đang tải chi tiết hoạt động...</div>}
        {!isLoadingDetail && detail && <ActivityDetail activity={detail} readOnly={context.readOnly} isSaving={isSaving} isAiLoading={isAiLoading} aiDraft={aiDraft} reopenAt={reopenAt} onReopenAtChange={setReopenAt} onEdit={() => setActivityForm({ mode: 'edit', type: detail.exercise?.exercise_type ?? 'QUIZ', activity: detail })} onDelete={() => void deleteActivity()} onPublish={() => void runAction(() => teacherActivitiesApi.publish(detail.id), 'Đã công bố hoạt động và tạo thông báo.')} onClose={() => void runAction(() => teacherActivitiesApi.close(detail.id), 'Đã đóng nhận bài.')} onReopen={() => void runAction(() => teacherActivitiesApi.reopen(detail.id, { closesAt: toIso(reopenAt) }), 'Đã mở lại hoạt động.')} onGenerateAi={() => void generateAiDraft()} onSaveAi={() => void saveAiDraft()} />}
      </>}
    </div>
  )
}

function ActivityModeTabs({ mode, onChange }: { mode: ActivityMode; onChange: (mode: ActivityMode) => void }) {
  return (
    <div className="tn-mode-tabs" role="tablist" aria-label="Loại hoạt động">
      <button type="button" role="tab" aria-selected={mode === 'EXERCISE'} className={mode === 'EXERCISE' ? 'is-active' : ''} onClick={() => onChange('EXERCISE')}>Quiz & Tự luận</button>
      <button type="button" role="tab" aria-selected={mode === 'NOTEBOOK'} className={mode === 'NOTEBOOK' ? 'is-active' : ''} onClick={() => onChange('NOTEBOOK')}>Kiểm tra vở</button>
    </div>
  )
}

function ActivityDetail({ activity, readOnly, isSaving, isAiLoading, aiDraft, reopenAt, onReopenAtChange, onEdit, onDelete, onPublish, onClose, onReopen, onGenerateAi, onSaveAi }: { activity: TeacherActivityDetail; readOnly: boolean; isSaving: boolean; isAiLoading: boolean; aiDraft: TeacherAiDraftResult | null; reopenAt: string; onReopenAtChange: (value: string) => void; onEdit: () => void; onDelete: () => void; onPublish: () => void; onClose: () => void; onReopen: () => void; onGenerateAi: () => void; onSaveAi: () => void }) {
  return <section className="panel ta-editor"><div className="ta-editor-head"><span className="ta-step">{activityTypeLabel(activity)} · ACTIVITY API</span><h2>{activity.title}</h2><p>{activity.description || 'Không có mô tả.'}</p><p>Trạng thái: <strong>{statusLabels[activity.status]}</strong> · {activity.submissionCount} bài nộp · Hạn: {formatDate(activity.closes_at)}</p></div>{!readOnly && <div className="ta-actions"><button type="button" className="ta-secondary" onClick={onEdit} disabled={isSaving || activity.submissionCount > 0}>Sửa nội dung</button>{activity.status === 'DRAFT' && <button type="button" className="ta-primary" onClick={onPublish} disabled={isSaving || activity.questions.length === 0}>Công bố</button>}{activity.status === 'PUBLISHED' && <button type="button" className="ta-secondary" onClick={onClose} disabled={isSaving}>Đóng nhận bài</button>}{activity.status === 'CLOSED' && <><label className="ta-inline-field">Hạn mới<input type="datetime-local" value={reopenAt} onChange={(event) => onReopenAtChange(event.target.value)} /></label><button type="button" className="ta-secondary" onClick={onReopen} disabled={isSaving}>Mở lại</button></>} {activity.submissionCount === 0 && <button type="button" className="ta-delete-btn" onClick={onDelete} disabled={isSaving}><Trash2 size={14} /> Xóa</button>}</div>}{activity.status === 'DRAFT' && !readOnly && <div className="ta-ai-box"><div><strong><Sparkles size={15} /> Bản nháp AI</strong><p>AI chỉ tạo gợi ý; giáo viên phải kiểm tra và lưu trước khi công bố.</p></div><button type="button" className="ta-secondary" onClick={onGenerateAi} disabled={isAiLoading}>{isAiLoading ? 'Đang tạo...' : 'Tạo bản nháp AI'}</button></div>}{aiDraft?.status === 'READY' && <div className="ta-ai-preview"><strong>AI đã tạo {aiDraft.questions.length} câu hỏi</strong><p>Hãy đọc kỹ nội dung, sau đó lưu vào hoạt động để giáo viên tiếp tục chỉnh sửa.</p><button type="button" className="ta-primary" onClick={onSaveAi} disabled={isSaving}>Lưu bản nháp AI</button>{aiDraft.questions.map((question) => <article key={`${question.lessonId}-${question.prompt}`}><strong>Câu hỏi</strong><p>{question.prompt}</p></article>)}</div>}{aiDraft?.status === 'UNAVAILABLE' && <p className="ta-inline-note">Dịch vụ AI chưa được kích hoạt. Giáo viên có thể nhập câu hỏi thủ công.</p>}{activity.questions.length === 0 ? <div className="ta-empty"><FileText size={24} /><p>Chưa có câu hỏi. Hãy sửa hoạt động để thêm câu hỏi.</p></div> : <div className="ta-api-question-list">{activity.questions.map((question, index) => <article className="ta-api-question" key={question.id}><h3>Câu {index + 1}</h3><p><strong>{question.prompt}</strong></p>{question.options.length > 0 && <ol type="A">{question.options.map((option) => <li key={option}>{option}{option === question.answerKey ? ' · Đáp án đúng' : ''}</li>)}</ol>}{question.markingCriteria && <p><strong>Tiêu chí chấm:</strong> {question.markingCriteria}</p>}<p className="ta-muted">{question.maxPoints} điểm · Nguồn: {activity.lessons.find((lesson) => lesson.id === question.lessonId)?.title ?? 'Bài học'}</p></article>)}</div>}</section>
}
