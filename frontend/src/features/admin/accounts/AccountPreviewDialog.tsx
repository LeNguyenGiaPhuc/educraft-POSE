import { Check, Eye, X } from 'lucide-react'
import type { AccountDraft } from './accountForm'

type Props = {
  draft: AccountDraft
  password: string
  subjectName?: string
  isSaving: boolean
  onBack: () => void
  onConfirm: () => void | Promise<void>
}

export function AccountPreviewDialog({ draft, subjectName, isSaving, onBack, onConfirm }: Props) {
  return (
    <div className="adm-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="account-preview-title">
      <div className="adm-modal-window">
        <div className="adm-modal-head">
          <div>
            <span className="adm-modal-eyebrow">KIỂM TRA TRƯỚC KHI LƯU</span>
            <h3 id="account-preview-title" className="adm-modal-title">Xác nhận tạo tài khoản</h3>
          </div>
          <button type="button" className="adm-modal-close" onClick={onBack} aria-label="Đóng preview"><X size={18} /></button>
        </div>

        <div className="adm-modal-body">
          <div className="adm-notice" style={{ margin: 0 }}>
            <Eye size={16} />
            <span>Kiểm tra thông tin bên dưới. Mật khẩu chỉ được gửi bảo mật đến backend và không hiển thị lại.</span>
          </div>
          <dl className="adm-facts" style={{ marginTop: 16 }}>
            <div><dt>Vai trò</dt><dd>{draft.role === 'TEACHER' ? 'Giáo viên' : 'Học sinh'}</dd></div>
            <div><dt>Họ và tên</dt><dd>{draft.fullName.trim()}</dd></div>
            <div><dt>Tên đăng nhập</dt><dd>{draft.username.trim()}</dd></div>
            <div><dt>Thông tin liên hệ</dt><dd>{draft.contact.trim()}</dd></div>
            <div><dt>Mật khẩu khởi tạo</dt><dd>Đã nhập</dd></div>
            {draft.role === 'TEACHER' && <>
              <div><dt>Bằng cấp</dt><dd>{draft.qualification.trim()}</dd></div>
              <div><dt>Môn chuyên môn</dt><dd>{subjectName ?? 'Chưa xác định'}</dd></div>
            </>}
          </dl>
        </div>

        <div className="adm-modal-foot">
          <button type="button" className="adm-secondary" onClick={onBack} disabled={isSaving}>Quay lại chỉnh sửa</button>
          <button type="button" className="adm-primary" onClick={() => void onConfirm()} disabled={isSaving}>
            <Check size={16} /> {isSaving ? 'Đang tạo...' : 'Xác nhận tạo tài khoản'}
          </button>
        </div>
      </div>
    </div>
  )
}
