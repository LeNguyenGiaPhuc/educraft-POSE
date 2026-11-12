import { useState, useMemo, type FormEvent } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Award,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Edit3,
  FileSpreadsheet,
  GraduationCap,
  History,
  KeyRound,
  Lock,
  Mail,
  Plus,
  RotateCcw,
  ShieldAlert,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import {
  accounts,
  getClassroom,
  getClassroomSubjects,
  getEligibleTeachers,
  getSubject,
  getTeacher,
  type AdminAccount,
  type Classroom,
  type ClassroomSubject,
  type Subject,
} from '../fixtures'
import {
  activeStudents,
  addManualStudentToClassroom,
  archiveClassroomAction,
  assignTeacherToClassroomSubject,
  historicalStudents,
  removeStudentFromClassroom,
  updateClassroomInfo,
  type ClassroomDraft,
} from './classrooms.mock'
import { StudentExcelImportModal } from './StudentExcelImportModal'
import './classrooms.css'

export interface ClassroomDetailPageProps {
  classroomId: string
  onBack: () => void
}

type ActiveTab = 'SUBJECTS' | 'STUDENTS'
type StudentSubTab = 'ACTIVE' | 'HISTORY'

export function ClassroomDetailPage({ classroomId, onBack }: ClassroomDetailPageProps) {
  // Force update ticker for local mock state changes
  const [version, setVersion] = useState(0)
  const refresh = () => setVersion((v) => v + 1)

  // Current classroom data
  const classroom: Classroom | undefined = useMemo(() => {
    // depend on version to re-evaluate
    void version
    return getClassroom(classroomId)
  }, [classroomId, version])

  // Active top-level tab
  const [activeTab, setActiveTab] = useState<ActiveTab>('SUBJECTS')
  // Student sub-tab
  const [studentSubTab, setStudentSubTab] = useState<StudentSubTab>('ACTIVE')

  // Feedback banner
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Modals state
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editDraft, setEditDraft] = useState<ClassroomDraft>({ name: '', gradeLevel: 10, academicYear: '' })
  const [editErrors, setEditErrors] = useState<string[]>([])

  const [isArchiveConfirmOpen, setIsArchiveConfirmOpen] = useState(false)

  // Teacher Assignment Modal state
  const [assigningSubject, setAssigningSubject] = useState<{ cs: ClassroomSubject; subject: Subject } | null>(null)
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null)

  // Manual Add Student Modal state
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false)
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [studentFormError, setStudentFormError] = useState('')

  // Excel Import Modal state
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false)

  // Unenroll / remove student confirmation modal
  const [removingStudent, setRemovingStudent] = useState<AdminAccount | null>(null)

  // Subjects data
  const classroomSubjectList = useMemo(() => {
    void version
    if (!classroom) return []
    return getClassroomSubjects(classroom.id)
  }, [classroom, version])

  // Students data
  const currentActiveStudents = useMemo(() => {
    void version
    if (!classroom) return []
    return activeStudents(classroom.id)
  }, [classroom, version])

  const pastStudents = useMemo(() => {
    void version
    if (!classroom) return []
    return historicalStudents(classroom.id)
  }, [classroom, version])

  if (!classroom) {
    return (
      <div className="page-content adm-page cls-container">
        <div className="cls-not-found-card">
          <AlertCircle size={40} style={{ color: '#c81e1e', margin: '0 auto 12px' }} />
          <h3>Không tìm thấy lớp học</h3>
          <p>Mã lớp “{classroomId}” không tồn tại hoặc đã bị xóa khỏi hệ thống.</p>
          <button type="button" className="cls-btn-create" onClick={onBack}>
            <ArrowLeft size={16} /> Quay lại danh sách lớp học
          </button>
        </div>
      </div>
    )
  }

  const isArchived = classroom.status === 'ARCHIVED'

  // Open Edit modal
  function openEditModal() {
    if (isArchived) return
    setEditDraft({
      name: classroom!.name,
      gradeLevel: classroom!.gradeLevel,
      academicYear: classroom!.academicYear,
    })
    setEditErrors([])
    setIsEditOpen(true)
  }

  function handleSaveEdit(e: FormEvent) {
    e.preventDefault()
    const result = updateClassroomInfo(classroom!.id, editDraft)
    if (!result.success) {
      setEditErrors(result.errors || ['Lỗi cập nhật thông tin lớp.'])
      return
    }
    setIsEditOpen(false)
    refresh()
    setFeedback({ type: 'success', message: `Đã cập nhật thông tin lớp học "${editDraft.name}" thành công!` })
  }

  // Handle Archive Confirmation
  function handleConfirmArchive() {
    if (isArchived) return
    const result = archiveClassroomAction(classroom!.id)
    setIsArchiveConfirmOpen(false)
    refresh()
    setFeedback({ type: 'success', message: result.message })
  }

  // Open Assign Teacher Modal
  function handleOpenAssignTeacher(cs: ClassroomSubject) {
    if (isArchived) return
    const sub = getSubject(cs.subjectId)
    if (!sub) return
    setAssigningSubject({ cs, subject: sub })
    setSelectedTeacherId(cs.teacherId)
  }

  function handleSaveTeacherAssignment() {
    if (!assigningSubject) return
    const result = assignTeacherToClassroomSubject(
      classroom!.id,
      assigningSubject.subject.id,
      selectedTeacherId
    )
    if (result.success) {
      setFeedback({ type: 'success', message: result.message })
    } else {
      setFeedback({ type: 'error', message: result.message })
    }
    setAssigningSubject(null)
    refresh()
  }

  // Handle Manual Student Add
  function handleManualAddStudent(e: FormEvent) {
    e.preventDefault()
    setStudentFormError('')
    if (!selectedStudentId) {
      setStudentFormError('Vui lòng chọn một học sinh từ danh sách.')
      return
    }
    const result = addManualStudentToClassroom(selectedStudentId, classroom!.id)
    if (!result.success) {
      setStudentFormError(result.message)
      return
    }
    setIsAddStudentOpen(false)
    setSelectedStudentId('')
    refresh()
    setFeedback({ type: 'success', message: result.message })
  }

  // Handle Unenroll Student
  function handleConfirmRemoveStudent() {
    if (!removingStudent) return
    const result = removeStudentFromClassroom(removingStudent.id, classroom!.id)
    setRemovingStudent(null)
    refresh()
    setFeedback({ type: 'success', message: result.message })
  }

  // Handle Excel Import Success
  function handleExcelImportSuccess(count: number) {
    refresh()
    setFeedback({
      type: 'success',
      message: `Đã thêm ${count} học sinh vào lớp ${classroom!.name} trong dữ liệu mẫu của phiên này; chưa tạo tài khoản thật.`,
    })
  }

  return (
    <div className="page-content adm-page cls-container">
      {/* Breadcrumb Navigation */}
      <nav className="cls-breadcrumb" aria-label="Breadcrumb">
        <button type="button" className="cls-breadcrumb-link" onClick={onBack}>
          Quản trị hệ thống
        </button>
        <ChevronRight size={14} className="cls-breadcrumb-sep" />
        <button type="button" className="cls-breadcrumb-link" onClick={onBack}>
          Lớp học
        </button>
        <ChevronRight size={14} className="cls-breadcrumb-sep" />
        <span className="cls-breadcrumb-current">
          Chi tiết lớp {classroom.name}
        </span>
      </nav>

      {/* Back button */}
      <div>
        <button type="button" className="cls-btn-back" onClick={onBack}>
          <ArrowLeft size={16} /> Quay lại danh sách lớp
        </button>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div
          className={`cls-feedback-banner ${feedback.type === 'success' ? 'is-success' : 'is-error'}`}
          role="status"
        >
          {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <div style={{ flex: 1 }}>{feedback.message}</div>
          <button
            type="button"
            className="cls-feedback-close"
            onClick={() => setFeedback(null)}
            aria-label="Đóng thông báo"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Archived Read-Only Warning Banner */}
      {isArchived && (
        <div className="cls-archived-banner" role="alert">
          <ShieldAlert size={20} className="cls-archived-banner-icon" />
          <div className="cls-archived-banner-text">
            <strong>Lớp học đã lưu trữ (Read-only)</strong>
            <p>
              Chỉ xem lịch sử, học liệu và kết quả; không thêm học sinh, môn hay phân công giáo viên mới. Mọi thao tác chỉnh sửa dữ liệu của lớp này đã được vô hiệu hóa.
            </p>
          </div>
        </div>
      )}

      {/* Classroom Header Card */}
      <div className="cls-detail-header-card">
        <div className="cls-detail-header-main">
          <div className="cls-class-badge-lg">
            {classroom.name}
          </div>
          <div className="cls-detail-header-titles">
            <div className="cls-detail-header-meta">
              <span className="cls-meta-pill">
                <GraduationCap size={14} /> Khối {classroom.gradeLevel}
              </span>
              <span className="cls-meta-pill">
                <Calendar size={14} /> Năm học: {classroom.academicYear}
              </span>
              <span className="cls-meta-pill">
                <Users size={14} /> Sĩ số: <strong>{currentActiveStudents.length}</strong> học sinh
              </span>
              <span
                className={`cls-status-pill ${
                  isArchived ? 'is-archived' : 'is-active'
                }`}
              >
                {isArchived ? 'Đã lưu trữ' : 'Đang hoạt động'}
              </span>
            </div>
            <h2>Lớp {classroom.name}</h2>
          </div>
        </div>

        {/* Actions on Classroom */}
        <div className="cls-detail-header-actions">
          <button
            type="button"
            className="cls-btn-action-outline"
            onClick={openEditModal}
            disabled={isArchived}
            title={isArchived ? 'Lớp đã lưu trữ, không thể chỉnh sửa' : 'Chỉnh sửa thông tin lớp'}
          >
            <Edit3 size={15} /> Chỉnh sửa thông tin
          </button>
          {!isArchived && (
            <button
              type="button"
              className="cls-btn-action-archive"
              onClick={() => setIsArchiveConfirmOpen(true)}
              title="Lưu trữ lớp học này"
            >
              <Lock size={15} /> Lưu trữ lớp học
            </button>
          )}
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="cls-tabs-container">
        <button
          type="button"
          className={`cls-tab-btn ${activeTab === 'SUBJECTS' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('SUBJECTS')}
        >
          <BookOpen size={16} /> Môn học & Giáo viên phụ trách
          <span className="cls-tab-count">{classroomSubjectList.length}</span>
        </button>
        <button
          type="button"
          className={`cls-tab-btn ${activeTab === 'STUDENTS' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('STUDENTS')}
        >
          <Users size={16} /> Danh sách học sinh & Lịch sử
          <span className="cls-tab-count">{currentActiveStudents.length}</span>
        </button>
      </div>

      {/* TAB 1: MÔN HỌC VÀ GIÁO VIÊN PHỤ TRÁCH */}
      {activeTab === 'SUBJECTS' && (
        <div className="cls-card-wrapper cls-tab-content">
          <div className="cls-tab-section-head">
            <div>
              <h3>Phân công giảng dạy theo môn</h3>
              <p>
                Mỗi lớp học tự động kế thừa danh mục môn học của trường. Giáo viên được phân công phải có chuyên môn phù hợp với môn học đó.
              </p>
            </div>
          </div>

          <table className="cls-table">
            <thead>
              <tr>
                <th style={{ width: '60px', textAlign: 'center' }}>STT</th>
                <th style={{ width: '220px' }}>Môn học</th>
                <th>Giáo viên phụ trách</th>
                <th style={{ width: '200px' }}>Chuyên môn / Bằng cấp</th>
                <th style={{ width: '160px', textAlign: 'center' }}>Trạng thái</th>
                <th style={{ width: '180px', textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {classroomSubjectList.map((item, idx) => {
                const sub = getSubject(item.subjectId)
                const teacher = getTeacher(item.teacherId)
                const hasTeacher = Boolean(teacher)

                return (
                  <tr key={item.id} className={!hasTeacher ? 'cls-row-unassigned' : ''}>
                    <td style={{ textAlign: 'center', fontWeight: 600, color: '#688272' }}>
                      {idx + 1}
                    </td>

                    {/* Môn học */}
                    <td>
                      <div className="cls-subject-name-cell">
                        <BookOpen size={17} className="cls-sub-icon" />
                        <div>
                          <strong>{sub?.name ?? item.subjectId}</strong>
                          <small>Mã môn: {item.subjectId}</small>
                        </div>
                      </div>
                    </td>

                    {/* Giáo viên */}
                    <td>
                      {teacher ? (
                        <div className="cls-teacher-cell">
                          <div className="cls-teacher-avatar">
                            {teacher.fullName.slice(-1)}
                          </div>
                          <div>
                            <div className="cls-teacher-name">{teacher.fullName}</div>
                            <div className="cls-teacher-contact">
                              <Mail size={12} /> {teacher.contact}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span className="cls-empty-teacher-text">
                          Chưa phân công giáo viên bộ môn
                        </span>
                      )}
                    </td>

                    {/* Chuyên môn / Bằng cấp */}
                    <td>
                      {teacher?.qualification ? (
                        <span className="cls-qual-badge">
                          <Award size={13} /> {teacher.qualification}
                        </span>
                      ) : (
                        <span style={{ color: '#8d9f92', fontSize: '12px' }}>—</span>
                      )}
                    </td>

                    {/* Trạng thái phân công */}
                    <td style={{ textAlign: 'center' }}>
                      {hasTeacher ? (
                        <span className="cls-status-pill cls-pill-assigned">
                          <UserCheck size={12} /> Đã phân công
                        </span>
                      ) : (
                        <span className="cls-status-pill cls-pill-unassigned">
                          <AlertCircle size={12} /> Chưa phân công
                        </span>
                      )}
                    </td>

                    {/* Thao tác */}
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className={hasTeacher ? 'cls-btn-edit-assign' : 'cls-btn-assign'}
                        onClick={() => handleOpenAssignTeacher(item)}
                        disabled={isArchived}
                        title={
                          isArchived
                            ? 'Lớp đã lưu trữ, không thể đổi giáo viên'
                            : hasTeacher
                            ? 'Đổi giáo viên phụ trách'
                            : 'Phân công giáo viên bộ môn'
                        }
                      >
                        {hasTeacher ? (
                          <>
                            <RotateCcw size={13} /> Đổi giáo viên
                          </>
                        ) : (
                          <>
                            <UserPlus size={13} /> Phân công GV
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2: DANH SÁCH HỌC SINH & LỊCH SỬ PHÂN LỚP */}
      {activeTab === 'STUDENTS' && (
        <div className="cls-card-wrapper cls-tab-content">
          <div className="cls-subtabs-toolbar">
            <div className="cls-subtabs">
              <button
                type="button"
                className={`cls-subtab-btn ${studentSubTab === 'ACTIVE' ? 'is-active' : ''}`}
                onClick={() => setStudentSubTab('ACTIVE')}
              >
                <Users size={15} /> Học sinh hiện tại ({currentActiveStudents.length})
              </button>
              <button
                type="button"
                className={`cls-subtab-btn ${studentSubTab === 'HISTORY' ? 'is-active' : ''}`}
                onClick={() => setStudentSubTab('HISTORY')}
              >
                <History size={15} /> Lịch sử phân lớp ({pastStudents.length})
              </button>
            </div>

            {/* Action buttons (only in Active students view and not archived) */}
            <div className="cls-student-actions">
              <button
                type="button"
                className="cls-btn-action-outline"
                onClick={() => setIsExcelModalOpen(true)}
                disabled={isArchived}
                title={isArchived ? 'Lớp đã lưu trữ, không thể thêm học sinh' : 'Nhập danh sách học sinh từ file Excel/CSV'}
              >
                <FileSpreadsheet size={15} /> Nhập từ Excel
              </button>
              <button
                type="button"
                className="cls-btn-create"
                style={{ minHeight: '36px', padding: '0 14px' }}
                onClick={() => {
                  setSelectedStudentId('')
                  setStudentFormError('')
                  setIsAddStudentOpen(true)
                }}
                disabled={isArchived}
                title={isArchived ? 'Lớp đã lưu trữ, không thể thêm học sinh' : 'Thêm từng học sinh thủ công'}
              >
                <Plus size={15} /> Thêm học sinh thủ công
              </button>
            </div>
          </div>

          {/* Sub-tab 1: Học sinh hiện tại */}
          {studentSubTab === 'ACTIVE' && (
            <div>
              {currentActiveStudents.length === 0 ? (
                <div className="cls-empty-box">
                  <Users size={36} className="cls-empty-icon" />
                  <h4>Lớp chưa có học sinh nào</h4>
                  <p>Hãy nhấn "Nhập từ Excel" hoặc "Thêm học sinh thủ công" để bắt đầu xếp danh sách lớp.</p>
                  {!isArchived && (
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 12 }}>
                      <button
                        type="button"
                        className="cls-btn-action-outline"
                        onClick={() => setIsExcelModalOpen(true)}
                      >
                        <FileSpreadsheet size={14} /> Nhập từ Excel
                      </button>
                      <button
                        type="button"
                        className="cls-btn-create"
                        style={{ minHeight: '36px', padding: '0 14px' }}
                        onClick={() => {
                          setSelectedStudentId('')
                          setStudentFormError('')
                          setIsAddStudentOpen(true)
                        }}
                      >
                        <Plus size={14} /> Thêm thủ công
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <table className="cls-table">
                  <thead>
                    <tr>
                      <th style={{ width: '50px', textAlign: 'center' }}>#</th>
                      <th style={{ width: '220px' }}>Họ và tên</th>
                      <th style={{ width: '170px' }}>Tên đăng nhập</th>
                      <th style={{ width: '220px' }}>Liên hệ</th>
                      <th style={{ width: '180px' }}>Trạng thái mật khẩu</th>
                      <th style={{ width: '130px' }}>Ngày vào lớp</th>
                      <th style={{ width: '110px', textAlign: 'right' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentActiveStudents.map(({ membership, student }, idx) => (
                      <tr key={student.id}>
                        <td style={{ textAlign: 'center', fontWeight: 600, color: '#688272' }}>
                          {idx + 1}
                        </td>
                        <td>
                          <div className="cls-student-name-cell">
                            <div className="cls-student-avatar">
                              {student.fullName.slice(-1)}
                            </div>
                            <div>
                              <strong>{student.fullName}</strong>
                              <small>ID: {student.id}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <code className="cls-username-pill">@{student.username}</code>
                        </td>
                        <td>
                          <span className="cls-contact-text">{student.contact}</span>
                        </td>
                        <td>
                          {student.passwordChangedAt ? (
                            <span className="cls-status-pill cls-pill-pwd-changed">
                              <KeyRound size={12} /> Đã đổi mật khẩu
                            </span>
                          ) : (
                            <span className="cls-status-pill cls-pill-pwd-init">
                              <Lock size={12} /> Mật khẩu ban đầu
                            </span>
                          )}
                        </td>
                        <td>
                          <span className="cls-date-text">{membership.joinedAt}</span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="cls-btn-remove-student"
                            onClick={() => setRemovingStudent(student)}
                            disabled={isArchived}
                            title={isArchived ? 'Lớp đã lưu trữ' : 'Chuyển học sinh ra khỏi lớp'}
                          >
                            <UserMinus size={14} /> Chuyển ra
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Sub-tab 2: Lịch sử phân lớp */}
          {studentSubTab === 'HISTORY' && (
            <div>
              {pastStudents.length === 0 ? (
                <div className="cls-empty-box">
                  <History size={36} className="cls-empty-icon" />
                  <h4>Chưa có học sinh nào từng rời lớp</h4>
                  <p>Lịch sử ghi nhận học sinh đã chuyển lớp hoặc kết thúc khóa học sẽ hiển thị tại đây.</p>
                </div>
              ) : (
                <table className="cls-table">
                  <thead>
                    <tr>
                      <th style={{ width: '50px', textAlign: 'center' }}>#</th>
                      <th style={{ width: '240px' }}>Họ và tên</th>
                      <th style={{ width: '180px' }}>Tên đăng nhập</th>
                      <th style={{ width: '220px' }}>Liên hệ</th>
                      <th style={{ width: '160px' }}>Ngày vào lớp</th>
                      <th style={{ width: '160px' }}>Ngày rời lớp</th>
                      <th>Thời gian tham gia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pastStudents.map(({ membership, student }, idx) => (
                      <tr key={`${student.id}-${membership.joinedAt}`}>
                        <td style={{ textAlign: 'center', fontWeight: 600, color: '#688272' }}>
                          {idx + 1}
                        </td>
                        <td>
                          <div className="cls-student-name-cell">
                            <div className="cls-student-avatar is-history">
                              {student.fullName.slice(-1)}
                            </div>
                            <div>
                              <strong>{student.fullName}</strong>
                              <small>Cựu học sinh</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <code className="cls-username-pill">@{student.username}</code>
                        </td>
                        <td>
                          <span className="cls-contact-text">{student.contact}</span>
                        </td>
                        <td>
                          <span className="cls-date-text">{membership.joinedAt}</span>
                        </td>
                        <td>
                          <span className="cls-date-text is-left">{membership.leftAt}</span>
                        </td>
                        <td>
                          <span className="cls-duration-badge">
                            <Clock size={12} /> {membership.joinedAt} → {membership.leftAt}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}

      {/* ================= MODALS ================= */}

      {/* 1. Modal Chỉnh sửa thông tin lớp */}
      {isEditOpen && (
        <div
          className="cls-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-class-title"
        >
          <div className="cls-modal">
            <div className="cls-modal-head">
              <h3 id="edit-class-title">Chỉnh sửa thông tin lớp {classroom.name}</h3>
              <button
                type="button"
                className="cls-modal-close"
                onClick={() => setIsEditOpen(false)}
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveEdit}>
              <div className="cls-modal-body">
                <div className="cls-field">
                  <label htmlFor="edit-name">Tên lớp học *</label>
                  <input
                    id="edit-name"
                    type="text"
                    value={editDraft.name}
                    onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })}
                    required
                  />
                </div>

                <div className="cls-field-group">
                  <div className="cls-field">
                    <label htmlFor="edit-grade">Khối lớp *</label>
                    <select
                      id="edit-grade"
                      value={editDraft.gradeLevel}
                      onChange={(e) => setEditDraft({ ...editDraft, gradeLevel: Number(e.target.value) })}
                    >
                      <option value={10}>Khối 10</option>
                      <option value={11}>Khối 11</option>
                      <option value={12}>Khối 12</option>
                    </select>
                  </div>
                  <div className="cls-field">
                    <label htmlFor="edit-year">Năm học *</label>
                    <input
                      id="edit-year"
                      type="text"
                      value={editDraft.academicYear}
                      onChange={(e) => setEditDraft({ ...editDraft, academicYear: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {editErrors.length > 0 && (
                  <div className="adm-errors" role="alert" style={{ margin: 0 }}>
                    <strong>Vui lòng kiểm tra lại:</strong>
                    <ul>
                      {editErrors.map((err) => (
                        <li key={err}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div className="cls-modal-foot">
                <button
                  type="button"
                  className="cls-btn-cancel"
                  onClick={() => setIsEditOpen(false)}
                >
                  Hủy
                </button>
                <button type="submit" className="cls-btn-submit">
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Modal Xác nhận Lưu trữ lớp học */}
      {isArchiveConfirmOpen && (
        <div
          className="cls-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="archive-class-title"
        >
          <div className="cls-modal" style={{ maxWidth: '480px' }}>
            <div className="cls-modal-head">
              <h3 id="archive-class-title" style={{ color: '#b72727' }}>
                <Lock size={18} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                Xác nhận lưu trữ lớp {classroom.name}
              </h3>
              <button
                type="button"
                className="cls-modal-close"
                onClick={() => setIsArchiveConfirmOpen(false)}
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
            </div>
            <div className="cls-modal-body">
              <div className="cls-atomic-banner" style={{ margin: 0 }}>
                <div className="cls-atomic-title">
                  <AlertTriangle size={18} />
                  <span>Hành động này sẽ chuyển lớp sang trạng thái Read-only</span>
                </div>
                <p style={{ margin: '6px 0 0 24px', fontSize: '12px' }}>
                  Toàn bộ các học sinh đang trong lớp sẽ được đóng đợt học (chuyển sang Lịch sử phân lớp).
                  Không thể thêm học sinh, phân công hoặc thay đổi thông tin môn học của lớp này sau khi lưu trữ.
                </p>
              </div>
              <p style={{ marginTop: 14, fontSize: '13px', color: '#445b4e' }}>
                Bạn có chắc chắn muốn lưu trữ lớp <strong>{classroom.name}</strong> ({classroom.academicYear}) không?
              </p>
            </div>
            <div className="cls-modal-foot">
              <button
                type="button"
                className="cls-btn-cancel"
                onClick={() => setIsArchiveConfirmOpen(false)}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="cls-btn-submit"
                style={{ background: '#b72727', borderColor: '#b72727' }}
                onClick={handleConfirmArchive}
              >
                Xác nhận lưu trữ lớp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Modal Phân công / Đổi giáo viên phụ trách môn */}
      {assigningSubject && (
        <div
          className="cls-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="assign-teacher-title"
        >
          <div className="cls-modal" style={{ maxWidth: '560px' }}>
            <div className="cls-modal-head">
              <div>
                <div className="cls-modal-badge">
                  <BookOpen size={14} /> Phân công giáo viên bộ môn
                </div>
                <h3 id="assign-teacher-title" style={{ marginTop: 4 }}>
                  Môn {assigningSubject.subject.name} · Lớp {classroom.name}
                </h3>
              </div>
              <button
                type="button"
                className="cls-modal-close"
                onClick={() => setAssigningSubject(null)}
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
            </div>

            <div className="cls-modal-body">
              {/* Eligible Teachers Query */}
              {(() => {
                const eligibleTeachers = getEligibleTeachers(assigningSubject.subject.id)

                if (eligibleTeachers.length === 0) {
                  return (
                    <div className="cls-no-teachers-box">
                      <AlertCircle size={32} style={{ color: '#c8761e', margin: '0 auto 10px' }} />
                      <h4>Chưa có giáo viên nào có chuyên môn môn học này đang hoạt động</h4>
                      <p>
                        Hiện không có giáo viên nào đang ở trạng thái <code>ACTIVE</code> với chuyên môn{' '}
                        <strong>{assigningSubject.subject.name}</strong>.
                      </p>
                      <p style={{ marginTop: 8, fontSize: '12px', color: '#688272' }}>
                        Vui lòng thêm giáo viên mới hoặc cập nhật chuyên môn giáo viên tại mục{' '}
                        <strong>Quản lý tài khoản</strong> trước khi phân công.
                      </p>
                    </div>
                  )
                }

                return (
                  <div>
                    <p style={{ fontSize: '13px', color: '#445b4e', marginBottom: 12 }}>
                      Chọn một giáo viên từ danh sách có chuyên môn{' '}
                      <strong>{assigningSubject.subject.name}</strong> (
                      {eligibleTeachers.length} giáo viên đủ điều kiện):
                    </p>

                    <div className="cls-teacher-options">
                      {/* Option to clear teacher (unassign) */}
                      <label
                        className={`cls-teacher-option-card ${selectedTeacherId === null ? 'is-selected' : ''}`}
                      >
                        <input
                          type="radio"
                          name="teacher-selection"
                          checked={selectedTeacherId === null}
                          onChange={() => setSelectedTeacherId(null)}
                        />
                        <div className="cls-teacher-option-body">
                          <strong>Chưa phân công (để trống)</strong>
                          <small>Không chỉ định giáo viên phụ trách môn này lúc này</small>
                        </div>
                      </label>

                      {eligibleTeachers.map((t) => (
                        <label
                          key={t.id}
                          className={`cls-teacher-option-card ${selectedTeacherId === t.id ? 'is-selected' : ''}`}
                        >
                          <input
                            type="radio"
                            name="teacher-selection"
                            checked={selectedTeacherId === t.id}
                            onChange={() => setSelectedTeacherId(t.id)}
                          />
                          <div className="cls-teacher-avatar-sm">
                            {t.fullName.slice(-1)}
                          </div>
                          <div className="cls-teacher-option-body">
                            <div className="cls-teacher-option-name">
                              <strong>{t.fullName}</strong>
                              <span className="cls-opt-role">@{t.username}</span>
                            </div>
                            <div className="cls-teacher-option-meta">
                              <span><Mail size={12} /> {t.contact}</span>
                              {t.qualification && (
                                <span><Award size={12} /> {t.qualification}</span>
                              )}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )
              })()}
            </div>

            <div className="cls-modal-foot">
              <button
                type="button"
                className="cls-btn-cancel"
                onClick={() => setAssigningSubject(null)}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="cls-btn-submit"
                onClick={handleSaveTeacherAssignment}
              >
                <Check size={15} /> Xác nhận phân công
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Modal Thêm học sinh thủ công */}
      {isAddStudentOpen && (() => {
        const unassignedStudents = accounts.filter(
          (a) => a.role === 'STUDENT' && a.status === 'ACTIVE' && a.classroomId === null
        )

        return (
          <div
            className="cls-modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-student-title"
          >
            <div className="cls-modal" style={{ maxWidth: '480px' }}>
              <div className="cls-modal-head">
                <h3 id="add-student-title">Thêm học sinh vào lớp {classroom.name}</h3>
                <button
                  type="button"
                  className="cls-modal-close"
                  onClick={() => setIsAddStudentOpen(false)}
                  aria-label="Đóng"
                >
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleManualAddStudent}>
                <div className="cls-modal-body">
                  {unassignedStudents.length === 0 ? (
                    <div className="cls-empty-box" style={{ padding: '24px 16px' }}>
                      <Users size={36} className="cls-empty-icon" style={{ color: '#c8761e' }} />
                      <h4 style={{ fontSize: '15px', color: '#163323', margin: '0 0 6px' }}>
                        Không có học sinh chưa có lớp
                      </h4>
                      <p style={{ fontSize: '13px', color: '#688272', margin: '0 0 14px', lineHeight: 1.5 }}>
                        Tất cả tài khoản học sinh đang hoạt động đều đã thuộc một lớp học. Để thêm học sinh mới,
                        Admin hãy tạo tài khoản tại mục <strong>Quản lý tài khoản</strong> trước khi thêm thủ công.
                      </p>
                    </div>
                  ) : (
                    <div className="cls-field">
                      <label htmlFor="manual-student-select">Chọn tài khoản học sinh *</label>
                      <select
                        id="manual-student-select"
                        value={selectedStudentId}
                        onChange={(e) => {
                          setSelectedStudentId(e.target.value)
                          setStudentFormError('')
                        }}
                        required
                      >
                        <option value="">-- Chọn học sinh ({unassignedStudents.length} học sinh chưa có lớp) --</option>
                        {unassignedStudents.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.fullName} (@{s.username}) — {s.contact}
                          </option>
                        ))}
                      </select>
                      <small style={{ color: '#688272', fontSize: '11px', marginTop: 4 }}>
                        Chỉ hiển thị các tài khoản vai trò Học sinh đang hoạt động và chưa thuộc lớp nào.
                      </small>
                    </div>
                  )}

                  {studentFormError && (
                    <div className="cls-error-container">
                      <div className="cls-error-title">
                        <AlertCircle size={15} /> Không thể thêm học sinh
                      </div>
                      <p style={{ margin: 0, fontSize: '12px', color: '#b72727' }}>{studentFormError}</p>
                    </div>
                  )}
                </div>
                <div className="cls-modal-foot">
                  <button
                    type="button"
                    className="cls-btn-cancel"
                    onClick={() => setIsAddStudentOpen(false)}
                  >
                    Hủy
                  </button>
                  {unassignedStudents.length > 0 && (
                    <button type="submit" className="cls-btn-submit">
                      <UserPlus size={15} /> Thêm vào lớp
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        )
      })()}

      {/* 5. Modal Xác nhận chuyển học sinh ra khỏi lớp */}
      {removingStudent && (
        <div
          className="cls-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="remove-student-title"
        >
          <div className="cls-modal" style={{ maxWidth: '440px' }}>
            <div className="cls-modal-head">
              <h3 id="remove-student-title" style={{ color: '#b72727' }}>
                <UserMinus size={18} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                Chuyển học sinh ra khỏi lớp
              </h3>
              <button
                type="button"
                className="cls-modal-close"
                onClick={() => setRemovingStudent(null)}
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
            </div>
            <div className="cls-modal-body">
              <p style={{ fontSize: '13px', color: '#334e40' }}>
                Bạn có chắc chắn muốn chuyển học sinh <strong>{removingStudent.fullName}</strong> (@{removingStudent.username}) ra khỏi lớp <strong>{classroom.name}</strong> không?
              </p>
              <p style={{ fontSize: '12px', color: '#688272', marginTop: 8 }}>
                Học sinh này sẽ được ghi nhận vào tab <strong>Lịch sử phân lớp</strong> và có thể được phân vào lớp khác sau này.
              </p>
            </div>
            <div className="cls-modal-foot">
              <button
                type="button"
                className="cls-btn-cancel"
                onClick={() => setRemovingStudent(null)}
              >
                Hủy
              </button>
              <button
                type="button"
                className="cls-btn-submit"
                style={{ background: '#b72727', borderColor: '#b72727' }}
                onClick={handleConfirmRemoveStudent}
              >
                Xác nhận chuyển ra
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Modal Import Excel (Task 5 Component) */}
      <StudentExcelImportModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        classroom={classroom}
        onSuccess={handleExcelImportSuccess}
      />
    </div>
  )
}
