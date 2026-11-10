import { useState } from 'react'
import { assignedSubjects, promptTopics, studentsByClass } from '../insights/fixtures'
import { EmptyState, PreviewNotice, SubjectPicker, TeacherHeading } from '../insights/TeacherUI'

export function PromptSummaryPage() {
  const [subjectId, setSubjectId] = useState('history-11a2')
  const subject = assignedSubjects.find((item) => item.id === subjectId)!
  const students = studentsByClass[subject.classroom]
  const [studentId, setStudentId] = useState('phuc')
  const currentStudentId = students.some((item) => item.id === studentId) ? studentId : students[0]?.id
  const selectedStudent = students.find((item) => item.id === currentStudentId)
  const topics = promptTopics.filter((item) => item.subjectId === subjectId && item.studentId === currentStudentId)

  return <div className="page-content"><TeacherHeading title="Chủ đề học sinh đã hỏi AI" description="Xem chủ đề các câu hỏi liên quan đến môn mình dạy để biết học sinh đang thắc mắc ở đâu." /><PreviewNotice>Giáo viên chỉ xem chủ đề đã được gán rõ cho môn học. Nội dung tin nhắn riêng tư và câu hỏi không xác định được môn không hiển thị.</PreviewNotice><div className="ti-heading"><SubjectPicker value={subjectId} onChange={setSubjectId} /><label className="ti-picker">Học sinh trong {subject.classroom}<select value={currentStudentId} onChange={(event) => setStudentId(event.target.value)}>{students.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}</select></label></div><section className="ti-card"><h2>Chủ đề của {selectedStudent?.name} · {subject.subject}</h2>{topics.length ? <div className="ti-detail-list">{topics.map((item) => <div className="ti-row" key={item.id}><div><strong>{item.topic}</strong><small>Ghi nhận {item.askedAt}</small></div><span className="ti-chip">Thuộc môn {subject.subject}</span></div>)}</div> : <EmptyState title="Chưa có chủ đề được ghi nhận" detail="Học sinh có thể chưa hỏi về môn này, hoặc hệ thống chưa xác định rõ môn cho câu hỏi." />}</section><p className="ti-muted ti-margin-top">Danh sách này phục vụ giáo viên tự xem và hỗ trợ học sinh; hệ thống không tự đưa ra nhận định về học sinh.</p></div>
}
