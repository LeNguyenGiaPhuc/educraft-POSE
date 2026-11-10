import { useState } from 'react'
import { ArrowRight, BookOpen, CircleHelp, Plus, School, UserRoundCheck } from 'lucide-react'
import { classroomSubjects, classrooms, getSubject, getTeacher, subjects, type ClassroomSubject } from '../fixtures'
import { eligibleTeachers, validateAssignment } from './subjects.mock'

export function ClassroomSubjectsPage() {
  const [classroomId, setClassroomId] = useState(classrooms[1].id)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [subjectId, setSubjectId] = useState('')
  const [teacherId, setTeacherId] = useState('')
  const [errors, setErrors] = useState<string[]>([])
  const [preview, setPreview] = useState(false)
  const [newSubjectName, setNewSubjectName] = useState('')
  const [catalogNotice, setCatalogNotice] = useState('')
  const classroom = classrooms.find((item) => item.id === classroomId) ?? classrooms[0]
  const offered = classroomSubjects.filter((item) => item.classroomId === classroom.id)
  const editing = classroomSubjects.find((item) => item.id === editingId)
  const eligible = eligibleTeachers(subjectId)

  function chooseClass(id: string) {
    setClassroomId(id); setEditingId(null); setSubjectId(''); setTeacherId(''); setErrors([]); setPreview(false); setCatalogNotice('')
  }
  function edit(item: ClassroomSubject) {
    setEditingId(item.id); setSubjectId(item.subjectId); setTeacherId(item.teacherId); setErrors([]); setPreview(false)
  }
  function reset() {
    setEditingId(null); setSubjectId(''); setTeacherId(''); setErrors([]); setPreview(false)
  }
  function checkAssignment() {
    const next = validateAssignment(classroom.id, subjectId, teacherId, editing)
    setErrors(next); setPreview(next.length === 0)
  }
  function checkNewSubject() {
    const name = newSubjectName.trim()
    if (!name) setCatalogNotice('Hãy nhập tên môn học.')
    else if (subjects.some((subject) => subject.name.toLocaleLowerCase() === name.toLocaleLowerCase())) setCatalogNotice('Môn này đã có trong danh mục. Hãy chọn môn có sẵn bên dưới.')
    else setCatalogNotice(`“${name}” là môn mới để xem trước. Chưa lưu vào danh mục; muốn phân công, cần có giáo viên chuyên môn phù hợp sau khi API được triển khai.`)
  }

  return <div className="page-content adm-page"><div className="page-heading"><span className="eyebrow"><span className="eyebrow-line" /> QUẢN TRỊ HỆ THỐNG</span><h1>Môn học của lớp</h1><p>Môn học được lấy từ danh mục chung, sau đó mở trong một lớp và phân công một giáo viên phụ trách.</p></div><div className="adm-notice"><BookOpen size={17} /><span>Đây là bản xem trước với dữ liệu mẫu. Thay giáo viên không xóa tác giả của học liệu đã có. Chưa có thay đổi nào được lưu.</span></div>
    <div className="adm-layout adm-subject-layout"><section className="adm-card"><div className="adm-card-head"><div><span className="section-kicker">LỚP VÀ MÔN HỌC</span><h2>Phân công hiện tại</h2></div><School size={19} /></div><label className="adm-field">Chọn lớp<select value={classroomId} onChange={(event) => chooseClass(event.target.value)}>{classrooms.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.academicYear}{item.status === 'ARCHIVED' ? ' · lưu trữ' : ''}</option>)}</select></label>{classroom.status === 'ARCHIVED' && <div className="adm-readonly">Lớp đã lưu trữ. Chỉ có thể xem môn học và giáo viên cũ.</div>}<div className="adm-subject-list">{offered.length ? offered.map((item) => <div className="adm-subject-item" key={item.id}><span className="adm-subject-icon"><BookOpen size={18} /></span><div><strong>{getSubject(item.subjectId)?.name}</strong><small>{getTeacher(item.teacherId)?.fullName} · giáo viên phụ trách</small></div>{classroom.status === 'ACTIVE' && <button type="button" className="adm-icon-action" onClick={() => edit(item)} aria-label={`Xem trước đổi giáo viên môn ${getSubject(item.subjectId)?.name}`}><ArrowRight size={17} /></button>}</div>) : <div className="adm-empty"><BookOpen size={28} /><strong>Chưa có môn học</strong><p>Mở môn từ danh mục chung cho lớp này.</p></div>}</div><div className="adm-catalog"><span className="section-kicker">DANH MỤC MÔN HỌC CHUNG</span><div>{subjects.map((subject) => <span key={subject.id}>{subject.name}</span>)}</div>{classroom.status === 'ACTIVE' && <><label className="adm-field">Môn học mới (xem trước)<input value={newSubjectName} onChange={(event) => setNewSubjectName(event.target.value)} placeholder="Tên môn chưa có trong danh mục" /></label><button type="button" className="adm-secondary" onClick={checkNewSubject}>Kiểm tra danh mục</button>{catalogNotice && <p className="adm-inline-note" role="status">{catalogNotice}</p>}</>}</div></section>
      <section className="adm-card adm-detail"><div className="adm-card-head"><div><span className="section-kicker">{editing ? 'THAY GIÁO VIÊN' : 'MỞ MÔN CHO LỚP'}</span><h2>{editing ? getSubject(editing.subjectId)?.name : `Lớp ${classroom.name}`}</h2></div><UserRoundCheck size={20} /></div>{classroom.status === 'ARCHIVED' ? <div className="adm-empty"><CircleHelp size={28} /><strong>Chỉ xem</strong><p>Lớp lưu trữ không mở môn mới hoặc thay giáo viên.</p></div> : <><p className="adm-subcopy">{editing ? 'Chọn giáo viên có cùng môn chuyên môn. Tài liệu trước đây vẫn giữ nguyên tác giả.' : 'Mỗi môn của lớp phải có đúng một giáo viên phụ trách.'}</p><div className="adm-form-stack"><label>Môn học<select value={subjectId} disabled={Boolean(editing)} onChange={(event) => { setSubjectId(event.target.value); setTeacherId(''); setPreview(false); setErrors([]) }}><option value="">Chọn môn từ danh mục</option>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label><label>Giáo viên phụ trách<select value={teacherId} onChange={(event) => { setTeacherId(event.target.value); setPreview(false) }}><option value="">{subjectId ? 'Chọn một giáo viên' : 'Chọn môn học trước'}</option>{eligible.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.fullName} · {teacher.qualification}</option>)}</select></label></div>{subjectId && eligible.length === 0 && <p className="adm-inline-note">Không có giáo viên đang hoạt động với chuyên môn {getSubject(subjectId)?.name}. Admin cần tạo hoặc kích hoạt tài khoản giáo viên phù hợp trước.</p>}{errors.length > 0 && <div className="adm-errors" role="alert"><strong>Chưa thể xem trước phân công:</strong><ul>{errors.map((error) => <li key={error}>{error}</li>)}</ul></div>}<div className="adm-actions"><button type="button" className="adm-primary" onClick={checkAssignment}><Plus size={16} /> Kiểm tra và xem trước</button>{editing && <button type="button" className="adm-secondary" onClick={reset}>Hủy thay đổi</button>}</div>{preview && <div className="adm-preview" role="status"><strong>{getSubject(subjectId)?.name} · {classroom.name}</strong><p>Giáo viên: {getTeacher(teacherId)?.fullName}</p><small>{editing ? 'Đang xem trước việc thay giáo viên.' : 'Đang xem trước môn học mới của lớp.'} Chưa ghi dữ liệu.</small></div>}</>}</section></div>
  </div>
}
