import { useEffect, useState, useMemo, type FormEvent } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Award,
  BookOpen,
  Check,
  CheckCircle2,
  Clock,
  Edit3,
  FileSpreadsheet,
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
import { ApiError } from '../../../lib/api/client'
import {
  adminApi,
  type AdminAccount,
  type AdminClassroomDetail,
  type AdminClassroomSummary,
  type AdminClassroomSubject,
  type AdminEligibleTeacher,
  type AdminUnassignedStudent,
} from '../../../lib/api/admin'
import { validateClassroomDraft, type ClassroomDraft } from './classroomForm'
import { formatClassroomDate } from './classroomDate'
import { StudentExcelImportModal } from './StudentExcelImportModal'
import { TransferStudentDialog } from './TransferStudentDialog'
import './classrooms.css'

export interface ClassroomDetailPageProps {
  classroomId: string
  onBack: () => void
}

type ActiveTab = 'SUBJECTS' | 'STUDENTS'
type StudentSubTab = 'ACTIVE' | 'HISTORY'

type StudentRow = {
  membership: {
    studentId: string
    classroomId: string
    joinedAt: string
    leftAt: string | null
  }
  student: AdminAccount
}

type ClassroomSubjectRow = {
  id: string
  classroomId: string
  subjectId: string
  teacherId: string | null
}

type SubjectOption = { id: string; name: string }

function mapStudentRow(classroomId: string, student: AdminClassroomDetail['students'][number]): StudentRow {
  return {
    membership: {
      studentId: student.id,
      classroomId,
      joinedAt: student.joinedAt,
      leftAt: student.leftAt,
    },
    student: {
      id: student.id,
      username: student.username,
      fullName: student.fullName,
      role: 'STUDENT',
      status: 'ACTIVE',
      contact: student.contact ?? '',
      classroomId,
      classroomName: null,
      mustChangePassword: student.mustChangePassword,
      passwordChangedAt: student.passwordChangedAt,
      createdAt: student.joinedAt,
    },
  }
}

function mapClassroomSubject(subject: AdminClassroomSubject, classroomId: string): ClassroomSubjectRow {
  return {
    id: subject.id,
    classroomId,
    subjectId: subject.subjectId,
    teacherId: subject.teacher?.id ?? null,
  }
}

