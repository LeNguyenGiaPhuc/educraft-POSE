import { ArrowRight, BookOpen, GraduationCap } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import { StudentScenarioControl } from '../ScenarioControl'
import { useStudentScenario } from '../useStudentScenario'
import { getAccessibleSubjects, getVisibleLessons } from '../studentRules'
import '../student.css'
import './subjects.css'

export function SubjectsPage() {
  const { scenario } = useStudentScenario()
  const [params, setParams] = useSearchParams()
  const { current, historic } = getAccessibleSubjects(scenario)
  const scope = scenario === 'history-only' || params.get('class') === 'history' ? 'history' : 'current'
  const subjects = scope === 'history' ? historic : current

  function changeScope(next: 'current' | 'history') {
    const updated = new URLSearchParams(params)
    if (next === 'history') updated.set('class', 'history')
    else updated.delete('class')
    setParams(updated)
  }

  return <div className="page-content student-page subject-catalog">
    <header className="page-heading subject-heading"><div><span className="eyebrow"><span className="eyebrow-line" />MÔN HỌC</span><h1>{scope === 'history' ? 'Lớp đã học' : 'Môn học của em'}</h1><p>Mở một môn để xem bài học, tài liệu và các hoạt động liên quan.</p></div><StudentScenarioControl /></header>
    {scenario === 'unassigned' ? <section className="panel student-empty"><GraduationCap size={34} /><h2>Em chưa được xếp lớp</h2><p>Môn học sẽ xuất hiện sau khi quản trị viên thêm em vào một lớp đang hoạt động.</p></section> : <>
      <div className="subject-scope-row"><div><span>{scope === 'history' ? 'LỚP ĐÃ HỌC · 10A1' : 'LỚP HIỆN TẠI · 11A2'}</span><h2>{subjects.length} môn học</h2></div>{scenario === 'current' && <button type="button" onClick={() => changeScope(scope === 'current' ? 'history' : 'current')}>{scope === 'current' ? 'Xem lớp cũ' : 'Về lớp hiện tại'} <ArrowRight size={15} /></button>}</div>
      {subjects.length ? <div className="subject-catalog-grid">{subjects.map((subject) => {
        const lessonCount = getVisibleLessons(subject.id).length
        const query = scenario === 'history-only' ? '?scenario=history-only' : scope === 'history' ? '?class=history' : ''
        return <Link className="subject-catalog-card" to={`/student/subjects/${subject.id}${query}`} key={subject.id}>
          <span className="subject-icon"><BookOpen size={20} /></span><span className="subject-card-copy"><strong>{subject.name}</strong><small>{lessonCount} bài học đã công bố</small></span><span className="subject-teacher">{subject.teacherName || 'Chưa phân công giáo viên'}</span><ArrowRight className="subject-arrow" size={17} />
        </Link>
      })}</div> : <section className="panel student-empty"><BookOpen size={30} /><h2>Chưa có môn học để xem</h2><p>Lớp này chưa có môn học hoặc học liệu được công bố trong bản mẫu.</p></section>}
    </>}
  </div>
}
