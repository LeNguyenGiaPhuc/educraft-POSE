import { useEffect, useState, useCallback } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { ExerciseActivityPage } from './ExerciseActivityPage'
import { NotebookActivityPage } from './NotebookActivityPage'
import type { ActivityPublicationDraft } from './activities.mock'
import './activities.css'

export interface ActivityCreationDialogProps {
  isOpen: boolean
  kind: 'QUIZ' | 'WRITTEN' | 'NOTEBOOK'
  classroomSubjectId: string
  onClose: () => void
  onPublish: (draft: ActivityPublicationDraft) => void
}

const KIND_TITLES = {
  QUIZ: 'Tạo hoạt động: Quiz trắc nghiệm',
  WRITTEN: 'Tạo hoạt động: Tự luận ngắn',
  NOTEBOOK: 'Tạo hoạt động: Kiểm tra vở ghi',
} as const

export function ActivityCreationDialog({
  isOpen,
  kind,
  classroomSubjectId,
  onClose,
  onPublish,
}: ActivityCreationDialogProps) {
  const [showConfirmExit, setShowConfirmExit] = useState(false)
  const [hasEnteredData, setHasEnteredData] = useState(false)

  // Track any input inside dialog to consider form dirty
  const handleFormInteraction = useCallback(() => {
    if (!hasEnteredData) {
      setHasEnteredData(true)
    }
  }, [hasEnteredData])

  const requestClose = useCallback(() => {
    if (hasEnteredData) {
      setShowConfirmExit(true)
    } else {
      onClose()
    }
  }, [hasEnteredData, onClose])

  // Keyboard shortcut ESC and scroll lock
  useEffect(() => {
    if (!isOpen) return

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        requestClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = originalOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, requestClose])

  if (!isOpen) return null

  function handlePublished(draft: ActivityPublicationDraft) {
    setHasEnteredData(false)
    onPublish(draft)
  }

  return (
    <div
      className="ta-dialog-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="activity-dialog-title"
    >
      <div className="ta-dialog-window" onChangeCapture={handleFormInteraction}>
        {/* Dialog Header */}
        <div className="ta-dialog-header">
          <div>
            <span className="ta-dialog-eyebrow">POPUP TẠO HOẠT ĐỘNG TOÀN DIỆN</span>
            <h2 id="activity-dialog-title" className="ta-dialog-title">
              {KIND_TITLES[kind]}
            </h2>
          </div>
          <button
            type="button"
            className="ta-dialog-close-btn"
            onClick={requestClose}
            aria-label="Đóng biểu mẫu tạo hoạt động"
            title="Đóng (Escape)"
          >
            <X size={20} />
          </button>
        </div>

        {/* Dialog Scrollable Body */}
        <div className="ta-dialog-body">
          {kind === 'NOTEBOOK' ? (
            <NotebookActivityPage
              classroomSubjectId={classroomSubjectId}
              onBack={requestClose}
              onPublish={handlePublished}
            />
          ) : (
            <ExerciseActivityPage
              classroomSubjectId={classroomSubjectId}
              type={kind}
              onBack={requestClose}
              onPublish={handlePublished}
            />
          )}
        </div>
      </div>

      {/* Confirmation Modal when user exits with unsaved data */}
      {showConfirmExit && (
        <div
          className="ta-confirm-backdrop"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
        >
          <div className="ta-confirm-box">
            <div className="ta-confirm-icon">
              <AlertTriangle size={24} />
            </div>
            <h3 id="confirm-dialog-title">Rời khỏi biểu mẫu tạo hoạt động?</h3>
            <p>
              Bạn có thay đổi chưa lưu. Nếu thoát bây giờ, các nội dung bạn đã nhập sẽ bị mất và hệ thống không tạo bản nháp.
            </p>
            <div className="ta-confirm-actions">
              <button
                type="button"
                className="ta-confirm-btn-stay"
                onClick={() => setShowConfirmExit(false)}
              >
                Ở lại chỉnh sửa
              </button>
              <button
                type="button"
                className="ta-confirm-btn-exit"
                onClick={() => {
                  setShowConfirmExit(false)
                  setHasEnteredData(false)
                  onClose()
                }}
              >
                Thoát không lưu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
