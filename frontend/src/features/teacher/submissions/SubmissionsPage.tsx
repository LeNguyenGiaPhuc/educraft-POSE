import { useState } from 'react'
import { assignedActivities, assignedSubjects, criterionLabels, notebookCriteria, studentsByClass, type Criterion } from '../insights/fixtures'
import { EmptyState, PreviewNotice, SubjectPicker, TeacherHeading } from '../insights/TeacherUI'
import { exerciseResults, notebookRecords, type CriterionDraft } from './submissions.mock'

function draftFor(studentId: string): CriterionDraft[] {
  const record = notebookRecords.find((item) => item.studentId === studentId)
  return notebookCriteria.map((criterion) => ({ id: criterion.id, content: criterion.content, status: record?.aiStatus === 'READY' ? criterion.suggested : 'UNDETERMINED', note: record?.aiStatus === 'READY' ? criterion.note : '' }))
}

const statusLabels = { LOCKED: 'Đã khóa để chấm', MISSING: 'Chưa nộp', GRADED: 'Đã chấm', PROCESSING: 'Đang chấm', FAILED: 'Chấm thất bại' } as const

export function SubmissionsPage({ classroomSubjectId, selectedActivityId }: { classroomSubjectId?: string; selectedActivityId?: string } = {}) {
  const [subjectId, setSubjectId] = useState(classroomSubjectId ?? 'history-11a2')
  const subject = assignedSubjects.find((item) => item.id === subjectId)!
  const activities = assignedActivities.filter((item) => item.subjectId === subjectId)
  const [activityId, setActivityId] = useState(selectedActivityId ?? 'notebook-11a2')
  const currentActivityId = activities.some((item) => item.id === activityId) ? activityId : activities[0]?.id
  const activity = activities.find((item) => item.id === currentActivityId)
  const students = studentsByClass[subject.classroom]
  const [studentId, setStudentId] = useState('phuc')
  const currentStudentId = students.some((item) => item.id === studentId) ? studentId : students[0]?.id
  const student = students.find((item) => item.id === currentStudentId)
  const record = notebookRecords.find((item) => item.studentId === currentStudentId)
  const result = exerciseResults[currentActivityId]?.find((item) => item.studentId === currentStudentId)
  const [draft, setDraft] = useState<CriterionDraft[]>(() => draftFor('phuc'))
  const [teacherComment, setTeacherComment] = useState('')
  const [preview, setPreview] = useState(false)

  function resetReview(nextStudentId: string) {
    setDraft(draftFor(nextStudentId))
    setTeacherComment('')
    setPreview(false)
  }

  function updateCriterion(id: string, patch: Partial<CriterionDraft>) {
    setDraft((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item))
    setPreview(false)
  }

  const isNotebook = activity?.kind === 'NOTEBOOK'
  const studentStatus = isNotebook ? record?.status ?? 'MISSING' : result?.status ?? 'MISSING'
  const submittedCount = isNotebook ? notebookRecords.filter((item) => item.status === 'LOCKED').length : (exerciseResults[currentActivityId] ?? []).filter((item) => item.status !== 'MISSING').length

  return <div className="page-content"><TeacherHeading title="Bài nộp & kết quả" description="Theo dõi học sinh đã nộp bài và xem kết quả trong môn mình phụ trách." /><PreviewNotice>Đây là bài nộp mẫu. Các chỉnh sửa tiêu chí chỉ nằm trên màn hình; bấm xem trước không chốt hoặc ghi kết quả.</PreviewNotice>{!selectedActivityId && <div className="ti-heading"><SubjectPicker value={subjectId} onChange={(id) => { const nextSubject = assignedSubjects.find((item) => item.id === id)!; const firstStudent = studentsByClass[nextSubject.classroom][0].id; setSubjectId(id); setActivityId(''); setStudentId(firstStudent); resetReview(firstStudent) }} /><label className="ti-picker">Hoạt động<select value={currentActivityId} onChange={(event) => { setActivityId(event.target.value); resetReview(currentStudentId) }}>{activities.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label></div>}<div className="ti-stats"><div className="ti-stat"><strong>{students.length}</strong><span>Học sinh trong {subject.classroom}</span></div><div className="ti-stat"><strong>{submittedCount}</strong><span>Đã nộp bài</span></div><div className="ti-stat"><strong>{students.length - submittedCount}</strong><span>Chưa nộp bài</span></div></div><div className="ti-grid"><section className="ti-card"><h2>Danh sách học sinh · {activity?.title}</h2>{students.map((item) => { const itemStatus = isNotebook ? notebookRecords.find((entry) => entry.studentId === item.id)?.status ?? 'MISSING' : exerciseResults[currentActivityId]?.find((entry) => entry.studentId === item.id)?.status ?? 'MISSING'; return <button type="button" className={`ti-list-button ${item.id === currentStudentId ? 'active' : ''}`} key={item.id} onClick={() => { setStudentId(item.id); resetReview(item.id) }}><strong>{item.name}</strong><small>{statusLabels[itemStatus]}</small></button> })}</section><section className="ti-card"><h2>{student?.name}</h2><div className="ti-detail-list"><div><strong>Hoạt động</strong>{activity?.title}</div><div><strong>Trạng thái</strong><span className={`ti-chip ${studentStatus === 'MISSING' ? 'warn' : ''}`}>{statusLabels[studentStatus]}</span></div>{isNotebook && record?.submittedAt && <div><strong>Nộp lúc</strong>{record.submittedAt}</div>}</div>{studentStatus === 'MISSING' && <div className="ti-margin-top"><EmptyState title="Chưa có bài nộp" detail="Học sinh chưa nộp hoạt động này. Không có kết quả để giáo viên xem." /></div>}{!isNotebook && studentStatus !== 'MISSING' && <div className="ti-evidence"><strong>{result?.status === 'GRADED' ? `Kết quả đã chấm: ${result.score}/10` : result?.status === 'FAILED' ? 'Chấm thất bại · chưa có điểm' : 'Bài đang được chấm'}</strong><p>Câu trả lời đã lưu trong dữ liệu mẫu: {result?.answer ?? 'Chưa có bản trả lời minh họa.'}</p>{result?.status === 'FAILED' && <p role="alert">Bài làm được giữ nguyên để chấm lại. Không quy đổi lỗi thành điểm 0.</p>}<p>Quiz và tự luận đã chấm thành công hiển thị kết quả cho học sinh; giáo viên không cần chốt lại như kiểm tra vở.</p></div>}</section></div>
    {isNotebook && record?.status === 'LOCKED' && <div className="ti-review-grid ti-margin-top"><section className="ti-card"><h2>Ảnh bài nộp và căn cứ</h2><div className="ti-image-placeholder">Ảnh vở của {student?.name}<br />Bản xem trước không chứa ảnh học sinh thật</div>{record.aiStatus === 'READY' ? <div className="ti-evidence"><strong>Phân tích AI tạm · chỉ giáo viên thấy</strong><p>OCR trích đoạn: “{record.ocrExcerpt}”</p><p>Gợi ý AI ở bên phải có thể được giáo viên sửa trước khi chốt.</p></div> : <div className="ti-evidence"><strong>AI xử lý thất bại</strong><p>Giáo viên xem ảnh gốc và tự đánh giá từng tiêu chí. Hệ thống không tự đặt kết quả thay AI.</p></div>}{record.finalizedHistory.length > 0 && <><hr className="ti-separator" /><h3>Lịch sử đã chốt trước đó</h3>{record.finalizedHistory.map((history) => <div className="ti-row" key={history.date}><div><strong>{history.date} · {history.evaluator}</strong><small>{history.summary}</small></div><span className="ti-chip neutral">Giữ nguyên</span></div>)}</>}</section><section className="ti-card"><h2>Đánh giá theo tiêu chí</h2><p className="ti-muted">Giáo viên có thể đổi gợi ý AI hoặc tự chọn khi AI lỗi. Không có điểm tổng hay đạt/không đạt.</p><div className="ti-stack ti-margin-top">{draft.map((item, index) => <div className="ti-card" key={item.id}><h3>Tiêu chí {index + 1}: {item.content}</h3><label className="ti-field">Kết quả<select value={item.status} onChange={(event) => updateCriterion(item.id, { status: event.target.value as Criterion['suggested'] })}>{Object.entries(criterionLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><label className="ti-field ti-margin-top">Ghi chú (không bắt buộc)<textarea value={item.note} onChange={(event) => updateCriterion(item.id, { note: event.target.value })} /></label></div>)}</div><label className="ti-field ti-margin-top">Nhận xét giáo viên (không bắt buộc)<textarea value={teacherComment} onChange={(event) => { setTeacherComment(event.target.value); setPreview(false) }} /></label><div className="ti-actions ti-margin-top"><button type="button" className="ti-button primary" onClick={() => setPreview(true)}>Xem trước kết quả</button><button type="button" className="ti-button" disabled title="Chỉ chốt sau khi kết nối API">Chốt kết quả · chưa kết nối</button></div>{preview && <div className="ti-evidence" role="status"><strong>Xem trước chốt kết quả · giáo viên đánh giá: Cô Nguyễn Minh Anh</strong>{draft.map((item) => <div key={item.id}>{item.content}: {criterionLabels[item.status]}</div>)}<p>Nhận xét: {teacherComment || 'Không có'}</p><p>Kết quả này chưa được lưu và học sinh chưa nhìn thấy.</p></div>}</section></div>}
  </div>
}
