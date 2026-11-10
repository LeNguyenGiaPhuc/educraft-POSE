import { useMemo, useState, type FormEvent, type ChangeEvent } from 'react'
import { ArrowLeft, ArrowRight, Archive, FileUp, Plus, School, Search, Users } from 'lucide-react'
import { accounts, classrooms, getClassroom, memberships, type Classroom } from '../fixtures'
import { activeStudents, emptyClassroomDraft, previewRoster, validateClassroomDraft, type ClassroomDraft, type RosterRow } from './classrooms.mock'

type Mode = 'list' | 'create' | 'edit'

export function ClassroomsPage() {
  const [mode, setMode] = useState<Mode>('list')
  const [selectedId, setSelectedId] = useState(classrooms[1].id)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'ARCHIVED'>('ALL')
  const [draft, setDraft] = useState<ClassroomDraft>(emptyClassroomDraft)
  const [errors, setErrors] = useState<string[]>([])
  const [preview, setPreview] = useState(false)
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [membershipMessage, setMembershipMessage] = useState('')
  const [rosterRows, setRosterRows] = useState<RosterRow[]>([])
  const [rosterError, setRosterError] = useState('')

  const visible = useMemo(() => classrooms.filter((item) => (statusFilter === 'ALL' || item.status === statusFilter) && `${item.name} ${item.academicYear}`.toLocaleLowerCase().includes(search.toLocaleLowerCase())), [search, statusFilter])
  const selected = visible.find((item) => item.id === selectedId) ?? visible[0] ?? classrooms[0]
  const students = activeStudents(selected.id)
  const history = memberships.filter((item) => item.classroomId === selected.id && item.leftAt !== null)

  function startForm(nextMode: 'create' | 'edit', classroom?: Classroom) {
    setMode(nextMode); setDraft(classroom ? { name: classroom.name, gradeLevel: classroom.gradeLevel, academicYear: classroom.academicYear } : emptyClassroomDraft); setErrors([]); setPreview(false)
  }
  function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next = validateClassroomDraft(draft, mode === 'edit' ? selected.id : undefined)
    setErrors(next); setPreview(next.length === 0)
  }
  function previewMembership() {
    const student = accounts.find((account) => account.id === selectedStudentId && account.role === 'STUDENT')
    if (!student) { setMembershipMessage('Hãy chọn một học sinh.'); return }
    if (student.classroomId === selected.id) { setMembershipMessage('Học sinh đã thuộc lớp này.'); return }
    if (student.classroomId) { setMembershipMessage(`${student.fullName} hiện thuộc ${getClassroom(student.classroomId)?.name}. Nếu chuyển lớp, cần kết thúc phân lớp cũ và vẫn giữ lịch sử  ở lớp trước. Đây chỉ là xem trước, chưa chuyển.`); return }
    setMembershipMessage(`${student.fullName} chưa có lớp và đủ điều kiện thêm vào ${selected.name}. Đây chỉ là xem trước, chưa thêm.`)
  }
  async function readRoster(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    setRosterRows([]); setRosterError('')
    if (!file) return
    if (!file.name.toLocaleLowerCase().endsWith('.csv')) { setRosterError('Bản xem trước chỉ đọc file CSV có cột username.'); return }
    try { setRosterRows(previewRoster(await file.text(), selected.id)) }
    catch { setRosterError('Không đọc được file. Hãy chọn lại file CSV.') }
  }

  return <div className="page-content adm-page"><div className="page-heading"><span className="eyebrow"><span className="eyebrow-line" /> QUẢN TRỊ HỆ THỐNG</span><h1>Lớp học</h1><p>Tổ chức lớp theo năm học và phân học sinh. Lịch sử lớp cũ luôn được giữ lại.</p></div><div className="adm-notice"><School size={17} /><span>Giao diện và danh sách này dùng dữ liệu mẫu. Các thao tác thêm, chuyển, lưu trữ đều chưa ghi dữ liệu.</span></div>
    <div className="adm-toolbar"><div className="adm-tabs" role="tablist" aria-label="Chế độ lớp học"><button type="button" className={mode === 'list' ? 'is-active' : ''} onClick={() => setMode('list')}>Danh sách lớp</button><button type="button" className={mode !== 'list' ? 'is-active' : ''} onClick={() => startForm('create')}>Tạo lớp</button></div>{mode === 'list' && <button type="button" className="adm-primary" onClick={() => startForm('create')}><Plus size={16} /> Tạo lớp</button>}</div>
    {mode === 'list' ? <div className="adm-layout"><section className="adm-card"><div className="adm-card-head"><div><span className="section-kicker">DANH MỤC LỚP</span><h2>{visible.length} lớp học</h2></div><School size={20} /></div><div className="adm-filters"><label className="adm-search"><Search size={16} /><span className="sr-only">Tìm lớp</span><input placeholder="Tìm tên lớp hoặc năm học" value={search} onChange={(event) => setSearch(event.target.value)} /></label><label className="adm-filter"><span className="sr-only">Lọc trạng thái lớp</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}><option value="ALL">Tất cả</option><option value="ACTIVE">Đang học</option><option value="ARCHIVED">Lưu trữ</option></select></label></div>{visible.length === 0 ? <div className="adm-empty"><School size={28} /><strong>Không có lớp phù hợp</strong><p>Hãy đổi từ khóa hoặc trạng thái.</p></div> : <div className="adm-list">{visible.map((item) => <button type="button" key={item.id} className={`adm-row ${item.id === selected.id ? 'is-selected' : ''}`} onClick={() => { setSelectedId(item.id); setSelectedStudentId(''); setMembershipMessage(''); setRosterRows([]) }}><span className="adm-class-badge">{item.name}</span><span className="adm-row-copy"><strong>{item.name}</strong><small>Khối {item.gradeLevel} · {item.academicYear}</small></span><span className={`adm-status ${item.status === 'ACTIVE' ? 'active' : 'inactive'}`}>{item.status === 'ACTIVE' ? 'Đang học' : 'Lưu trữ'}</span><ArrowRight size={15} /></button>)}</div>}</section>
      {visible.length === 0 ? <section className="adm-card adm-detail"><div className="adm-empty"><School size={28} /><strong>Chưa có lớp để xem</strong><p>Hãy đổi từ khóa hoặc trạng thái.</p></div></section> : <section className="adm-card adm-detail"><div className="adm-card-head"><div><span className="section-kicker">CHI TIẾT LỚP</span><h2>{selected.name} <small>{selected.academicYear}</small></h2></div><Users size={19} /></div><p className="adm-subcopy">{selected.status === 'ARCHIVED' ? 'Lớp đã lưu trữ: có thể xem lại, không thao tác phân lớp hay tạo hoạt động mới.' : 'Admin có thể phân học sinh vào lớp đang hoạt động.'}</p><h3 className="adm-subheading">Học sinh hiện tại <small>{students.length}</small></h3>{students.length ? <div className="adm-mini-list">{students.map(({ student }) => <div key={student!.id}><span className="adm-avatar">{student!.fullName.split(' ').at(-1)?.[0]}</span><span>{student!.fullName}</span><small>@{student!.username}</small></div>)}</div> : <p className="adm-muted">Không có học sinh đang học ở lớp này.</p>}
        <h3 className="adm-subheading">Lịch sử phân lớp</h3>{history.length ? <div className="adm-mini-list">{history.map((item) => <div key={`${item.studentId}-${item.joinedAt}`}><span>{accounts.find((account) => account.id === item.studentId)?.fullName}</span><small>{item.joinedAt} → {item.leftAt}</small></div>)}</div> : <p className="adm-muted">Chưa có lần chuyển lớp nào được lưu trong dữ liệu mẫu.</p>}
        {selected.status === 'ACTIVE' ? <><div className="adm-actions"><button type="button" className="adm-secondary" onClick={() => startForm('edit', selected)}>Xem trước chỉnh sửa lớp</button><button type="button" className="adm-text-button" onClick={() => setMembershipMessage('Chỉ xem trước: lớp chưa được lưu trữ. Khi lưu trữ, lớp chỉ còn chế độ xem.')}>Xem trước lưu trữ</button></div><div className="adm-member-box"><h3>Thêm hoặc chuyển học sinh</h3><p>Chỉ Admin thực hiện. Một học sinh chỉ có một lớp hiện tại.</p><div className="adm-inline-form"><label className="sr-only" htmlFor="student-select">Học sinh</label><select id="student-select" value={selectedStudentId} onChange={(event) => setSelectedStudentId(event.target.value)}><option value="">Chọn tài khoản học sinh</option>{accounts.filter((item) => item.role === 'STUDENT').map((item) => <option value={item.id} key={item.id}>{item.fullName}{item.classroomId ? ` · ${getClassroom(item.classroomId)?.name}` : ' · chưa có lớp'}</option>)}</select><button type="button" className="adm-secondary" onClick={previewMembership}>Xem trước</button></div>{membershipMessage && <p className="adm-inline-note" role="status">{membershipMessage}</p>}</div><div className="adm-member-box"><h3>Nhập danh sách một lần <small>không bắt buộc</small></h3><p>Chọn file CSV có cột <code>username</code> để kiểm tra từng dòng trên máy. Chưa import vào hệ thống.</p><label className="adm-file-label"><FileUp size={17} /> Chọn file CSV<input type="file" accept=".csv,text/csv" onChange={readRoster} /></label>{rosterError && <p className="adm-errors" role="alert">{rosterError}</p>}{rosterRows.length > 0 && <div className="adm-roster"><strong>Kết quả xem trước ({rosterRows.filter((row) => row.eligible).length}/{rosterRows.length} dòng đủ điều kiện)</strong>{rosterRows.map((row) => <div key={row.line}><span>Dòng {row.line}: {row.username || '—'}</span><span>{row.studentName}</span><small className={row.eligible ? 'adm-ok' : 'adm-warning'}>{row.message}</small></div>)}</div>}</div></> : <div className="adm-readonly"><Archive size={18} /> Lớp lưu trữ chỉ được xem. Học sinh vẫn xem lại tài liệu và kết quả cũ.</div>}
      </section>}</div> : <section className="adm-card adm-form-card"><button type="button" className="adm-back" onClick={() => setMode('list')}><ArrowLeft size={16} /> Về danh sách</button><span className="section-kicker">{mode === 'create' ? 'TẠO LỚP' : 'CHỈNH SỬA LỚP'}</span><h2>{mode === 'create' ? 'Thông tin lớp mới' : `Thông tin lớp ${selected.name}`}</h2><p className="adm-subcopy">Điền thông tin rồi kiểm tra. Bản xem trước không tạo hoặc sửa lớp thật.</p><form onSubmit={submitForm} onChange={() => { setPreview(false); setErrors([]) }} noValidate><div className="adm-form-grid"><label>Tên lớp<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Ví dụ: 11A3" /></label><label>Khối lớp<input type="number" min="1" max="12" value={Number.isNaN(draft.gradeLevel) ? '' : draft.gradeLevel} onChange={(event) => setDraft({ ...draft, gradeLevel: event.target.valueAsNumber })} /></label><label>Năm học<input value={draft.academicYear} onChange={(event) => setDraft({ ...draft, academicYear: event.target.value })} placeholder="Ví dụ: 2026–2027" /></label></div>{errors.length > 0 && <div className="adm-errors" role="alert"><strong>Hãy kiểm tra lại:</strong><ul>{errors.map((error) => <li key={error}>{error}</li>)}</ul></div>}<button type="submit" className="adm-primary">Kiểm tra và xem trước <ArrowRight size={16} /></button></form>{preview && <div className="adm-preview" role="status"><strong>Lớp {draft.name.trim()} · khối {draft.gradeLevel} · {draft.academicYear.trim()}</strong><p>Thông tin hợp lệ để xem trước. Chưa có lớp nào được tạo hoặc cập nhật.</p></div>}</section>}
  </div>
}
