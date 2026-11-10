import { useState } from 'react'
import { BookOpen, FileText, GraduationCap, LockKeyhole } from 'lucide-react'
import { StudentScenarioControl } from '../ScenarioControl'
import { useStudentScenario } from '../useStudentScenario'
import { studentLessons } from '../fixtures'
import { getAccessibleSubjects, getVisibleLessons } from '../studentRules'
import '../student.css'

export function SubjectsPage() {
  const { scenario } = useStudentScenario()
  const sourceId = window.location.hash.slice(1)
  const sourceLesson = sourceId ? studentLessons.find((item) => item.id === sourceId || item.materials.some((material) => material.id === sourceId)) : undefined
  const [subjectId, setSubjectId] = useState(sourceLesson?.classroomSubjectId ?? 'history-11a2')
  const [lessonId, setLessonId] = useState(sourceLesson?.id ?? 'lesson-cmt8-11a2')
  const { current, historic } = getAccessibleSubjects(scenario)
  const subjects = [...current, ...historic]
  const selected = subjects.find((subject) => subject.id === subjectId) ?? subjects[0]
  const lessons = selected ? getVisibleLessons(selected.id) : []
  const lesson = lessons.find((item) => item.id === lessonId) ?? lessons[0]

  return <div className="page-content student-page">
    <header className="page-heading"><span className="eyebrow"><span className="eyebrow-line" />GÓC HỌC TẬP</span><h1>Môn học của tôi</h1><p>Học liệu đã công bố của lớp hiện tại và những lớp bạn đã học.</p></header>
    <StudentScenarioControl />
    {subjects.length === 0 ? <section className="panel student-empty"><GraduationCap size={34} /><h2>Bạn chưa được xếp lớp</h2><p>Liên hệ giáo viên hoặc quản trị viên để được thêm vào lớp. Môn học và hoạt động mới sẽ xuất hiện khi có phân lớp.</p></section> : <>
      {current.length === 0 && <p className="student-notice">Bạn chưa có lớp hiện tại. Học liệu lớp trước vẫn có thể xem lại; chưa thể bắt đầu hoạt động mới.</p>}
      <div className="student-subject-groups">{[{ title: 'Lớp hiện tại', items: current }, { title: 'Lớp đã học', items: historic }].map((group) => group.items.length > 0 && <section key={group.title}><h2 className="student-section-title">{group.title}</h2><div className="student-subject-grid">{group.items.map((subject) => <button type="button" key={subject.id} className={`student-subject-card ${selected?.id === subject.id ? 'is-selected' : ''}`} aria-pressed={selected?.id === subject.id} onClick={() => { setSubjectId(subject.id); setLessonId('') }}><span className="student-card-top"><BookOpen size={21} /><span className={`student-badge ${subject.historic ? 'muted' : ''}`}>{subject.historic ? 'Chỉ xem lại' : 'Đang học'}</span></span><strong>{subject.name}</strong><span>Lớp {subject.classroomName} · {subject.academicYear}</span><small>{subject.teacherName}</small></button>)}</div></section>)}</div>
      {selected && <section className="panel student-lessons" aria-label="Bài học đã công bố"><div className="student-panel-heading"><div><h2>{selected.name} · {selected.classroomName}</h2><p>{lessons.length} bài học đã công bố</p></div>{selected.historic && <span className="student-badge muted"><LockKeyhole size={13} /> Lớp đã học · chỉ đọc</span>}</div><div className="student-detail-grid"><nav className="student-lesson-list" aria-label="Chọn bài học">{lessons.map((item) => <button key={item.id} type="button" aria-pressed={lesson?.id === item.id} className={lesson?.id === item.id ? 'is-selected' : ''} onClick={() => setLessonId(item.id)}><BookOpen size={17} /><span>{item.title}</span></button>)}</nav><div className="student-lesson-detail" aria-live="polite">{lesson ? <><span className="student-badge">Đã công bố</span><h3 id={lesson.id}>{lesson.title}</h3>{lesson.materials.map((material) => <article className="student-material" key={material.id} id={material.id}><FileText size={22} /><div><h4>{material.name}</h4><p>Phiên bản {material.version} · {material.sourcePosition}</p><span className={`student-badge ${material.processing === 'FAILED' ? 'warning' : ''}`}>{material.processing === 'PROCESSED' ? 'Đã xử lý' : material.processing === 'FAILED' ? 'Xử lý thất bại' : 'Đang xử lý'}</span><p>{material.processing === 'PROCESSED' ? 'Thông tin nguồn mẫu để đối chiếu khi học.' : 'Chưa đủ dữ liệu trích xuất để dùng làm nguồn tóm tắt, luyện tập hoặc hỏi đáp.'}</p></div></article>)}<p className="student-muted">{selected.historic ? 'Bạn có thể xem lại thông tin học liệu; không tạo bài làm hay yêu cầu AI trong lớp đã học.' : 'Chọn bài học để xem thông tin nguồn. Mở tệp gốc sẽ khả dụng khi kết nối kho học liệu.'}</p></> : <p>Chưa có bài học được công bố.</p>}</div></div></section>}
    </>}
  </div>
}
