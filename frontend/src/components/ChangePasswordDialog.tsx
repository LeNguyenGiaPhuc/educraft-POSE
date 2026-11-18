import { useState, type FormEvent } from 'react'
import { KeyRound, X } from 'lucide-react'
import { ApiError } from '../lib/api/client'
import { authApi } from '../lib/api/auth'
import { getPasswordChangeErrors, type PasswordChangeErrors } from '../lib/auth/passwordRules'
import './ChangePasswordDialog.css'

type Props = {
  isOpen: boolean
  onClose: () => void
}

export function ChangePasswordDialog({ isOpen, onClose }: Props) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [errors, setErrors] = useState<PasswordChangeErrors>({})
  const [requestError, setRequestError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  function resetForm() {
    setCurrentPassword('')
    setNewPassword('')
    setConfirmation('')
    setErrors({})
    setRequestError('')
    setSuccessMessage('')
  }

  function closeDialog() {
    if (isSaving) return
    resetForm()
    onClose()
  }

  function clearMessages() {
    setErrors({})
    setRequestError('')
    setSuccessMessage('')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const validationErrors = getPasswordChangeErrors({ currentPassword, newPassword, confirmation })
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      setRequestError('')
      setSuccessMessage('')
      return
    }

    setErrors({})
    setRequestError('')
    setSuccessMessage('')
    setIsSaving(true)

    try {
      await authApi.changePassword(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmation('')
      setSuccessMessage('Đổi mật khẩu thành công. Các phiên đăng nhập khác đã được thu hồi.')
    } catch (error) {
      setRequestError(error instanceof ApiError ? error.message : 'Không thể đổi mật khẩu. Hãy thử lại.')
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <dialog
      open
      className="change-password-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="change-password-title"
      onCancel={(event) => {
        event.preventDefault()
        closeDialog()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) closeDialog()
      }}
    >
      <div className="change-password-window">
        <div className="change-password-head">
          <div>
            <span className="change-password-eyebrow">BẢO MẬT TÀI KHOẢN</span>
            <h2 id="change-password-title">Đổi mật khẩu</h2>
          </div>
          <button type="button" className="change-password-close" onClick={closeDialog} disabled={isSaving} aria-label="Đóng đổi mật khẩu">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="change-password-body">
            <p className="change-password-note">Mật khẩu mới chỉ được gửi tới backend và không hiển thị lại sau khi lưu.</p>
            <label>
              Mật khẩu hiện tại
              <input type="password" autoFocus autoComplete="current-password" value={currentPassword} onChange={(event) => { setCurrentPassword(event.target.value); clearMessages() }} />
              {errors.currentPassword && <span className="change-password-field-error">{errors.currentPassword}</span>}
            </label>
            <label>
              Mật khẩu mới
              <input type="password" autoComplete="new-password" value={newPassword} onChange={(event) => { setNewPassword(event.target.value); clearMessages() }} />
              <span className="change-password-help">Từ 6 đến 128 ký tự.</span>
              {errors.newPassword && <span className="change-password-field-error">{errors.newPassword}</span>}
            </label>
            <label>
              Nhập lại mật khẩu mới
              <input type="password" autoComplete="new-password" value={confirmation} onChange={(event) => { setConfirmation(event.target.value); clearMessages() }} />
              {errors.confirmation && <span className="change-password-field-error">{errors.confirmation}</span>}
            </label>
            {requestError && <p className="change-password-error" role="alert">{requestError}</p>}
            {successMessage && <p className="change-password-success" role="status">{successMessage}</p>}
          </div>
          <div className="change-password-foot">
            <button type="button" className="change-password-secondary" onClick={closeDialog} disabled={isSaving}>Hủy</button>
            <button type="submit" className="change-password-primary" disabled={isSaving}><KeyRound size={16} /> {isSaving ? 'Đang lưu...' : 'Lưu mật khẩu mới'}</button>
          </div>
        </form>
      </div>
    </dialog>
  )
}
