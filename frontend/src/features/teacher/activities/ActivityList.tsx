import { Link } from 'react-router'
import { getActivitySubmissionCount } from './activityRules'
import type { ActivityPreview } from './activityTypes'
import type { AssignedActivity } from '../demo/teacherInsightsDemo'
import type { ActivityFilterValues } from './ActivityFilters'

type Props = {
  activities: ActivityPreview[]
  detailBase: string
  filters: ActivityFilterValues
  assignedActivities: AssignedActivity[]
}

const labels: Record<ActivityPreview['type'], string> = {
  QUIZ: 'Quiz',
  WRITTEN: 'Tự luận',
  NOTEBOOK: 'Kiểm tra vở',
}

function matchesFilters(activity: ActivityPreview, filters: ActivityFilterValues) {
  const closeDate = activity.closesAt.slice(0, 10)
  return (
    (!filters.type || activity.type === filters.type) &&
    (!filters.status || activity.status === filters.status) &&
    (!filters.from || closeDate >= filters.from) &&
    (!filters.to || closeDate <= filters.to)
  )
}

export function ActivityList({ activities, detailBase, filters, assignedActivities }: Props) {
  const visibleActivities = activities.filter((activity) => matchesFilters(activity, filters))

  if (visibleActivities.length === 0) {
    return <p style={{ color: '#7a9182', fontSize: 13, margin: '16px 0 0' }}>Không có hoạt động nào phù hợp với bộ lọc hiện tại.</p>
  }

  return (
    <div className="ta-activity-list">
      {visibleActivities.map((activity) => {
        const submissionCount = getActivitySubmissionCount(activity.id, assignedActivities)
        return (
          <Link className="ta-activity-row" key={activity.id} to={detailBase + activity.id}>
            <div>
              <strong>{activity.title}</strong>
              <small>
                {labels[activity.type]} · Đóng: {new Date(activity.closesAt).toLocaleString('vi-VN')} ·{' '}
                {submissionCount > 0 ? `${submissionCount} bài nộp` : 'Chưa có bài nộp'}
              </small>
            </div>
            <span className={`ta-status ${activity.status === 'CLOSED' ? 'closed' : ''}`}>
              {activity.status === 'CLOSED' ? 'Đã đóng' : 'Đang mở'}
              {activity.id.startsWith('preview-') && ' · mô phỏng'}
            </span>
            <span>Xem bài nộp & kết quả</span>
          </Link>
        )
      })}
    </div>
  )
}
