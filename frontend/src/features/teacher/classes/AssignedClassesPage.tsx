import { useState } from 'react'
import { ArrowRight, BookOpen, ChartNoAxesCombined, ClipboardList, LibraryBig, School, Users } from 'lucide-react'
import { Link } from 'react-router'
import { assignedClasses, currentTeacherId, teacherSubjectPath } from '../fixtures'
import { classScenarios, type ClassScenario } from './classes.mock'
import './classes.css'

export function AssignedClassesPage() {
  const [scenario, setScenario] = useState<ClassScenario>('assigned')
  const [classroomId, setClassroomId] = useState(assignedClasses[0]?.id ?? '')
  const [subjectId, setSubjectId] = useState(assignedClasses[0]?.subjects[0]?.id ?? '')
  const classes = assignedClasses.filter((item) => item.subjects.some((subject) => subject.teacherId === currentTeacherId))
  const classroom = classes.find((item) => item.id === classroomId)
  const subject = classroom?.subjects.find((item) => item.id === subjectId && item.teacherId === currentTeacherId)

  function chooseClass(id: string) {
    const next = classes.find((item) => item.id === id)
    setClassroomId(id)
    setSubjectId(next?.subjects[0]?.id ?? '')
  }

  return <div className="page-content tc-page">
    <div className="page-heading"><h1>Lớp được phân công</h1><p>Chọn lớp để xem môn bạn phụ trách, danh sách học sinh và công việc của môn đó.</p></div>
    <div className="tc-toolbar"><span>Dữ liệu minh họa · Giáo viên Lịch sử</span><label>Tình huống mẫu <select value={scenario} onChange={(event) => setScenario(event.target.value as ClassScenario)}>{Object.entries(classScenarios).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></label></div>
    {scenario === 'empty' ? <div className="panel tc-empty"><School size={26} /><h2>Chưa được phân công lớp</h2><p>Khi Admin phân công bạn vào môn học của một lớp, lớp đó sẽ hiện tại đây.</p></div>
      : scenario === 'revoked' ? <div className="panel tc-empty" role="alert"><School size={26} /><h2>Phân công đã thay đổi</h2><p>Bạn không còn quyền mở môn học này. Hãy tải lại danh sách lớp được phân công.</p><button type="button" onClick={() => setScenario('assigned')}>Xem danh sách hiện tại</button></div>
        : <div className="tc-layout">
          <div className="panel tc-class-list"><div className="tc-section-title"><School size={18} /><h2>Lớp của tôi</h2><span>{classes.length} lớp</span></div><div className="tc-class-items">{classes.map((item) => <button type="button" key={item.id} className={item.id === classroomId ? 'selected' : ''} onClick={() => chooseClass(item.id)}><span className="tc-class-icon">{item.name.slice(0, 2)}</span><span><strong>{item.name}</strong><small>Năm học {item.academicYear}</small></span><ArrowRight size={16} /></button>)}</div></div>
          {classroom && <div className="tc-detail"><section className="panel tc-hero"><div><h2>{classroom.name}</h2><p>Khối {classroom.gradeLevel} · {classroom.students.length} học sinh trong dữ liệu mẫu</p></div><div className="tc-hero-icon"><School size={32} /></div></section><section className="panel"><div className="tc-section-title"><BookOpen size={18} /><h2>Môn được phân công</h2></div><div className="tc-subjects">{classroom.subjects.filter((item) => item.teacherId === currentTeacherId).map((item) => <button key={item.id} type="button" className={subjectId === item.id ? 'selected' : ''} onClick={() => setSubjectId(item.id)}><strong>{item.name}</strong><small>{classroom.name} · đang phụ trách</small></button>)}</div>{subject && <div className="tc-workspace"><p>Không gian môn <strong>{subject.name}</strong> của lớp <strong>{classroom.name}</strong></p><div className="tc-links"><Link to={teacherSubjectPath(subject.id, 'lessons')}><LibraryBig size={17} /> Học liệu <ArrowRight size={14} /></Link><Link to={teacherSubjectPath(subject.id, 'activities')}><ClipboardList size={17} /> Hoạt động <ArrowRight size={14} /></Link><Link to={teacherSubjectPath(subject.id, 'students')}><Users size={17} /> Học sinh <ArrowRight size={14} /></Link><Link to={teacherSubjectPath(subject.id, 'statistics')}><ChartNoAxesCombined size={17} /> Thống kê <ArrowRight size={14} /></Link></div></div>}</section><section className="panel"><div className="tc-section-title"><Users size={18} /><h2>Học sinh trong lớp</h2><span>{classroom.students.length} học sinh mẫu</span></div><ul className="tc-roster">{classroom.students.map((student, index) => <li key={student.id}><span>{String(index + 1).padStart(2, '0')}</span>{student.name}</li>)}</ul></section></div>}
        </div>}
  </div>
}
