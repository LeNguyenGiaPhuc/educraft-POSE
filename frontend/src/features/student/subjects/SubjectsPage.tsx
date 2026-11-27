import { ArrowRight, BookOpen, GraduationCap } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import type { StudentWorkspace } from '../../../api/client'
import { useApiData } from '../../../api/useApiData'
import { StudentScenarioControl } from '../ScenarioControl'
import { useStudentScenario } from '../useStudentScenario'
import '../student.css'
import './subjects.css'

export function SubjectsPage() {
  const { scenario } = useStudentScenario()
  const { data, loading, error } = useApiData<StudentWorkspace>('/student/workspace')
  const [params, setParams] = useSearchParams()
  const scope = scenario === 'history-only' || params.get('class') === 'history' ? 'history' : 'current'
  const membership = scope === 'history' ? data?.history[0] : data?.current
  const subjects = membership?.subjects ?? []

  function changeScope(next: 'current' | 'history') {
    const updated = new URLSearchParams(params)
    if (next === 'history') updated.set('class', 'history')
    else updated.delete('class')
    setParams(updated)
  }

  if (loading) return <div className="page-content student-page"><p role="status">Đang tải môn học…</p></div>
  if (error) return <div className="page-content student-page"><section className="panel student-empty" role="alert"><h2>Không tải được môn học</h2><p>{error}</p></section></div>

  return <div className="page-content student-page subject-catalog">
    <header className="page-heading subject-heading"><div><span className="eyebrow"><span className="eyebrow-line" />MÔN HỌC</span><h1>{scope === 'history' ? 'Lớp đã học' : 'Môn học của em'}</h1><p>Mở một môn để xem bài học, tài liệu và các hoạt động liên quan.</p></div><StudentScenarioControl /></header>
    {scenario === 'unassigned' ? <section className="panel student-empty"><GraduationCap size={34} /><h2>Em chưa được xếp lớp</h2><p>Môn học sẽ xuất hiện sau khi quản trị viên thêm em vào một lớp đang hoạt động.</p></section> : <>
      <div className="subject-scope-row"><div><span>{scope === 'history' ? `LỚP ĐÃ HỌC · ${membership?.classroom.name ?? ''}` : `LỚP HIỆN TẠI · ${membership?.classroom.name ?? ''}`}</span><h2>{subjects.length} môn học</h2></div>{scenario === 'current' && data?.history.length ? <button type="button" onClick={() => changeScope(scope === 'current' ? 'history' : 'current')}>{scope === 'current' ? 'Xem lớp cũ' : 'Về lớp hiện tại'} <ArrowRight size={15} /></button> : null}</div>
      {subjects.length ? <div className="subject-catalog-grid">{subjects.map((subject) => {
        const query = scope === 'history' ? '?class=history' : ''
        return <Link className="subject-catalog-card" to={`/student/subjects/${subject.id}${query}`} key={subject.id}>
          <span className="subject-icon"><BookOpen size={20} /></span><span className="subject-card-copy"><strong>{subject.name}</strong><small>{subject.lessons.length} bài học đã công bố</small></span><span className="subject-teacher">{subject.teacher?.name ?? 'Chưa phân công giáo viên'}</span><ArrowRight className="subject-arrow" size={17} />
        </Link>
      })}</div> : <section className="panel student-empty"><BookOpen size={30} /><h2>Chưa có môn học để xem</h2><p>Lớp này chưa có môn học hoặc học liệu được công bố.</p></section>}
    </>}
  </div>
}
