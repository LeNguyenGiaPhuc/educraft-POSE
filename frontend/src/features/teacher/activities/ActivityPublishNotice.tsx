import { Link } from 'react-router'
import type { ActivityPreview } from './activityTypes'

type Props = {
  activity: ActivityPreview
  classroomId: string
  classroomSubjectId: string
  onDismiss: () => void
}

export function ActivityPublishNotice({ activity, classroomId, classroomSubjectId, onDismiss }: Props) {
  return (
    <div className="ta-publish-prompt" role="status">
      <h3>Đã công bố mô phỏng: {activity.title}</h3>
      <p>Hoạt động đã được thêm vào danh sách hoạt động của phiên làm việc. Bạn có muốn thêm hoạt động này vào Lịch không?</p>
      <div className="ta-publish-prompt-actions">
        <Link
          to={`/teacher/calendar?create=1&classroomId=${classroomId}&classroomSubjectId=${classroomSubjectId}&activityId=${activity.id}&publication=preview`}
          className="ta-btn-calendar"
        >
          Thêm vào lịch giảng dạy
        </Link>
        <button type="button" className="ta-btn-dismiss" onClick={onDismiss}>
          Để sau / Đóng
        </button>
      </div>
    </div>
  )
}
