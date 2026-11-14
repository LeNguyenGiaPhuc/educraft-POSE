import { useState } from 'react'
import { ArrowLeft, ArrowRight, BookCheck, ClipboardCheck, ClipboardList } from 'lucide-react'
import { useSearchParams } from 'react-router'
import { StudentScenarioControl } from '../ScenarioControl'
import { useStudentScenario } from '../useStudentScenario'
import { getAccessibleSubjects } from '../studentRules'
import { exerciseResults, notebookResults } from '../results/results.mock'
import { ActivityResultDetail } from '../results/ResultsPage'
import { assignedExercises, notebookActivity, type AssignedExercise } from './activities.mock'
import { ExerciseWork } from './ExerciseWork'
import { NotebookWork } from './NotebookWork'
import './activities.css'
import './activities-list.css'

type ActivityItem = {
  id: string
  classroomSubjectId: string
  title: string
  kind: 'QUIZ' | 'WRITTEN' | 'NOTEBOOK'
  state: 'OPEN' | 'CLOSED'
  submitted: boolean
  exercise?: AssignedExercise
}

const notebookItem: ActivityItem = {
  id: notebookActivity.id,
  classroomSubjectId: notebookActivity.classroomSubjectId,
  title: notebookActivity.title,
  kind: 'NOTEBOOK',
  state: 'OPEN',
  submitted: true,
}

function resultStatus(item: ActivityItem) {
  if (item.kind === 'NOTEBOOK') return notebookResults.some((result) => result.activityId === item.id) ? 'GRADED' : 'PENDING'
  return exerciseResults.find((result) => result.activityId === item.id)?.status ?? item.exercise?.grading ?? 'PENDING'
}

function activityType(item: ActivityItem) {
  if (item.kind === 'NOTEBOOK') return 'Kiểm tra vở'
  return item.kind === 'QUIZ' ? 'Trắc nghiệm' : 'Tự luận ngắn'
}

function statusLabel(item: ActivityItem, view: 'assigned' | 'results') {
  const status = view === 'results' ? resultStatus(item) : item.submitted ? 'SUBMITTED' : item.state === 'OPEN' ? 'OPEN' : 'CLOSED'
  return status.replace('GRADED', 'Đã chấm').replace('PENDING', 'Chờ chấm').replace('FAILED', 'Chấm lỗi').replace('SUBMITTED', 'Đã nộp').replace('OPEN', 'Đang mở').replace('CLOSED', 'Đã đóng')
}

function activityDescription(item: ActivityItem) {
  if (item.kind === 'NOTEBOOK') return 'Ghi chú và ảnh chụp sẽ được giáo viên xem theo tiêu chí.'
  return `${item.exercise?.questions.length ?? 0} câu hỏi trong hoạt động được giáo viên giao.`
}

