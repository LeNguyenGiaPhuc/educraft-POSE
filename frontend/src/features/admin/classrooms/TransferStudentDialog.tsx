import { useState, type FormEvent } from 'react'
import { ArrowRight, UserCheck, X } from 'lucide-react'
import type { AdminAccount, AdminClassroomSummary } from '../../../lib/api/admin'
import { ApiError } from '../../../lib/api/client'

type Props = {
  student: AdminAccount
  currentClassroomName: string
  classrooms: AdminClassroomSummary[]
  isLoading: boolean
  isSaving: boolean
  onClose: () => void
  onSave: (targetClassroomId: string) => Promise<void>
}

export function TransferStudentDialog({
  student,
  currentClassroomName,
  classrooms,
  isLoading,
  isSaving,
  onClose,
  onSave,
}: Props) {
  const [targetClassroomId, setTargetClassroomId] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!targetClassroomId) {
      setError('Vui lòng chọn lớp đích.')
      return
    }

    setError('')
    try {
      await onSave(targetClassroomId)
    } catch (saveError) {
      setError(saveError instanceof ApiError ? saveError.message : 'Không thể chuyển học sinh. Hãy thử lại.')
    }
  }

  return (
    <dialog
      open
      className="cls-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="transfer-student-title"
      onCancel={(event) => {
        event.preventDefault()
        if (!isSaving) onClose()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !isSaving) onClose()
      }}
    >
      <div className="cls-modal" style={{ maxWidth: '500px' }}>
        <div className="cls-modal-head">
          <h3 id="transfer-student-title">
            <UserCheck size={18} style={{ verticalAlign: 'middle', marginRight: 6 }} />
            Chuyển học sinh sang lớp khác
          </h3>
          <button type="button" className="cls-modal-close" onClick={onClose} disabled={isSaving} aria-label="Đóng">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="cls-modal-body">
            <p style={{ fontSize: '13px', color: '#334e40' }}>
              Chuyển <strong>{student.fullName}</strong> (@{student.username}) từ lớp <strong>{currentClassroomName}</strong>.
            </p>
            {isLoading ? (
              <p className="cls-inline-note">Đang tải các lớp đang hoạt động...</p>
            ) : classrooms.length === 0 ? (
              <p className="cls-inline-note">Không còn lớp đang hoạt động phù hợp để chuyển học sinh.</p>
            ) : (
              <div className="cls-field">
                <label htmlFor="transfer-target-classroom">Lớp đích *</label>
                <select
                  id="transfer-target-classroom"
                  value={targetClassroomId}
                  onChange={(event) => {
                    setTargetClassroomId(event.target.value)
                    setError('')
                  }}
                  disabled={isSaving}
                  required
                >
                  <option value="">-- Chọn lớp đích --</option>
                  {classrooms.map((classroom) => (
                    <option key={classroom.id} value={classroom.id}>
                      {classroom.name} · Khối {classroom.gradeLevel} · {classroom.academicYear}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {error && (
              <div className="cls-error-container" role="alert">
                <p style={{ margin: 0, fontSize: '12px', color: '#b72727' }}>{error}</p>
              </div>
            )}
          </div>
          <div className="cls-modal-foot">
            <button type="button" className="cls-btn-cancel" onClick={onClose} disabled={isSaving}>Hủy</button>
            {classrooms.length > 0 && !isLoading && (
              <button type="submit" className="cls-btn-submit" disabled={isSaving || !targetClassroomId}>
                <ArrowRight size={15} /> {isSaving ? 'Đang chuyển...' : 'Xác nhận chuyển lớp'}
              </button>
            )}
          </div>
        </form>
      </div>
    </dialog>
  )
}
