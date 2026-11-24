import { useState, type FormEvent } from 'react'
import { KeyRound, X } from 'lucide-react'
import type { AdminAccount } from '../../../lib/api/admin'
import { ApiError } from '../../../lib/api/client'
import { validatePasswordReset } from './accountRules'

type Props = {
  account: AdminAccount
  isSaving: boolean
  onClose: () => void
  onSave: (password: string) => Promise<void>
}

export function PasswordResetDialog({ account, isSaving, onClose, onSave }: Props) {
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [errors, setErrors] = useState<string[]>([])

  function closeDialog() {
    if (isSaving) return
    setPassword('')
    setConfirmation('')
    setErrors([])
    onClose()
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const validationErrors = validatePasswordReset(password, confirmation)
    if (validationErrors.length > 0) {
      setErrors(validationErrors)
      return
    }

    setErrors([])
    try {
      await onSave(password)
      setPassword('')
      setConfirmation('')
    } catch (error) {
      setErrors([error instanceof ApiError ? error.message : 'Không thể đặt lại mật khẩu. Hãy thử lại.'])
    }
  }

  function updatePassword(value: string) {
    setPassword(value)
    setErrors([])
  }

  function updateConfirmation(value: string) {
    setConfirmation(value)
    setErrors([])
  }

  return (
    <dialog
      open
      className="adm-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="password-reset-title"
      onCancel={(event) => {
        event.preventDefault()
        closeDialog()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) closeDialog()
      }}
    >
      <div className="adm-modal-window">
        <div className="adm-modal-head">
          <div>
            <span className="adm-modal-eyebrow">QUẢN TRỊ TÀI KHOẢN</span>
            <h3 id="password-reset-title" className="adm-modal-title">Đặt lại mật khẩu</h3>
          </div>
          <button type="button" className="adm-modal-close" onClick={closeDialog} disabled={isSaving} aria-label="Đóng">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="adm-modal-body">
            <p className="adm-inline-note" style={{ marginTop: 0 }}>
              Tạo mật khẩu mới cho <strong>{account.fullName}</strong> (@{account.username}). Mật khẩu chỉ được gửi tới backend và không hiển thị lại sau khi lưu. Backend sẽ thu hồi các phiên đăng nhập cũ sau khi đặt lại thành công.
            </p>
            <div className="adm-form-grid">
              <label>
                Mật khẩu mới
                <input
                  type="password"
                  autoFocus
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => updatePassword(event.target.value)}
                />
              </label>
              <label>
                Nhập lại mật khẩu
                <input
                  type="password"
                  autoComplete="new-password"
                  value={confirmation}
                  onChange={(event) => updateConfirmation(event.target.value)}
                />
              </label>
            </div>
            <p className="adm-inline-note">Mật khẩu phải dài từ 8 đến 128 ký tự.</p>
            {errors.length > 0 && (
              <div className="adm-errors" role="alert">
                <strong>Không thể đặt lại mật khẩu:</strong>
                <ul>{errors.map((error) => <li key={error}>{error}</li>)}</ul>
              </div>
            )}
          </div>
          <div className="adm-modal-foot">
            <button type="button" className="adm-secondary" onClick={closeDialog} disabled={isSaving}>Hủy bỏ</button>
            <button type="submit" className="adm-primary" disabled={isSaving}>
              <KeyRound size={16} /> {isSaving ? 'Đang lưu...' : 'Lưu mật khẩu mới'}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  )
}
