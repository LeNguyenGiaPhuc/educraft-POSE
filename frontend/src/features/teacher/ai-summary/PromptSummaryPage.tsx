import { useParams, useSearchParams, Link } from 'react-router'
import { getTeacherSubjectContext, teacherSubjectPath } from '../fixtures'
import { promptTopics } from '../insights/fixtures'
import { EmptyState, PreviewNotice } from '../insights/TeacherUI'
import { TeacherBackButton } from '../components/TeacherBackButton'

export function StudentPromptTopics({ subjectId, studentId }: { subjectId: string; studentId: string }) {
  const context = getTeacherSubjectContext(subjectId)
  const allowed = context?.classroom.students.some(student => student.id === studentId)
  const topics = allowed ? promptTopics.filter(item => item.subjectId === subjectId && item.studentId === studentId) : []
  return <section className="ti-card"><h2>Chủ đề đã hỏi AI trong môn</h2><p className="ti-muted">Danh sách dành cho giáo viên; chỉ chủ đề gán rõ môn học, không hiển thị nguyên văn chat.</p>{topics.length ? <ul className="tw-topics">{topics.map(item => <li key={item.id}><strong>{item.topic}</strong><small>Ghi nhận {item.askedAt}</small></li>)}</ul> : <EmptyState title="Chưa có chủ đề được ghi nhận" detail="Học sinh chưa có chủ đề được gán rõ cho môn này trong dữ liệu mẫu." />}</section>
}

export function PromptSummaryPage() {
  const route = useParams()
  const [params] = useSearchParams()
  const context = getTeacherSubjectContext(route.classroomSubjectId ?? params.get('classroomSubjectId') ?? undefined, route.classroomId)
  return <div className="page-content"><TeacherBackButton /><h1>Chủ đề học sinh đã hỏi AI</h1><PreviewNotice />{context ? <ul>{context.classroom.students.map(student => <li key={student.id}><Link to={teacherSubjectPath(context.subject.id).split('?')[0] + '/students/' + student.id}>{student.name} · Xem chủ đề</Link></li>)}</ul> : <EmptyState title="Chọn lớp và môn trước" detail="Mở Lớp của tôi để xem chủ đề đúng phạm vi được phân công." />}</div>
}
