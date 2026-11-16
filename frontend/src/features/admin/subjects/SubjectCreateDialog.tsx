import { Plus, School, X } from 'lucide-react'
import type { FormEvent } from 'react'

type Props = {
  name: string
  activeClassroomCount: number
  formErrors: string[]
  isSaving: boolean
  onClose: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onNameChange: (name: string) => void
}

export function SubjectCreateDialog({
  name,
  activeClassroomCount,
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
            <Plus size={20} color="#286449" /> Thêm môn học mới
          </h2>
          <button type="button" className="sbj-modal-close-btn" onClick={onClose} aria-label="Đóng cửa sổ">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={onSubmit}>
          <div className="sbj-modal-body">
            <p className="sbj-modal-intro">
              Khi thêm một môn mới, hệ thống sẽ tự động tạo môn cho mọi lớp <strong>đang hoạt động</strong> (trạng thái:{' '}
              <em>Chưa phân công giáo viên</em>). Các lớp đã lưu trữ giữ nguyên dữ liệu lịch sử.
            </p>

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

            <div className="sbj-scope-preview-box">
              <span className="sbj-scope-preview-label">
                Phạm vi áp dụng tự động ({activeClassroomCount} lớp đang học):
              </span>
              <div className="sbj-scope-classes-list">
                <span className="sbj-scope-class-chip">
                  <School size={12} /> Dữ liệu lớp đang hoạt động lấy từ backend
                </span>
              </div>
              <span className="sbj-scope-preview-note">
                * Môn học sẽ được mở với trạng thái Chưa phân công giáo viên. Admin có thể phân công giáo viên sau tại chi tiết từng lớp.
              </span>
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
              <Plus size={16} /> {isSaving ? 'Đang lưu...' : 'Xác nhận thêm môn'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
