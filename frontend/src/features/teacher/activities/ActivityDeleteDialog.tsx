import { AlertTriangle } from 'lucide-react'

type Props = {
  title: string
  onCancel: () => void
  onConfirm: () => void
}

export function ActivityDeleteDialog({ title, onCancel, onConfirm }: Props) {
  return (
    <div className="ta-confirm-backdrop" role="alertdialog" aria-modal="true" aria-labelledby="delete-activity-title">
      <div className="ta-confirm-box">
        <div className="ta-confirm-icon">
          <AlertTriangle size={24} />
        </div>
        <h3 id="delete-activity-title">Xác nhận xóa hoạt động?</h3>
        <p>
          Bạn có chắc chắn muốn xóa hoạt động <strong>“{title}”</strong>?
          <br />
          <small style={{ color: '#6b7280', display: 'block', marginTop: 8 }}>
            Hoạt động này hiện có 0 bài nộp. Thao tác xóa sẽ gỡ hoạt động, các sự kiện lịch liên kết và thông báo mô phỏng liên quan.
          </small>
        </p>
        <div className="ta-confirm-actions">
          <button type="button" className="ta-confirm-btn-stay" onClick={onCancel}>
            Hủy bỏ
          </button>
          <button type="button" className="ta-confirm-btn-exit" onClick={onConfirm}>
            Xác nhận xóa
          </button>
        </div>
      </div>
    </div>
  )
}
