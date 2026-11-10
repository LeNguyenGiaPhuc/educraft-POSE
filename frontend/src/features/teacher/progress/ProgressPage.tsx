import { useState } from 'react'
import { scorePoints, studentsByClass, type ScorePoint } from '../insights/fixtures'
import { assignedSubjects } from '../insights/fixtures'
import { EmptyState, PreviewNotice, SubjectPicker, TeacherHeading } from '../insights/TeacherUI'

type LessonIndicator = { lesson: string; difficult: boolean; latest: number; evidence: ScorePoint[] }

function lessonIndicators(points: ScorePoint[]): LessonIndicator[] {
  const byLesson = new Map<string, ScorePoint[]>()
  for (const point of [...points].sort((a, b) => a.submittedAt.localeCompare(b.submittedAt))) {
    byLesson.set(point.lesson, [...(byLesson.get(point.lesson) ?? []), point])
  }
  return [...byLesson].map(([lesson, evidence]) => {
    let difficult = false
    for (const point of evidence) {
      if (point.percent < 50) difficult = true
      else if (point.percent >= 70) difficult = false
    }
    return { lesson, difficult, latest: evidence.at(-1)!.percent, evidence }
  })
}

export function ProgressPage() {
  const [subjectId, setSubjectId] = useState('history-11a2')
  const subject = assignedSubjects.find((item) => item.id === subjectId)!
  const students = studentsByClass[subject.classroom]
  const [studentId, setStudentId] = useState('phuc')
  const currentStudentId = students.some((item) => item.id === studentId) ? studentId : students[0]?.id
  const selectedStudent = students.find((item) => item.id === currentStudentId)
  const points = (scorePoints[currentStudentId] ?? []).filter((point) => point.subjectId === subjectId)
  const indicators = lessonIndicators(points)
  const [selectedLesson, setSelectedLesson] = useState<string | null>(null)
  const evidence = indicators.find((item) => item.lesson === selectedLesson)

  return <div className="page-content"><TeacherHeading title="Tiến độ học sinh" description="Biểu đồ theo môn chỉ lấy kết quả Quiz và tự luận được giao đã chấm thành công. Kiểm tra vở và tự ôn không tính vào đây." /><PreviewNotice>Các điểm và dấu hiệu khó khăn là ví dụ. Khi nối API, backend sẽ cung cấp dữ liệu đã tính từ kết quả hợp lệ.</PreviewNotice><div className="ti-heading"><SubjectPicker value={subjectId} onChange={(id) => { setSubjectId(id); setSelectedLesson(null) }} /><label className="ti-picker">Học sinh trong {subject.classroom}<select value={currentStudentId} onChange={(event) => { setStudentId(event.target.value); setSelectedLesson(null) }}>{students.map((student) => <option value={student.id} key={student.id}>{student.name}</option>)}</select></label></div>{points.length ? <div className="ti-grid"><section className="ti-card"><h2>Điểm theo thời gian · {selectedStudent?.name}</h2><p className="ti-muted">Chỉ bài kiểm tra có điểm trong môn {subject.subject}.</p><div className="ti-chart" role="img" aria-label={`Điểm theo thời gian: ${points.map((item) => `${item.activity} ${item.percent}%`).join(', ')}`}>{points.map((item) => <div className="ti-bar-item" key={item.id}><span>{item.percent}%</span><div className={`ti-bar ${item.percent < 50 ? 'low' : ''}`} style={{ height: `${Math.max(item.percent, 4)}%` }} /><small>{item.submittedAt.slice(5)}</small></div>)}</div><div className="ti-detail-list ti-margin-top">{points.map((item) => <div key={item.id}><strong>{item.submittedAt} · {item.lesson}</strong>{item.activity} · {item.percent}%</div>)}</div></section><section className="ti-card"><h2>Theo từng bài học</h2>{indicators.map((item) => <div className="ti-row" key={item.lesson}><div><strong>{item.lesson}</strong><small>Lần gần nhất: {item.latest}% · {item.evidence.length} kết quả</small></div><div className="ti-actions"><span className={`ti-chip ${item.difficult ? 'warn' : ''}`}>{item.difficult ? 'Đang gặp khó' : 'Không đánh dấu khó'}</span><button type="button" className="ti-button" onClick={() => setSelectedLesson(item.lesson)}>Xem căn cứ</button></div></div>)}{evidence && <div className="ti-evidence"><strong>Căn cứ · {evidence.lesson}</strong><p>Điểm dưới 50% đánh dấu gặp khó; kết quả sau đạt từ 70% sẽ xóa dấu. Từ 50% đến dưới 70% giữ nguyên trạng thái.</p>{evidence.evidence.map((point) => <div key={point.id}>{point.submittedAt} · {point.activity}: {point.percent}%</div>)}</div>}</section></div> : <EmptyState title="Chưa có bài được chấm" detail="Tiến độ sẽ xuất hiện sau khi học sinh có kết quả Quiz hoặc tự luận được giao trong môn này." />}</div>
}