export function ClassroomDetailPage({ classroomId, onBack }: ClassroomDetailPageProps) {
  const [apiClassroom, setApiClassroom] = useState<AdminClassroomDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [isMutating, setIsMutating] = useState(false)
  const [eligibleTeachers, setEligibleTeachers] = useState<AdminEligibleTeacher[]>([])
  const [unassignedStudents, setUnassignedStudents] = useState<AdminUnassignedStudent[]>([])
  const [transferClassrooms, setTransferClassrooms] = useState<AdminClassroomSummary[]>([])
  const [isTransferLoading, setIsTransferLoading] = useState(false)
  const [isTransferring, setIsTransferring] = useState(false)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setLoadError('')
    adminApi.getClassroom(classroomId)
      .then((data) => {
        if (!cancelled) setApiClassroom(data)
      })
      .catch((error) => {
        if (!cancelled) {
          setApiClassroom(null)
          setLoadError(error instanceof ApiError ? error.message : 'Không thể tải chi tiết lớp học.')
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [classroomId])

  async function refresh() {
    try {
      const data = await adminApi.getClassroom(classroomId)
      setApiClassroom(data)
      setLoadError('')
    } catch (error) {
      setLoadError(error instanceof ApiError ? error.message : 'Không thể tải lại chi tiết lớp học.')
    }
  }

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
  const [assigningSubject, setAssigningSubject] = useState<{ cs: ClassroomSubjectRow; subject: SubjectOption } | null>(null)
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null)

  // Manual Add Student Modal state
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false)
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [studentFormError, setStudentFormError] = useState('')

  // Excel Import Modal state
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false)

  // Unenroll / remove student confirmation modal
  const [removingStudent, setRemovingStudent] = useState<AdminAccount | null>(null)
  const [transferringStudent, setTransferringStudent] = useState<AdminAccount | null>(null)

  // Subjects data
  const classroomSubjectList = useMemo(() => {
    if (!apiClassroom) return []
    return apiClassroom.subjects.map((subject) => mapClassroomSubject(subject, apiClassroom.id))
  }, [apiClassroom])

  // Students data
  const currentActiveStudents = useMemo(() => {
    if (!apiClassroom) return []
    return apiClassroom.students.map((student) => mapStudentRow(apiClassroom.id, student))
  }, [apiClassroom])

  const pastStudents = useMemo(() => {
    if (!apiClassroom) return []
    return apiClassroom.studentHistory.map((student) => mapStudentRow(apiClassroom.id, student))
  }, [apiClassroom])

  function getSubject(id: string): SubjectOption | undefined {
    const subject = apiClassroom?.subjects.find((item) => item.subjectId === id)
    return subject ? { id: subject.subjectId, name: subject.subjectName } : undefined
  }

  function getTeacher(id: string | null): AdminAccount | undefined {
    if (!id || !apiClassroom) return undefined
    const subject = apiClassroom.subjects.find((item) => item.teacher?.id === id)
    if (!subject?.teacher) return undefined
    return {
      id: subject.teacher.id,
      username: subject.teacher.username,
      fullName: subject.teacher.fullName,
      role: 'TEACHER',
      status: 'ACTIVE',
      contact: subject.teacher.contact ?? '',
      classroomId: null,
      classroomName: null,
      qualification: subject.teacher.qualification,
      mustChangePassword: false,
      passwordChangedAt: null,
      createdAt: apiClassroom.updatedAt,
    }
  }

  if (isLoading) {
    return (
      <div className="page-content adm-page cls-container">
        <div className="cls-empty-box"><p>Đang tải chi tiết lớp học...</p></div>
      </div>
    )
  }

  if (loadError || !apiClassroom) {
    return (
      <div className="page-content adm-page cls-container">
        <div className="cls-not-found-card">
          <AlertCircle size={40} style={{ color: '#c81e1e', margin: '0 auto 12px' }} />
          <h3>Không thể tải lớp học</h3>
          <p>{loadError || `Mã lớp “${classroomId}” không tồn tại hoặc đã bị xóa khỏi hệ thống.`}</p>
          <button
            type="button"
            className="cls-btn-detail"
            onClick={() => {
              setIsLoading(true)
              void refresh().finally(() => setIsLoading(false))
            }}
          >
            <RotateCcw size={14} /> Thử lại
          </button>
          <button type="button" className="cls-btn-create" onClick={onBack}>
            <ArrowLeft size={16} /> Quay lại danh sách lớp học
          </button>
        </div>
      </div>
    )
  }

  const classroom = apiClassroom
  const isArchived = classroom.status === 'ARCHIVED'

  // Open Edit modal
  function openEditModal() {
    if (isArchived) return
    setEditDraft({
      name: classroom.name,
      gradeLevel: classroom.gradeLevel,
      academicYear: classroom.academicYear,
    })
    setEditErrors([])
    setIsEditOpen(true)
  }

  async function handleSaveEdit(e: FormEvent) {
    e.preventDefault()
    const validationErrors = validateClassroomDraft(editDraft)
    if (validationErrors.length > 0) {
      setEditErrors(validationErrors)
      return
    }
    setIsMutating(true)
    try {
      await adminApi.updateClassroom(classroom.id, editDraft)
      setIsEditOpen(false)
      await refresh()
      setFeedback({ type: 'success', message: `Đã cập nhật thông tin lớp học "${editDraft.name}" thành công!` })
    } catch (error) {
      setEditErrors([error instanceof ApiError ? error.message : 'Lỗi cập nhật thông tin lớp.'])
    } finally {
      setIsMutating(false)
    }
  }

  // Handle Archive Confirmation
  async function handleConfirmArchive() {
    if (isArchived) return
    setIsMutating(true)
    try {
      await adminApi.archiveClassroom(classroom.id)
      setIsArchiveConfirmOpen(false)
      await refresh()
      setFeedback({ type: 'success', message: `Đã lưu trữ lớp "${classroom.name}". Lớp hiện ở chế độ chỉ đọc.` })
    } catch (error) {
      setFeedback({ type: 'error', message: error instanceof ApiError ? error.message : 'Không thể lưu trữ lớp học.' })
    } finally {
      setIsMutating(false)
    }
  }

  // Open Assign Teacher Modal
  async function handleOpenAssignTeacher(cs: ClassroomSubjectRow) {
    if (isArchived) return
    const sub = getSubject(cs.subjectId)
    if (!sub) return
    setAssigningSubject({ cs, subject: sub })
    setSelectedTeacherId(cs.teacherId)
    setEligibleTeachers([])
    try {
      const teachers = await adminApi.listEligibleTeachers(classroom.id, cs.subjectId)
      setEligibleTeachers(teachers)
    } catch (error) {
      setAssigningSubject(null)
      setFeedback({ type: 'error', message: error instanceof ApiError ? error.message : 'Không thể tải danh sách giáo viên đủ điều kiện.' })
    }
  }

  async function handleSaveTeacherAssignment() {
    if (!assigningSubject) return
    setIsMutating(true)
    try {
      await adminApi.assignTeacher(classroom.id, assigningSubject.subject.id, selectedTeacherId, assigningSubject.cs.teacherId)
      setFeedback({ type: 'success', message: `Đã cập nhật phân công môn ${assigningSubject.subject.name}.` })
      setAssigningSubject(null)
      await refresh()
    } catch (error) {
      setFeedback({ type: 'error', message: error instanceof ApiError ? error.message : 'Không thể cập nhật phân công giáo viên.' })
    } finally {
      setIsMutating(false)
    }
  }

  async function openAddStudentModal() {
    setSelectedStudentId('')
    setStudentFormError('')
    try {
      const response = await adminApi.listUnassignedStudents({ limit: 100 })
      setUnassignedStudents(response.items)
      setIsAddStudentOpen(true)
    } catch (error) {
      setFeedback({ type: 'error', message: error instanceof ApiError ? error.message : 'Không thể tải danh sách học sinh chưa có lớp.' })
    }
  }

  // Handle Manual Student Add
  async function handleManualAddStudent(e: FormEvent) {
    e.preventDefault()
    setStudentFormError('')
    if (!selectedStudentId) {
      setStudentFormError('Vui lòng chọn một học sinh từ danh sách.')
      return
    }
    setIsMutating(true)
    try {
      await adminApi.enrollStudent(classroom.id, selectedStudentId)
      setIsAddStudentOpen(false)
      setSelectedStudentId('')
      await refresh()
      setFeedback({ type: 'success', message: 'Đã thêm học sinh vào lớp.' })
    } catch (error) {
      setStudentFormError(error instanceof ApiError ? error.message : 'Không thể thêm học sinh vào lớp.')
    } finally {
      setIsMutating(false)
    }
  }

  // Handle Unenroll Student
  async function handleConfirmRemoveStudent() {
    if (!removingStudent) return
    setIsMutating(true)
    try {
      await adminApi.removeStudent(classroom.id, removingStudent.id)
      setRemovingStudent(null)
      await refresh()
      setFeedback({ type: 'success', message: `Đã chuyển ${removingStudent.fullName} ra khỏi lớp.` })
    } catch (error) {
      setFeedback({ type: 'error', message: error instanceof ApiError ? error.message : 'Không thể chuyển học sinh ra khỏi lớp.' })
    } finally {
      setIsMutating(false)
    }
  }

  async function openTransferStudent(student: AdminAccount) {
    if (isArchived) return
    setTransferringStudent(student)
    setTransferClassrooms([])
    setIsTransferLoading(true)
    try {
      const result = await adminApi.listClassrooms({ status: 'ACTIVE', page: 1, limit: 100 })
      setTransferClassrooms(result.items.filter((item) => item.id !== classroom.id))
    } catch (error) {
      setTransferringStudent(null)
      setFeedback({ type: 'error', message: error instanceof ApiError ? error.message : 'Không thể tải danh sách lớp đích.' })
    } finally {
      setIsTransferLoading(false)
    }
  }

  async function handleTransferStudent(targetClassroomId: string) {
    if (!transferringStudent) return
    setIsTransferring(true)
    try {
      await adminApi.transferStudent(transferringStudent.id, targetClassroomId)
      const studentName = transferringStudent.fullName
      setTransferringStudent(null)
      await refresh()
      setFeedback({ type: 'success', message: `Đã chuyển ${studentName} sang lớp mới.` })
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        await refresh()
        setFeedback({ type: 'error', message: 'Danh sách phân lớp vừa thay đổi. Đã tải lại dữ liệu, bạn hãy kiểm tra rồi thử lại.' })
      }
      throw error
    } finally {
      setIsTransferring(false)
    }
  }

  // Handle Excel Import Success
  async function handleExcelImportSuccess(count: number) {
    await refresh()
    setFeedback({
      type: 'success',
      message: `Đã thêm ${count} học sinh vào lớp ${classroom.name}.`,
    })
  }

  return (
    <div className="page-content adm-page cls-container">
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
            Khối {classroom.gradeLevel}
          </div>
          <div className="cls-detail-header-titles">
            <h2>{classroom.name}</h2>
            <div className="cls-detail-header-meta">
              <span className="cls-meta-pill">
                {classroom.academicYear}
              </span>
              <span className="cls-meta-pill">
                <strong>{currentActiveStudents.length}</strong> học sinh
              </span>
              <span
                className={`cls-status-pill ${
                  isArchived ? 'is-archived' : 'is-active'
                }`}
              >
                {isArchived ? 'Đã lưu trữ' : 'Đang hoạt động'}
              </span>
            </div>
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
          Môn học & giáo viên
          <span className="cls-tab-count">{classroomSubjectList.length}</span>
        </button>
        <button
          type="button"
          className={`cls-tab-btn ${activeTab === 'STUDENTS' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('STUDENTS')}
        >
          Học sinh & lịch sử
          <span className="cls-tab-count">{currentActiveStudents.length}</span>
        </button>
      </div>

      {/* TAB 1: MÔN HỌC VÀ GIÁO VIÊN PHỤ TRÁCH */}
      {activeTab === 'SUBJECTS' && (
        <div className="cls-card-wrapper cls-tab-content">
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
                            <div className="cls-teacher-contact">{teacher.contact}</div>
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
                onClick={() => void openAddStudentModal()}
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
                        onClick={() => void openAddStudentModal()}
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
                      <th style={{ width: '210px', textAlign: 'right' }}>Thao tác</th>
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
                          <span className="cls-date-text">{formatClassroomDate(membership.joinedAt)}</span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="cls-btn-action-outline"
                            onClick={() => void openTransferStudent(student)}
                            disabled={isArchived}
                            title={isArchived ? 'Lớp đã lưu trữ' : 'Chuyển học sinh sang lớp đang hoạt động khác'}
                          >
                            <UserCheck size={14} /> Chuyển lớp
                          </button>
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
                          <span className="cls-date-text">{formatClassroomDate(membership.joinedAt)}</span>
                        </td>
                        <td>
                          <span className="cls-date-text is-left">{formatClassroomDate(membership.leftAt)}</span>
                        </td>
                        <td>
                          <span className="cls-duration-badge">
                            <Clock size={12} /> {formatClassroomDate(membership.joinedAt)} → {formatClassroomDate(membership.leftAt)}
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
                <button type="submit" className="cls-btn-submit" disabled={isMutating}>
                  {isMutating ? 'Đang lưu...' : 'Lưu thay đổi'}
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
                disabled={isMutating}
              >
                {isMutating ? 'Đang lưu...' : 'Xác nhận lưu trữ lớp'}
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
                if (eligibleTeachers.length === 0) {
                  return (
                    <div className="cls-no-teachers-box">
                      <AlertCircle size={32} style={{ color: '#c8761e', margin: '0 auto 10px' }} />
                      <h4>Chưa có giáo viên nào có chuyên môn môn học này đang hoạt động</h4>
                      <p>
                        Chưa có giáo viên đang hoạt động phù hợp với môn <strong>{assigningSubject.subject.name}</strong>.
                      </p>
                      <p style={{ marginTop: 8, fontSize: '12px', color: 'var(--ec-muted)' }}>
                        Cập nhật chuyên môn trong <strong>Tài khoản</strong> trước khi phân công.
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
                className="cls-btn-submit cls-btn-assign-confirm"
                onClick={handleSaveTeacherAssignment}
                disabled={isMutating}
              >
                <Check size={15} /> {isMutating ? 'Đang lưu...' : 'Xác nhận phân công'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Modal Thêm học sinh thủ công */}
      {isAddStudentOpen && (() => {
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
                    <button type="submit" className="cls-btn-submit" disabled={isMutating}>
                      <UserPlus size={15} /> {isMutating ? 'Đang lưu...' : 'Thêm vào lớp'}
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
                disabled={isMutating}
              >
                {isMutating ? 'Đang lưu...' : 'Xác nhận chuyển ra'}
              </button>
            </div>
          </div>
        </div>
      )}

      {transferringStudent && (
        <TransferStudentDialog
          student={transferringStudent}
          currentClassroomName={classroom.name}
          classrooms={transferClassrooms}
          isLoading={isTransferLoading}
          isSaving={isTransferring}
          onClose={() => setTransferringStudent(null)}
          onSave={handleTransferStudent}
        />
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
