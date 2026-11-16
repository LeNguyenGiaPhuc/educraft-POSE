import { useState, type FormEvent } from 'react'
import { Pencil, X } from 'lucide-react'
import type { AdminSubject } from '../../../lib/api/admin'
import { ApiError } from '../../../lib/api/client'
import { validateSubjectName } from './subjectRules'

type Props = {
  subject: AdminSubject
  subjects: AdminSubject[]
  onClose: () => void
  onSave: (name: string) => Promise<AdminSubject>
}

export function SubjectEditDialog({ subject, subjects, onClose, onSave }: Props) {
  const [name, setName] = useState(subject.name)
  const [errors, setErrors] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)

  const nameChanged = name.trim() !== subject.name.trim()

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()

    const validationErrors = validateSubjectName(name, subjects, subject.id)
    if (validationErrors.length > 0) {
      setErrors(validationErrors)
      return
    }

    setIsSaving(true)
    setErrors([])
    try {
      await onSave(name.trim())
      onClose()
    } catch (error) {
      setErrors([error instanceof ApiError ? error.message : 'Không thể cập nhật môn học. Hãy thử lại.'])
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <dialog
      open
      className="sbj-modal-backdrop"
      aria-labelledby="modal-edit-subject-title"
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
    >
      <div className="sbj-modal">
        <div className="sbj-modal-head">
          <h2 id="modal-edit-subject-title" className="sbj-modal-title">
            <Pencil size={19} color="#286449" /> Sửa môn học
          </h2>
          <button type="button" className="sbj-modal-close-btn" onClick={onClose} aria-label="Đóng cửa sổ">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="sbj-modal-body">
            <p className="sbj-modal-intro">
              Chỉ đổi tên hiển thị của môn học. ID, giáo viên, lớp học và dữ liệu học tập liên quan sẽ được giữ nguyên.
            </p>

            <div className="sbj-form-field">
              <label htmlFor="edit-subject-id" className="sbj-form-label">Mã môn (ID)</label>
              <input id="edit-subject-id" className="sbj-form-input sbj-readonly-input" value={subject.id} readOnly />
            </div>

            <div className="sbj-form-field">
              <label htmlFor="edit-subject-name" className="sbj-form-label">
                Tên môn học <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                id="edit-subject-name"
                className="sbj-form-input"
                value={name}
                onChange={(event) => {
                  setName(event.target.value)
                  setErrors([])
                }}
                autoFocus
                maxLength={150}
              />
            </div>

            <div className="sbj-edit-impact">
              <span>Phạm vi đang liên kết</span>
              <strong>{subject.teacherCount} giáo viên · {subject.classroomCount} lớp học</strong>
            </div>

            {errors.length > 0 && (
              <div className="sbj-form-errors" role="alert">
                <strong>Không thể sửa môn học:</strong>
                <ul>
                  {errors.map((error) => <li key={error}>{error}</li>)}
                </ul>
              </div>
            )}
          </div>

          <div className="sbj-modal-foot">
            <button type="button" className="sbj-btn-secondary" onClick={onClose} disabled={isSaving}>Hủy</button>
            <button type="submit" className="sbj-btn-primary" disabled={!nameChanged || isSaving}>
              {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  )
}
