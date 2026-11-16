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
      <div className="panel tc-empty" style={{ padding: '40px 20px' }}>
        <Users size={28} />
        <h3>Không tìm thấy học sinh</h3>
        <p>Không có học sinh nào phù hợp với từ khóa tìm kiếm.</p>
      </div>
    )
  }

  return (
    <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
      <div className="ti-table-wrap">
        <table className="ti-table">
          <thead>
            <tr>
              <th>Học sinh</th>
              <th>Lớp</th>
              <th>Môn học phụ trách</th>
              <th>Số chủ đề hỏi AI</th>
              <th>Ghi nhận gần nhất</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => {
              const stats = topicStats.get(student.studentId)
              const hasTopics = Boolean(stats && stats.count > 0)
              return (
                <tr key={`${student.subjectId}-${student.studentId}`}>
                  <td><strong>{student.studentName}</strong></td>
                  <td><span className="ai-badge-class">{student.classroomName}</span></td>
                  <td>{student.subjectName}</td>
                  <td>{hasTopics ? <span className="ai-chip-topics">{stats?.count} chủ đề</span> : <span className="ai-chip-none">0 chủ đề</span>}</td>
                  <td><span style={{ fontSize: 12, color: '#688271' }}>{stats ? stats.latestDate : 'Chưa có'}</span></td>
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
