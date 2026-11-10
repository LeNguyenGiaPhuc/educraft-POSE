import { useState } from 'react'
import { BookOpen, LockKeyhole } from 'lucide-react'
import { Link } from 'react-router'
import { StudentScenarioControl } from '../ScenarioControl'
import { useStudentScenario } from '../useStudentScenario'
import { canUseLessonSource, getAccessibleSubjects, getVisibleLessons } from '../studentRules'
import { practiceExamples, practiceStateOptions, type PracticeExampleState, type PracticeKind } from './practice.mock'
import '../student.css'
import './practice.css'

export function PracticePage() {
  const { scenario } = useStudentScenario()
  const subjects = getAccessibleSubjects(scenario).current
  const [subjectId, setSubjectId] = useState('history-11a2')
  const [lessonIds, setLessonIds] = useState<string[]>([])
  const [kind, setKind] = useState<PracticeKind>('QUIZ')
  const [count, setCount] = useState('5')
  const [difficulty, setDifficulty] = useState('medium')
  const [exampleState, setExampleState] = useState<PracticeExampleState>('questions')
  const subject = subjects.find((item) => item.id === subjectId) ?? subjects[0]
  const lessons = subject ? getVisibleLessons(subject.id) : []
  const eligible = lessons.filter((lesson) => canUseLessonSource(lesson, scenario))
  const selected = eligible.filter((lesson) => lessonIds.includes(lesson.id))
  const examples = practiceExamples.filter((example) => selected.some((lesson) => lesson.id === example.lessonId && lesson.materials.some((material) => material.id === example.materialId && material.processing === 'PROCESSED')))
  const validCount = /^\d+$/.test(count) && Number(count) >= 1 && Number(count) <= 20

  return <div className="page-content student-page practice-page">
    <header className="page-heading"><span className="eyebrow"><span className="eyebrow-line" />TỰ HỌC</span><h1>Luyện tập độc lập</h1><p>Tự chọn nội dung để ôn luyện trong một môn học của lớp hiện tại.</p></header>
    <StudentScenarioControl />
    <p className="student-notice">Bản xem trước bằng dữ liệu mẫu. Phiên tự luyện riêng tư, tách khỏi bài giáo viên giao và không cần giáo viên duyệt. Chưa tạo câu hỏi, gửi đáp án hay chấm điểm qua AI.</p>
    {!subject ? <section className="panel student-empty"><LockKeyhole size={30} /><h2>Chưa thể bắt đầu phiên luyện tập</h2><p>{scenario === 'history-only' ? 'Lớp đã học chỉ cho phép xem lại. Bạn cần có lớp hiện tại để tạo phiên tự luyện mới.' : 'Bạn chưa được phân lớp. Môn học và nguồn luyện tập sẽ xuất hiện sau khi được phân lớp.'}</p></section> : <div className="practice-layout">
      <section className="panel practice-config" aria-labelledby="practice-config-title">
        <h2 id="practice-config-title">Nội dung luyện tập</h2>
        <label className="student-field">Môn học<select value={subject.id} onChange={(event) => { setSubjectId(event.target.value); setLessonIds([]) }}>{subjects.map((item) => <option value={item.id} key={item.id}>{item.name} · {item.classroomName}</option>)}</select></label>
        <fieldset className="practice-lessons"><legend>Chọn bài học làm nguồn</legend><p className="student-muted">Chỉ học liệu đã công bố và xử lý thành công mới được sử dụng.</p>{lessons.map((lesson) => {
          const available = canUseLessonSource(lesson, scenario)
          return <label key={lesson.id} className="practice-lesson"><input type="checkbox" disabled={!available} checked={available && lessonIds.includes(lesson.id)} onChange={(event) => setLessonIds((previous) => event.target.checked ? [...previous, lesson.id] : previous.filter((id) => id !== lesson.id))} /><span><strong>{lesson.title}</strong><small>{available ? 'Đủ điều kiện làm nguồn' : 'Không khả dụng · học liệu chưa xử lý thành công'}</small></span></label>
        })}</fieldset>
        <div className="practice-options"><label className="student-field">Loại câu hỏi<select value={kind} onChange={(event) => setKind(event.target.value as PracticeKind)}><option value="QUIZ">Trắc nghiệm (Quiz)</option><option value="WRITTEN">Tự luận ngắn</option></select></label><label className="student-field">Số câu hỏi (1–20)<input type="number" min="1" max="20" step="1" value={count} aria-invalid={!validCount} aria-describedby={!validCount ? 'practice-count-error' : undefined} onChange={(event) => setCount(event.target.value)} /></label><label className="student-field">Độ khó<select value={difficulty} onChange={(event) => setDifficulty(event.target.value)}><option value="easy">Cơ bản</option><option value="medium">Vừa</option><option value="hard">Nâng cao</option></select></label></div>
        {!validCount && <p className="student-error" id="practice-count-error">Nhập số nguyên từ 1 đến 20.</p>}
        <button type="button" className="student-action" disabled>Tạo phiên luyện tập · chờ kết nối API</button><p className="student-muted">Cấu hình chỉ lưu tạm trên màn hình. Không có bài làm hay điểm nào được ghi vào hệ thống.</p>
      </section>
      <section className="panel practice-preview" aria-labelledby="practice-preview-title"><div className="student-panel-heading"><div><h2 id="practice-preview-title">Xem trước trạng thái</h2><p>Dữ liệu minh họa, không phải kết quả từ cấu hình</p></div><span className="student-badge muted">Tự luyện riêng</span></div>
        <label className="student-field">Tình huống mẫu<select value={exampleState} onChange={(event) => setExampleState(event.target.value as PracticeExampleState)}>{practiceStateOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label>
        <div className="practice-example" aria-live="polite">{selected.length === 0 ? <div className="practice-message"><BookOpen size={25} /><h3>Chưa đủ bằng chứng</h3><p>{eligible.length ? 'Chọn ít nhất một bài học đủ điều kiện ở bên trái để xem ví dụ có nguồn.' : 'Môn này chưa có học liệu đã công bố và xử lý thành công để luyện tập.'}</p></div> : !validCount ? <p>Kiểm tra lại số câu hỏi trước khi xem cấu hình.</p> : exampleState === 'failed' ? <div className="student-notice"><h3>Ví dụ: tạo câu hỏi thất bại</h3><p>Chưa có bộ câu hỏi hợp lệ. Không tạo phiên hay ghi điểm. Khi kết nối API, bạn có thể thử lại với cùng nguồn.</p></div> : examples.length === 0 ? <p className="student-notice">Chưa có ví dụ được đối chiếu với nguồn đã chọn. Không hiển thị câu hỏi thiếu bằng chứng.</p> : <><p className="student-muted">{selected.length} bài học đã chọn · yêu cầu {count} câu. Dưới đây chỉ là {examples.length} câu minh họa cố định, không phải bộ câu hỏi được tạo mới theo số lượng hoặc độ khó.</p>{examples.map((example, index) => <article className="practice-question" key={example.lessonId}><span className="student-badge">Câu mẫu {index + 1} · {kind === 'QUIZ' ? 'Trắc nghiệm' : 'Tự luận ngắn'}</span><h3>{example.question}</h3>{kind === 'QUIZ' && <ul>{example.choices.map((choice) => <li key={choice}>{choice}</li>)}</ul>}<p><Link className="student-source" to={`/student/subjects#${example.materialId}`}>Nguồn mẫu: {selected.find((lesson) => lesson.id === example.lessonId)?.title} · {example.position}</Link></p>{exampleState === 'pending' ? <><p><strong>Đáp án đã lưu trong ví dụ:</strong> {example.answer}</p><span className="student-badge warning">Đang chờ chấm · chưa có điểm</span><p className="student-muted">Giữ nguyên đáp án trong khi chờ chấm; chưa có giải thích đánh giá hay kết quả thành công.</p></> : <details><summary>Xem đáp án minh họa</summary><p><strong>{example.answer}</strong></p><p>{example.explanation} Nội dung mẫu chưa được đối chiếu với tệp gốc qua API.</p></details>}</article>)}<button type="button" disabled className="student-action secondary">Gửi đáp án để chấm · chờ kết nối API</button></>}</div>
      </section>
    </div>}
  </div>
}
