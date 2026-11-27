import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { CheckCircle2, X } from 'lucide-react'
import type { AdminAccount, AdminSubject } from '../../../lib/api/admin'
import { adminApi } from '../../../lib/api/admin'
import { ApiError } from '../../../lib/api/client'
import { validateSubjectName } from './subjectRules'
import { SubjectEditDialog } from './SubjectEditDialog'
import { SubjectCreateDialog } from './SubjectCreateDialog'
import { SubjectToolbar } from './SubjectToolbar'
import { SubjectsTable } from './SubjectsTable'
import './subjects.css'

export function ClassroomSubjectsPage() {
  const [subjectList, setSubjectList] = useState<AdminSubject[]>([])
  const [teachers, setTeachers] = useState<AdminAccount[]>([])
  const [activeClassroomCount, setActiveClassroomCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  // Add Subject Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newSubjectName, setNewSubjectName] = useState('')
  const [formErrors, setFormErrors] = useState<string[]>([])
  const [successNotice, setSuccessNotice] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [editingSubject, setEditingSubject] = useState<AdminSubject | null>(null)
  const [statusSavingId, setStatusSavingId] = useState<string | null>(null)
  const [statusError, setStatusError] = useState('')

  useEffect(() => {
    let cancelled = false

    Promise.all([
      adminApi.listSubjects(),
      adminApi.listAccounts({ role: 'TEACHER', status: 'ACTIVE', page: 1, limit: 100 }),
      adminApi.listClassrooms({ status: 'ACTIVE', page: 1, limit: 1 }),
    ])
      .then(([subjects, accountResult, classroomResult]) => {
        if (cancelled) return
        setSubjectList(subjects)
        setTeachers(accountResult.items)
        setActiveClassroomCount(classroomResult.meta.totalItems)
        setLoadError('')
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoadError(error instanceof ApiError ? error.message : 'Không thể tải danh mục môn học.')
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const totalEligibleTeachers = useMemo(() => teachers.length, [teachers])

  // Filtered subjects
  const filteredSubjects = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return subjectList
    return subjectList.filter(
      (s) =>
        s.name.toLowerCase().includes(term) ||
        s.id.toLowerCase().includes(term)
    )
  }, [subjectList, searchTerm])

  function openAddModal() {
    setNewSubjectName('')
    setFormErrors([])
    setIsModalOpen(true)
  }

  function closeAddModal() {
    setIsModalOpen(false)
    setNewSubjectName('')
    setFormErrors([])
  }

  async function handleCreateSubject(e: FormEvent) {
    e.preventDefault()
    const errors = validateSubjectName(newSubjectName, subjectList)
    if (errors.length > 0) {
      setFormErrors(errors)
      return
    }

    const trimmed = newSubjectName.trim()
    setIsSaving(true)
    try {
      const created = await adminApi.createSubject(trimmed)
      setSubjectList((current) => [created, ...current])
      setSuccessNotice(
        `Đã thêm môn ${trimmed} vào danh mục chung và tự động mở môn cho ${activeClassroomCount} lớp đang hoạt động (trạng thái: Chưa phân công giáo viên).`
      )
      closeAddModal()
    } catch (error) {
      setFormErrors([error instanceof ApiError ? error.message : 'Không thể thêm môn học. Hãy thử lại.'])
    } finally {
      setIsSaving(false)
    }
  }

  async function handleSaveSubjectName(name: string): Promise<AdminSubject> {
    if (!editingSubject) throw new Error('Không tìm thấy môn học cần sửa.')

    const updated = await adminApi.updateSubject(editingSubject.id, name)
    setSubjectList((current) => current.map((subject) => subject.id === updated.id ? updated : subject))
    setSuccessNotice(`Đã cập nhật tên môn học thành “${updated.name}”. ID và dữ liệu liên quan được giữ nguyên.`)
    return updated
  }

  async function handleToggleSubjectStatus(subject: AdminSubject) {
    const nextStatus = !subject.isActive
    const action = nextStatus ? 'bật lại' : 'tắt'
    const detail = nextStatus
      ? `Bật lại môn “${subject.name}” cho các lớp đang hoạt động?`
      : `Tắt môn “${subject.name}”? Dữ liệu lớp và lịch sử học tập sẽ không bị xóa.`

    if (!window.confirm(detail)) return

    setStatusSavingId(subject.id)
    setStatusError('')
    try {
      const updated = await adminApi.updateSubjectStatus(subject.id, nextStatus)
      setSubjectList((current) => current.map((item) => item.id === updated.id ? updated : item))
      setSuccessNotice(`Đã ${action} môn “${updated.name}”.`)
    } catch (error) {
      setStatusError(error instanceof ApiError ? error.message : `Không thể ${action} môn học.`)
    } finally {
      setStatusSavingId(null)
    }
  }

  return (
    <div className="page-content adm-page sbj-page">
      {/* Page Heading */}
      <div className="page-heading">
        <h1>Danh mục môn học</h1>
        <p>Quản lý môn học dùng chung và giáo viên chuyên môn.</p>
      </div>

      {/* Success Alert Banner */}
      {successNotice && (
        <div className="sbj-alert-success" role="status">
          <div className="sbj-alert-content">
            <CheckCircle2 size={18} />
            <span>{successNotice}</span>
          </div>
          <button
            type="button"
            className="sbj-alert-close"
            onClick={() => setSuccessNotice(null)}
            aria-label="Đóng thông báo"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {statusError && (
        <div className="sbj-form-errors" role="alert">
          {statusError}
          <button type="button" className="sbj-alert-close" onClick={() => setStatusError('')} aria-label="Đóng lỗi">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="sbj-stats-grid">
        <div className="sbj-stat-card">
          <div className="sbj-stat-info">
            <span className="sbj-stat-value">{subjectList.length}</span>
            <span className="sbj-stat-label">Môn học</span>
          </div>
        </div>

        <div className="sbj-stat-card">
          <div className="sbj-stat-info">
            <span className="sbj-stat-value">{totalEligibleTeachers}</span>
            <span className="sbj-stat-label">Giáo viên chuyên môn</span>
          </div>
        </div>

        <div className="sbj-stat-card">
          <div className="sbj-stat-info">
            <span className="sbj-stat-value">{activeClassroomCount}</span>
            <span className="sbj-stat-label">Lớp đang áp dụng</span>
          </div>
        </div>
      </div>

      <SubjectToolbar value={searchTerm} onChange={setSearchTerm} onCreate={openAddModal} />

      <SubjectsTable
        subjects={filteredSubjects}
        teachers={teachers}
        activeClassroomCount={activeClassroomCount}
        isLoading={isLoading}
        loadError={loadError}
        searchTerm={searchTerm}
        statusSavingId={statusSavingId}
        onClearSearch={() => setSearchTerm('')}
        onEdit={setEditingSubject}
        onToggleStatus={(subject) => void handleToggleSubjectStatus(subject)}
      />

      {isModalOpen && (
        <SubjectCreateDialog
          name={newSubjectName}
          formErrors={formErrors}
          isSaving={isSaving}
          onClose={closeAddModal}
          onSubmit={handleCreateSubject}
          onNameChange={(name) => {
            setNewSubjectName(name)
            if (formErrors.length > 0) setFormErrors([])
          }}
        />
      )}

      {editingSubject && (
        <SubjectEditDialog
          subject={editingSubject}
          subjects={subjectList}
          onClose={() => setEditingSubject(null)}
          onSave={handleSaveSubjectName}
        />
      )}
    </div>
  )
}