export function ActivitiesPage() {
  const { scenario } = useStudentScenario()
  const [params, setParams] = useSearchParams()
  const [subjectFilter, setSubjectFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedId, setSelectedId] = useState('')
  const view = params.get('view') === 'results' ? 'results' : 'assigned'
  const classScope = scenario === 'history-only' || params.get('class') === 'history' ? 'history' : 'current'
  const accessible = getAccessibleSubjects(scenario)
  const subjects = classScope === 'history' ? accessible.historic : accessible.current
  const subjectIds = new Set(subjects.map((subject) => subject.id))
  const items: ActivityItem[] = assignedExercises.filter((activity) => subjectIds.has(activity.classroomSubjectId)).map((activity) => ({
    id: activity.id,
    classroomSubjectId: activity.classroomSubjectId,
    title: activity.title,
    kind: activity.kind,
    state: activity.state,
    submitted: activity.submitted,
    exercise: activity,
  }))
  if (subjectIds.has(notebookItem.classroomSubjectId)) items.push(notebookItem)

  const visibleItems = items.filter((item) => {
    if (subjectFilter !== 'all' && item.classroomSubjectId !== subjectFilter) return false
    if (view === 'results') {
      const status = resultStatus(item)
      if (!item.submitted) return false
      return statusFilter === 'all' || status === statusFilter
    }
    if (statusFilter === 'open') return item.state === 'OPEN' && !item.submitted
    if (statusFilter === 'submitted') return item.submitted
    if (statusFilter === 'closed') return item.state === 'CLOSED'
    return true
  })
  const selected = visibleItems.find((item) => item.id === selectedId)
  const selectedSubject = subjects.find((subject) => subject.id === selected?.classroomSubjectId)

  function updateQuery(name: 'view' | 'class', value: string) {
    const updated = new URLSearchParams(params)
    if ((name === 'view' && value === 'assigned') || (name === 'class' && value === 'current')) updated.delete(name)
    else updated.set(name, value)
    setParams(updated)
    setSelectedId('')
    setSubjectFilter('all')
    setStatusFilter('all')
  }

  return <div className="page-content student-page activity-hub">
    <header className="page-heading activity-heading"><div><span className="eyebrow"><span className="eyebrow-line" />HOẠT ĐỘNG HỌC TẬP</span><h1>{view === 'assigned' ? 'Bài được giao' : 'Kết quả & phản hồi'}</h1><p>{view === 'assigned' ? 'Xem danh sách hoạt động, sau đó mở từng bài để làm và nộp.' : 'Mở từng hoạt động để xem kết quả và phản hồi của giáo viên.'}</p></div><StudentScenarioControl /></header>
    {scenario === 'unassigned' ? <section className="panel student-empty"><ClipboardCheck size={30} /><h2>Chưa có bài được giao</h2><p>Hoạt động sẽ xuất hiện sau khi em được xếp vào một lớp đang học.</p></section> : <>
      <div className="activity-tabs" role="tablist" aria-label="Nội dung hoạt động"><button type="button" role="tab" aria-selected={view === 'assigned'} onClick={() => updateQuery('view', 'assigned')}><ClipboardList size={17} /> Bài được giao</button><button type="button" role="tab" aria-selected={view === 'results'} onClick={() => updateQuery('view', 'results')}><BookCheck size={17} /> Kết quả & phản hồi</button></div>
      {!selected && <><div className="activity-filters"><label>Phạm vi lớp<select value={classScope} disabled={scenario === 'history-only'} onChange={(event) => updateQuery('class', event.target.value)}><option value="current">Lớp hiện tại · 11A2</option><option value="history">Lớp đã học · 10A1</option></select></label><label>Môn học<select value={subjectFilter} onChange={(event) => { setSubjectFilter(event.target.value); setSelectedId('') }}><option value="all">Tất cả môn</option>{subjects.map((subject) => <option value={subject.id} key={subject.id}>{subject.name}</option>)}</select></label><label>Trạng thái<select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setSelectedId('') }}><option value="all">Tất cả trạng thái</option>{view === 'assigned' ? <><option value="open">Cần làm</option><option value="submitted">Đã nộp</option><option value="closed">Đã đóng</option></> : <><option value="GRADED">Đã chấm</option><option value="PENDING">Chờ chấm</option><option value="FAILED">Chấm lỗi</option></>}</select></label></div>
        {classScope === 'history' && <p className="student-notice">Lớp đã học chỉ cho phép xem lại bài đã nộp và kết quả cũ.</p>}
      </>}
      {selected ? <section className="activity-detail-page" aria-live="polite"><button type="button" className="activity-back-button" onClick={() => setSelectedId('')}><ArrowLeft size={16} /> Về danh sách bài</button><div className="activity-detail-title"><div><span>{selectedSubject?.name} · {selectedSubject?.classroomName}</span><h2>{selected.title}</h2></div></div>{view === 'results' ? <ActivityResultDetail activityId={selected.id} /> : selected.kind === 'NOTEBOOK' ? <NotebookWork readOnly={classScope === 'history'} /> : <ExerciseWork key={selected.id} activity={selected.exercise!} readOnly={classScope === 'history'} />}</section> : <section className="activity-list-page" aria-label={view === 'assigned' ? 'Danh sách bài được giao' : 'Danh sách kết quả'}><div className="activity-list-heading"><div><span className="eyebrow"><span className="eyebrow-line" />DANH SÁCH HOẠT ĐỘNG</span><h2>{view === 'assigned' ? 'Đang mở và đã chốt' : 'Bài đã có kết quả'}</h2></div><span>{visibleItems.length} mục</span></div><div className="activity-list-cards">{visibleItems.length ? visibleItems.map((item) => {
        const subject = subjects.find((entry) => entry.id === item.classroomSubjectId)
        const Icon = item.kind === 'QUIZ' ? ClipboardList : item.kind === 'NOTEBOOK' ? BookCheck : ClipboardCheck
        return <button className="activity-list-card" type="button" key={item.id} onClick={() => setSelectedId(item.id)}><span className="activity-list-card-icon" aria-hidden="true"><Icon size={21} /></span><span className="activity-list-card-copy"><small>{subject?.name} · {activityType(item)}</small><strong>{item.title}</strong><p>{activityDescription(item)}</p><span className="activity-list-card-meta">{view === 'assigned' && !item.submitted && item.state === 'OPEN' ? 'Mở để bắt đầu làm bài' : 'Mở để xem chi tiết'}</span></span><span className="activity-list-card-status">{statusLabel(item, view)}</span><ArrowRight className="activity-list-card-arrow" size={18} /></button>
      }) : <p className="student-muted">Không có hoạt động phù hợp với bộ lọc.</p>}</div></section>}
    </>}
  </div>
}
