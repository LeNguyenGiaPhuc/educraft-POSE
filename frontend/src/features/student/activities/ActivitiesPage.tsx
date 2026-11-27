import { useState } from 'react'
import { ArrowLeft, ArrowRight, BookCheck, ClipboardCheck, ClipboardList } from 'lucide-react'
import { useSearchParams } from 'react-router'
import type { AssignedExercise, ExerciseQuestion } from './activities.mock'
import type { StudentActivity, StudentWorkspace } from '../../../api/client'
import { useApiData } from '../../../api/useApiData'
import { StudentScenarioControl } from '../ScenarioControl'
import { useStudentScenario } from '../useStudentScenario'
import { ExerciseWork } from './ExerciseWork'
import { NotebookWork } from './NotebookWork'
import { ResultsPage } from '../results/ResultsPage'
import './activities.css'
import './activities-list.css'

function toExercise(activity: StudentActivity): AssignedExercise | null {
  if (!activity.exercise) return null
  const submission = activity.exercise.submissions[0]
  const questions: ExerciseQuestion[] = activity.exercise.questions.map((question) => ({
    id: question.id,
    prompt: question.prompt,
    options: Array.isArray(question.options) ? question.options.filter((option): option is string => typeof option === 'string') : undefined,
    lesson: question.lesson.title,
  }))
  const submittedAnswers = submission ? Object.fromEntries(submission.answers.map((answer) => [answer.question_id, answer.answer])) : undefined
  return {
    id: activity.id,
    classroomSubjectId: activity.classroom_subject_id,
    title: activity.title,
    kind: activity.exercise.exercise_type,
    state: activity.status === 'PUBLISHED' && (!activity.closes_at || Date.parse(activity.closes_at) > Date.now()) ? 'OPEN' : 'CLOSED',
    dueAt: activity.closes_at ?? activity.published_at ?? new Date().toISOString(),
    submitted: Boolean(submission),
    questions,
    submittedAnswers,
    grading: submission?.grading_status as AssignedExercise['grading'],
  }
}

function activityKind(activity: StudentActivity) {
  if (activity.kind === 'NOTEBOOK_CHECK') return 'Kiểm tra vở'
  return activity.exercise?.exercise_type === 'QUIZ' ? 'Trắc nghiệm' : 'Tự luận ngắn'
}

