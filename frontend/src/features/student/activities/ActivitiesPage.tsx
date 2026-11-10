import { useState } from 'react'
import { ClipboardCheck } from 'lucide-react'
import { StudentScenarioControl } from '../ScenarioControl'
import { useStudentScenario } from '../useStudentScenario'
import { getAccessibleSubjects } from '../studentRules'
import { assignedExercises, notebookActivity } from './activities.mock'
import { ExerciseWork } from './ExerciseWork'
import { NotebookWork } from './NotebookWork'
import './activities.css'

export function ActivitiesPage() {
  const { scenario } = useStudentScenario()
  const accessible = getAccessibleSubjects(scenario)
  const subjects = [...accessible.current, ...accessible.historic]
  const [subjectId, setSubjectId] = useState('history-11a2')
  const subject = subjects.find((item) => item.id === subjectId) ?? subjects[0]
  const [selectedId, setSelectedId] = useState('quiz-preview-11a2')
  const visibleExercises = assignedExercises.filter((item) => item.classroomSubjectId === subject?.id)
  const showNotebook = subject?.id === notebookActivity.classroomSubjectId
  const selected = visibleExercises.find((item) => item.id === selectedId) ?? visibleExercises[0]
  const notebookSelected = showNotebook && (selectedId === notebookActivity.id || !selected)

  return <div className="page-content student-page sa-page"><div className="page-heading"><h1>Hoạt động được giao</h1><p>Quiz, câu hỏi tự luận và kiểm tra vở do giáo viên công bố trong các môn của lớp.</p></div>
    <div className="student-preview"><div><strong>Bản xem trước với dữ liệu mẫu</strong><p>Nhập câu trả lời và chọn ảnh chỉ để thử giao diện; chưa có bài nào được nộp hoặc chấm từ màn này.</p></div><StudentScenarioControl /></div>
    {!subjects.length ? <div className="panel student-empty"><ClipboardCheck size={29} /><h2>Chưa có hoạt động để làm</h2><p>Admin cần phân bạn vào một lớp đang học. Khi đó, hoạt động giáo viên công bố sẽ hiện ở đây.</p></div> : <><div className="student-toolbar"><label>Môn học<select value={subject?.id ?? ''} onChange={(event) => { setSubjectId(event.target.value); setSelectedId('') }}>{subjects.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.classroomName}{item.historic ? ' · đã học' : ''}</option>)}</select></label></div>
      <div className="sa-layout"><section className="panel sa-list"><h2>Danh sách hoạt động</h2>{visibleExercises.map((item) => <button type="button" key={item.id} className={selected?.id === item.id && !notebookSelected ? 'active' : ''} onClick={() => setSelectedId(item.id)}><strong>{item.title}</strong><small>{item.kind === 'QUIZ' ? 'Quiz' : 'Tự luận ngắn'} · {item.submitted ? 'Đã nộp' : item.state === 'OPEN' ? 'Đang mở' : 'Đã đóng'}</small></button>)}{showNotebook && <button type="button" className={notebookSelected ? 'active' : ''} onClick={() => setSelectedId(notebookActivity.id)}><strong>{notebookActivity.title}</strong><small>Kiểm tra vở · đánh giá theo tiêu chí</small></button>}{!visibleExercises.length && !showNotebook && <p className="student-muted">Môn này chưa có hoạt động trong dữ liệu mẫu.</p>}</section>
      {notebookSelected ? <NotebookWork readOnly={Boolean(subject?.historic)} /> : selected ? <ExerciseWork key={selected.id} activity={selected} readOnly={Boolean(subject?.historic)} /> : <section className="panel student-empty"><h2>Chưa có hoạt động</h2><p>Hãy chọn môn khác để xem công việc của bạn.</p></section>}</div></>}
  </div>
}
