import { X } from 'lucide-react'
import type { FormEvent } from 'react'

type Props = {
  name: string
  formErrors: string[]
  isSaving: boolean
  onClose: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onNameChange: (name: string) => void
}

export function SubjectCreateDialog({
  name,
  formErrors,
  isSaving,
  onClose,
  onSubmit,
  onNameChange,
}: Props) {
  return (
    <div
      className="sbj-modal-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-add-subject-title"
    >
      <div className="sbj-modal">
        <div className="sbj-modal-head">
          <h2 id="modal-add-subject-title" className="sbj-modal-title">
            Thêm môn học
          </h2>
          <button type="button" className="sbj-modal-close-btn" onClick={onClose} aria-label="Đóng cửa sổ">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={onSubmit}>
          <div className="sbj-modal-body">
            <div className="sbj-form-field">
              <label htmlFor="new-subject-name" className="sbj-form-label">
                Tên môn học <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                id="new-subject-name"
                type="text"
                className="sbj-form-input"
                value={name}
                onChange={(event) => onNameChange(event.target.value)}
                placeholder="Ví dụ: Hóa học, Sinh học, Tin học..."
                autoFocus
              />
            </div>

            {formErrors.length > 0 && (
              <div className="sbj-form-errors" role="alert">
                <strong>Không thể thêm môn học:</strong>
                <ul>
                  {formErrors.map((error) => <li key={error}>{error}</li>)}
                </ul>
              </div>
            )}
          </div>

          <div className="sbj-modal-foot">
            <button type="button" className="sbj-btn-secondary" onClick={onClose}>
              Hủy
            </button>
            <button type="submit" className="sbj-btn-primary" disabled={isSaving}>
              {isSaving ? 'Đang lưu...' : 'Thêm môn học'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