export function ActivitiesPage() {
  const { scenario } = useStudentScenario()
  const [params, setParams] = useSearchParams()
  const { data: workspace } = useApiData<StudentWorkspace>('/student/workspace')
  const { data: activities, loading, error } = useApiData<StudentActivity[]>('/student/activities')
  const [subjectFilter, setSubjectFilter] = useState(() => params.get('subject') ?? 'all')
  const [selectedId, setSelectedId] = useState('')
  const view = params.get('view') === 'results' ? 'results' : 'assigned'
  const historyScope = scenario === 'history-only' || params.get('class') === 'history'
  const visibleMemberships = historyScope ? workspace?.history ?? [] : workspace?.current ? [workspace.current] : []
  const subjectIds = new Set(visibleMemberships.flatMap((membership) => membership.subjects.map((subject) => subject.id)))
  const subjects = visibleMemberships.flatMap((membership) => membership.subjects.map((subject) => ({ ...subject, classroomName: membership.classroom.name })))
  const items = (activities ?? []).filter((item) => subjectIds.has(item.classroom_subject_id))
  const visibleItems = items.filter((item) => subjectFilter === 'all' || item.classroom_subject_id === subjectFilter)
  const selected = visibleItems.find((item) => item.id === selectedId)
  const selectedSubject = selected && subjects.find((item) => item.id === selected.classroom_subject_id)

  function updateView(next: 'assigned' | 'results') {
    const updated = new URLSearchParams(params)
    if (next === 'assigned') updated.delete('view')
    else updated.set('view', next)
    setParams(updated)
    setSelectedId('')
  }

  if (view === 'results') return <ResultsPage />
  if (loading) return <div className="page-content student-page"><p role="status">Đang tải hoạt động…</p></div>
  if (error) return <div className="page-content student-page"><section className="panel student-empty" role="alert"><h2>Không tải được hoạt động</h2><p>{error}</p></section></div>

  return <div className="page-content student-page activity-hub">
    <header className="page-heading activity-heading"><div><span className="eyebrow"><span className="eyebrow-line" />HOẠT ĐỘNG HỌC TẬP</span><h1>Bài được giao</h1><p>Xem danh sách hoạt động, sau đó mở từng bài để làm và nộp.</p></div><StudentScenarioControl /></header>
    <div className="activity-tabs" role="tablist" aria-label="Nội dung hoạt động"><button type="button" role="tab" aria-selected onClick={() => updateView('assigned')}><ClipboardList size={17} /> Bài được giao</button><button type="button" role="tab" aria-selected={false} onClick={() => updateView('results')}><BookCheck size={17} /> Kết quả & phản hồi</button></div>
    {scenario === 'unassigned' ? <section className="panel student-empty"><ClipboardCheck size={30} /><h2>Chưa có bài được giao</h2><p>Hoạt động sẽ xuất hiện sau khi em được xếp vào một lớp đang học.</p></section> : <>
      {!selected && <div className="activity-filters"><label>Phạm vi lớp<select value={historyScope ? 'history' : 'current'} disabled={scenario === 'history-only'} onChange={(event) => { const updated = new URLSearchParams(params); if (event.target.value === 'history') updated.set('class', 'history'); else updated.delete('class'); setParams(updated); setSelectedId('') }}><option value="current">Lớp hiện tại · {workspace?.current?.classroom.name ?? '—'}</option><option value="history" disabled={!workspace?.history.length}>Lớp đã học · chỉ xem</option></select></label><label>Môn học<select value={subjectFilter} onChange={(event) => { setSubjectFilter(event.target.value); setSelectedId('') }}><option value="all">Tất cả môn</option>{subjects.map((subject) => <option value={subject.id} key={subject.id}>{subject.name}</option>)}</select></label></div>}
      {historyScope && <p className="student-notice">Lớp đã học chỉ cho phép xem lại bài đã nộp và kết quả cũ.</p>}
      {selected ? <section className="activity-detail-page" aria-live="polite"><button type="button" className="activity-back-button" onClick={() => setSelectedId('')}><ArrowLeft size={16} /> Về danh sách bài</button><div className="activity-detail-title"><div><span>{selectedSubject?.name} · {selectedSubject?.classroomName}</span><h2>{selected.title}</h2></div></div>{selected.kind === 'NOTEBOOK_CHECK' ? <NotebookWork readOnly={historyScope} activity={selected} /> : <ExerciseWork key={selected.id} activity={toExercise(selected)!} readOnly={historyScope} />}</section> : <section className="activity-list-page" aria-label="Danh sách bài được giao"><div className="activity-list-heading"><div><span className="eyebrow"><span className="eyebrow-line" />DANH SÁCH HOẠT ĐỘNG</span><h2>{historyScope ? 'Hoạt động lớp đã học' : 'Hoạt động đã công bố'}</h2></div><span>{visibleItems.length} mục</span></div><div className="activity-list-cards">{visibleItems.length ? visibleItems.map((item) => {
        const subject = subjects.find((entry) => entry.id === item.classroom_subject_id)
        const submitted = item.exercise?.submissions.length ? 'Đã nộp' : item.kind === 'NOTEBOOK_CHECK' && item.notebookCheck?.periods.some((period) => period.submissions.length) ? 'Đã nộp' : item.status === 'CLOSED' ? 'Đã đóng' : 'Đang mở'
        const Icon = item.kind === 'NOTEBOOK_CHECK' ? BookCheck : item.exercise?.exercise_type === 'QUIZ' ? ClipboardList : ClipboardCheck
        return <button className="activity-list-card" type="button" key={item.id} onClick={() => setSelectedId(item.id)}><span className="activity-list-card-icon" aria-hidden="true"><Icon size={21} /></span><span className="activity-list-card-copy"><small>{subject?.name} · {activityKind(item)}</small><strong>{item.title}</strong><p>{item.kind === 'NOTEBOOK_CHECK' ? 'Xem thời hạn, tiêu chí và trạng thái bài nộp.' : `${item.exercise?.questions.length ?? 0} câu hỏi trong hoạt động được giáo viên giao.`}</p><span className="activity-list-card-meta">{submitted === 'Đang mở' ? 'Mở để bắt đầu làm bài' : 'Mở để xem chi tiết'}</span></span><span className="activity-list-card-status">{submitted}</span><ArrowRight className="activity-list-card-arrow" size={18} /></button>
      }) : <p className="student-muted">Chưa có hoạt động được công bố trong phạm vi lớp này.</p>}</div></section>}
    </>}
  </div>
}
