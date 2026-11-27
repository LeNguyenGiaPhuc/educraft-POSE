import { ArrowRight, Users } from 'lucide-react'
import { Link } from 'react-router'
import type { PromptSummaryStats, PromptSummaryStudent } from './promptSummaryTypes'

type Props = {
  students: PromptSummaryStudent[]
  topicStats: Map<string, PromptSummaryStats>
  detailSearch: string
}

export function PromptSummaryList({ students, topicStats, detailSearch }: Props) {
  if (students.length === 0) {
    return (
      <div className="panel tc-empty ai-summary-empty">
        <Users size={28} />
        <h3>Không tìm thấy học sinh</h3>
        <p>Không có học sinh nào phù hợp với từ khóa tìm kiếm.</p>
      </div>
    )
  }

  return (
    <div className="panel ai-summary-table">
      <div className="ti-table-wrap">
        <table className="ti-table">
          <thead>
            <tr>
              <th>Học sinh</th>
              <th>Lớp</th>
              <th>Môn học phụ trách</th>
              <th>Mục chủ đề</th>
              <th>Lượt xuất hiện / trao đổi</th>
              <th>Kết thúc kỳ gần nhất</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => {
              const stats = topicStats.get(student.studentId)
              const hasTopics = Boolean(stats && stats.topicCount > 0)
              return (
                <tr key={`${student.subjectId}-${student.studentId}`}>
                  <td><strong>{student.studentName}</strong></td>
                  <td><span className="ai-badge-class">{student.classroomName}</span></td>
                  <td>{student.subjectName}</td>
                  <td>{hasTopics ? <span className="ai-chip-topics">{stats?.topicCount} mục</span> : <span className="ai-chip-none">0 mục</span>}</td>
                  <td>{stats ? `${stats.occurrenceCount} lượt · ${stats.promptCount} trao đổi` : '0 lượt · 0 trao đổi'}</td>
                  <td><span className="ai-period-end">{stats ? stats.latestPeriodEnd : 'Chưa có kỳ tổng hợp'}</span></td>
                  <td><Link to={`/teacher/ai-summary/${student.studentId}${detailSearch}`} className="ai-btn-view">Xem chủ đề <ArrowRight size={13} /></Link></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
