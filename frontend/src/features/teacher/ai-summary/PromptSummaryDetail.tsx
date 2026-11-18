import { ArrowLeft, BookOpen, MessageSquareOff, Sparkles } from 'lucide-react'
import { Link } from 'react-router'
import { InfoNotice } from '../insights/TeacherUI'
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
        <span className="eyebrow"><span className="eyebrow-line" /> TỔNG HỢP TRỢ LÝ HỌC TẬP</span>
        <h1>Chủ đề học sinh đã hỏi: {student.studentName}</h1>
        <p>Lớp {student.classroomName} · Môn {student.subjectName} · Năm học {academicYear}</p>
      </div>
      <InfoNotice>
        Chỉ thống kê chủ đề học tập được gán cho môn bạn đang phụ trách. Hệ thống không hiển thị nguyên văn hội thoại, suy đoán tâm lý hay nhận xét năng lực.
      </InfoNotice>
      <section className="panel" style={{ marginTop: 20 }}>
        <div className="tc-section-title"><Sparkles size={18} /><h2>Danh sách chủ đề đã hỏi ({topics.length})</h2></div>
        {topics.length === 0 ? (
          <div className="panel tc-empty" style={{ padding: '36px 20px' }}>
            <MessageSquareOff size={28} />
            <h3>Chưa ghi nhận chủ đề nào</h3>
            <p>Học sinh chưa có chủ đề được tổng hợp cho môn {student.subjectName}.</p>
          </div>
        ) : (
          <div className="ai-topic-list">
            {topics.map((topic) => (
              <div key={topic.id} className="ai-topic-card">
                <div className="ai-topic-header"><span className="ai-topic-badge">Chủ đề kiến thức</span><span className="ai-topic-date">Kỳ tổng hợp: {topic.periodStart} – {topic.periodEnd}</span></div>
                <h3 className="ai-topic-title">{topic.label}</h3>
                <div className="ai-topic-footer"><BookOpen size={14} /><span>{topic.count} lượt hỏi · Môn {student.subjectName} · Lớp {student.classroomName}</span></div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
