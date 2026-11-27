import { ArrowLeft, BookOpen, Sparkles } from 'lucide-react'
import { Link } from 'react-router'
import type { PromptSummaryStudent, PromptSummaryTopic } from './promptSummaryTypes'

type Props = {
  student: PromptSummaryStudent
  topics: PromptSummaryTopic[]
  academicYear: string
  backSearch: string
}

export function PromptSummaryDetail({ student, topics, academicYear, backSearch }: Props) {
  return (
    <div className="page-content tc-page">
      <div className="tc-breadcrumb">
        <Link to={`/teacher/ai-summary${backSearch}`} className="tc-back-link">
          <ArrowLeft size={16} /> Quay lại danh sách học sinh hỏi AI
        </Link>
      </div>
      <div className="page-heading">
        <h1>Chủ đề học sinh đã hỏi: {student.studentName}</h1>
        <p>Lớp {student.classroomName} · Môn {student.subjectName} · Năm học {academicYear}</p>
      </div>
      <section className="panel ai-topic-section">
        <div className="tc-section-title"><Sparkles size={18} /><h2>Danh sách chủ đề đã hỏi ({topics.length})</h2></div>
        {topics.length === 0 ? (
          <div className="tc-empty ai-topic-empty">
            <h3>Chưa ghi nhận chủ đề nào</h3>
          </div>
        ) : (
          <div className="ai-topic-list">
            {topics.map((topic) => (
              <div key={topic.id} className="ai-topic-card">
                <div className="ai-topic-header"><span className="ai-topic-badge">Chủ đề kiến thức</span><span className="ai-topic-date">Kỳ tổng hợp: {topic.periodStart} – {topic.periodEnd}</span></div>
                <h3 className="ai-topic-title">{topic.label}</h3>
                <div className="ai-topic-footer"><BookOpen size={14} /><span>{topic.count} lượt xuất hiện trong {topic.promptCount} lượt trao đổi · Tổng hợp {new Date(topic.generatedAt).toLocaleDateString('vi-VN')}</span></div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
