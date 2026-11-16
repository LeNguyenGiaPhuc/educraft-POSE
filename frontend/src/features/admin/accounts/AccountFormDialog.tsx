import { Check, X } from 'lucide-react'
import type { FormEvent } from 'react'
import type { AdminAccount, AdminSubject } from '../../../lib/api/admin'
import type { AccountDraft } from './accountForm'

type ModalMode = 'create' | 'edit'

type Props = {
  mode: ModalMode
  accountName: string
  draft: AccountDraft
  password: string
  subjects: AdminSubject[]
  errors: string[]
  isSaving: boolean
  onClose: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onDraftChange: (draft: AccountDraft) => void
  onPasswordChange: (value: string) => void
  onClearErrors: () => void
}

type AccountRole = Exclude<AdminAccount['role'], 'ADMIN'>

export function AccountFormDialog({ mode, accountName, draft, password, subjects, errors, isSaving, onClose, onSubmit, onDraftChange, onPasswordChange, onClearErrors }: Props) {
  return (
    <div className="adm-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="account-modal-title" onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div className="adm-modal-window">
        <div className="adm-modal-head">
          <div><span className="adm-modal-eyebrow">POPUP QUẢN TRỊ TÀI KHOẢN</span><h3 id="account-modal-title" className="adm-modal-title">{mode === 'create' ? 'Tạo tài khoản mới' : `Chỉnh sửa tài khoản: ${accountName}`}</h3></div>
          <button type="button" className="adm-modal-close" onClick={onClose} aria-label="Đóng biểu mẫu tài khoản" title="Đóng (Escape)"><X size={18} /></button>
        </div>
        <form onSubmit={onSubmit} onChange={onClearErrors} noValidate>
          <div className="adm-modal-body">
            <div className="adm-form-grid">
              <label>Vai trò<select value={draft.role} disabled={mode === 'edit'} onChange={(event) => onDraftChange({ ...draft, role: event.target.value as AccountRole })}><option value="STUDENT">Học sinh</option><option value="TEACHER">Giáo viên</option></select></label>
              <label>Họ và tên<input required value={draft.fullName} onChange={(event) => onDraftChange({ ...draft, fullName: event.target.value })} placeholder="Ví dụ: Nguyễn Minh Anh" /></label>
              <label>Tên đăng nhập<input required value={draft.username} disabled={mode === 'edit'} onChange={(event) => onDraftChange({ ...draft, username: event.target.value })} placeholder="Ví dụ: nguyen.minh.anh" /></label>
              <label>Thông tin liên hệ<input value={draft.contact} onChange={(event) => onDraftChange({ ...draft, contact: event.target.value })} placeholder="Email hoặc số liên hệ" /></label>
              {mode === 'create' && <label>Mật khẩu khởi tạo<input type="password" autoComplete="new-password" value={password} onChange={(event) => onPasswordChange(event.target.value)} placeholder="Nhập mật khẩu cho tài khoản" /></label>}
              {draft.role === 'TEACHER' && <>
                <label>Bằng cấp<input value={draft.qualification} onChange={(event) => onDraftChange({ ...draft, qualification: event.target.value })} placeholder="Ví dụ: Cử nhân Sư phạm" /></label>
                <label>Môn học chuyên môn<select value={draft.specializedSubjectId} onChange={(event) => onDraftChange({ ...draft, specializedSubjectId: event.target.value })}><option value="">Chọn từ danh mục môn học</option>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label>
              </>}
            </div>
            {draft.role === 'STUDENT' && <p className="adm-inline-note" style={{ marginTop: 14 }}>Có thể tạo tài khoản trước. Admin sẽ thêm học sinh vào lớp trong mục Lớp học.</p>}
            {errors.length > 0 && <div className="adm-errors" role="alert" style={{ marginTop: 14 }}><strong>Hãy kiểm tra lại:</strong><ul>{errors.map((error) => <li key={error}>{error}</li>)}</ul></div>}
          </div>
          <div className="adm-modal-foot"><button type="button" className="adm-secondary" onClick={onClose}>Hủy bỏ</button><button type="submit" className="adm-primary" disabled={isSaving}><Check size={16} /> {isSaving ? 'Đang lưu...' : mode === 'create' ? 'Lưu tài khoản' : 'Lưu thay đổi'}</button></div>
        </form>
      </div>
    </div>
  )
}
