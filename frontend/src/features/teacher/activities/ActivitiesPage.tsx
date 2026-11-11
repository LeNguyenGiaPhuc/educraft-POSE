import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import { getTeacherSubjectContext, registerTeacherPreviewItem, sampleLessons, teacherSubjectPath } from '../fixtures'
import { notebookCriteria } from '../insights/fixtures'
import { SubmissionsPage } from '../submissions/SubmissionsPage'
import { sampleActivities, readActivityPreviews, activityPreviewStorageKey, type ActivityPreview, type ActivityPublicationDraft } from './activities.mock'
import { ExerciseActivityPage } from './ExerciseActivityPage'
import { NotebookActivityPage } from './NotebookActivityPage'
import './activities.css'

const labels = { QUIZ: 'Quiz', WRITTEN: 'Tự luận', NOTEBOOK: 'Kiểm tra vở' }
export function ActivitiesPage() {
  const route = useParams()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const location = useLocation()
  const subjectId = route.classroomSubjectId ?? params.get('classroomSubjectId') ?? 'history-11a2'
  const context = getTeacherSubjectContext(subjectId, route.classroomId)
  const [previews, setPreviews] = useState(readActivityPreviews)
  const [published, setPublished] = useState<ActivityPreview | null>(null)
  const [notice, setNotice] = useState('')
  if (!context) return <div className="page-content"><h1>Không tìm thấy môn được phân công</h1><Link to="/teacher/classes">Quay lại lớp của tôi</Link></div>
  const base = teacherSubjectPath(subjectId, 'activities')
  const detailBase = base.split('?')[0] + '/activities/'
  const back = params.get('returnTo')
  const stateReturn = (location.state as { returnTo?: unknown } | null)?.returnTo
  const basePath = base.split('?')[0]
  const scopedReturn = (value: unknown) => typeof value === 'string' && (value === basePath || value.startsWith(`${basePath}?`) || value.startsWith(`${basePath}/`) || value === '/teacher/calendar' || value.startsWith('/teacher/calendar?')) ? value : undefined
  const returnTo = scopedReturn(stateReturn) ?? scopedReturn(back) ?? (route.activityId ? base : '/teacher/classes')
  const returnLabel = returnTo.startsWith('/teacher/calendar') ? 'sự kiện lịch' : returnTo.includes('tab=statistics') ? 'thống kê' : 'lịch sử hoạt động'
  const activities = [...sampleActivities, ...previews].filter(item => item.classroomSubjectId === subjectId)
  const activity = activities.find(item => item.id === route.activityId)
  const kind = params.get('kind') === 'WRITTEN' ? 'WRITTEN' : params.get('kind') === 'NOTEBOOK' ? 'NOTEBOOK' : 'QUIZ'
  const listUrl = location.pathname + location.search
  function filter(key: string, value: string) { setParams(current => { const next = new URLSearchParams(current); if (value) next.set(key, value); else next.delete(key); return next }) }
  function publish(value: ActivityPublicationDraft) {
    const item: ActivityPreview = { ...value, id: `preview-${Date.now()}`, classroomSubjectId: subjectId, status: 'PUBLISHED' }
    const next = [...previews, item]
    setPreviews(next); sessionStorage.setItem(activityPreviewStorageKey, JSON.stringify(next)); registerTeacherPreviewItem('activity', item.id, subjectId); setPublished(item)
  }
  const active = published ?? activity
  const calendar = active ? '/teacher/calendar?' + new URLSearchParams({ create: '1', classroomId: context.classroom.id, classroomSubjectId: subjectId, activityId: active.id, publication: 'preview' }) : ''
  const publication = published && <section className="panel ta-preview-result" role="status"><h2>Công bố mô phỏng: {published.title}</h2><p>Hoạt động mẫu đã hiện trong lịch sử của phiên trình duyệt này, kể cả khi bỏ qua hoặc hủy lịch. Chưa lưu hoặc gửi thông báo thật.</p><p>Xem trước thông báo: Lớp {context.classroom.name} có hoạt động “{published.title}”. Nếu thêm lịch ngay, dùng một thông báo gộp dẫn tới lịch và hoạt động.</p><div className="ta-actions"><Link to={calendar}>Thêm lịch · xem trước</Link><Link to={returnTo} onClick={() => setPublished(null)}>Bỏ qua lịch, về lịch sử</Link></div></section>
  return <div className="page-content ta-page">{route.activityId && <Link className="ta-back" to={returnTo}>Quay lại {returnLabel}</Link>}<div className="page-heading"><h1>{route.activityId === 'new' ? 'Tạo hoạt động' : activity?.title ?? 'Lịch sử hoạt động'}</h1><p>{context.classroom.name} · {context.subject.name}</p></div><div className="sample-strip">Dữ liệu mẫu · chưa kết nối API, AI, công bố hoặc thông báo thật.</div>
    {route.activityId === 'new' ? <>{publication}{!published && (kind === 'NOTEBOOK' ? <NotebookActivityPage classroomSubjectId={subjectId} onBack={() => navigate(returnTo)} onPublish={publish} /> : <ExerciseActivityPage classroomSubjectId={subjectId} type={kind} onBack={() => navigate(returnTo)} onPublish={publish} />)}</> : route.activityId ? activity ? <><section className="panel ta-editor"><h2>Nội dung & thời hạn</h2><p>{labels[activity.type]} · {activity.status === 'CLOSED' ? 'Đã đóng nhận bài' : 'Đang mở'} · Đóng lúc {new Date(activity.closesAt).toLocaleString('vi-VN')}</p>{activity.id.startsWith('preview-') ? <ActivityPreviewContent activity={activity} lessonBase={base.split('?')[0] + '/lessons/'} /> : activity.type === 'NOTEBOOK' ? <><p>Ảnh vở mẫu minh họa · chưa chứa ảnh thật. Tiêu chí khóa sau bài nộp đầu tiên; mở nhận lại không ghi đè lịch sử đã chốt.</p><ul>{notebookCriteria.map(item => <li key={item.id}>{item.content}</li>)}</ul></> : <><p>{activity.type === 'QUIZ' ? 'Câu hỏi trắc nghiệm theo nội dung bài học; đáp án, giải thích và nguồn được duyệt trước khi công bố.' : 'Trình bày ý nghĩa lịch sử; chấm theo ý đúng và căn cứ học liệu đã công bố.'}</p><h3>Nguồn bài học</h3>{sampleLessons.filter(item => item.classroomSubjectId === subjectId && item.status === 'PUBLISHED' && item.id === (activity.id.includes('postwar') ? 'lesson-viet-nam-11a2' : subjectId === 'history-11a1' ? 'lesson-cmt8-11a1' : 'lesson-cmt8-11a2')).map(item => <p key={item.id}><Link to={base.split('?')[0] + '/lessons/' + item.id}>{item.title}</Link> · {item.materials.map(file => `${file.name}, phiên bản ${file.version}, ${file.sourcePosition}`).join('; ')}</p>)}</>}<button type="button" className="ta-secondary" onClick={() => setNotice('Đây là bản xem trước. Chưa thay đổi thời gian nhận bài; các bài nộp và lịch sử đã chốt được giữ nguyên.')}>{activity.status === 'CLOSED' ? 'Xem trước mở nhận lại' : 'Xem trước đóng nhận bài'}</button>{notice && <p role="status">{notice}</p>}</section>{activity.id.startsWith('preview-') ? <section className="panel ta-editor"><p>Hoạt động mới mô phỏng chưa có bài nộp.</p></section> : <SubmissionsPage key={activity.id} classroomSubjectId={subjectId} selectedActivityId={activity.id} />}</> : <section className="panel ta-editor"><h2>Không tìm thấy hoạt động trong môn này</h2><Link to={base}>Về lịch sử hoạt động</Link></section> : <><div className="ta-actions">{Object.entries(labels).map(([value, label]) => <Link className="ta-primary" key={value} onClick={() => setPublished(null)} to={detailBase + 'new?' + new URLSearchParams({ kind: value, returnTo: listUrl })}>Tạo {label}</Link>)}</div><section className="panel ta-editor"><div className="ta-history-filters"><label>Loại<select value={params.get('type') ?? ''} onChange={event => filter('type', event.target.value)}><option value="">Tất cả</option>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Trạng thái<select value={params.get('status') ?? ''} onChange={event => filter('status', event.target.value)}><option value="">Tất cả</option><option value="PUBLISHED">Đang mở</option><option value="CLOSED">Đã đóng</option></select></label><label>Đóng từ ngày<input type="date" value={params.get('from') ?? ''} onChange={event => filter('from', event.target.value)} /></label><label>Đến ngày<input type="date" value={params.get('to') ?? ''} onChange={event => filter('to', event.target.value)} /></label></div><div className="ta-activity-list">{activities.filter(item => (!params.get('type') || item.type === params.get('type')) && (!params.get('status') || item.status === params.get('status')) && (!params.get('from') || item.closesAt.slice(0,10) >= params.get('from')!) && (!params.get('to') || item.closesAt.slice(0,10) <= params.get('to')!)).map(item => <Link className="ta-activity-row" key={item.id} to={detailBase + item.id + '?' + new URLSearchParams({ returnTo: listUrl })}><div><strong>{item.title}</strong><small>{labels[item.type]} · {new Date(item.closesAt).toLocaleString('vi-VN')}</small></div><span>{item.status === 'CLOSED' ? 'Đã đóng' : 'Đang mở'}{item.id.startsWith('preview-') && ' · mô phỏng'}</span><span>Xem bài nộp & kết quả</span></Link>)}</div>{!activities.some(item => (!params.get('type') || item.type === params.get('type')) && (!params.get('status') || item.status === params.get('status')) && (!params.get('from') || item.closesAt.slice(0,10) >= params.get('from')!) && (!params.get('to') || item.closesAt.slice(0,10) <= params.get('to')!)) && <p>Không có hoạt động phù hợp. Hãy đổi bộ lọc hoặc tạo hoạt động.</p>}</section></>}
  </div>
}

function ActivityPreviewContent({ activity, lessonBase }: { activity: ActivityPreview; lessonBase: string }) {
  const content = activity.content
  if (!content) return <p>Hoạt động mô phỏng cũ chưa giữ nội dung. Hãy tạo lại để xem đúng bản đã duyệt.</p>
  if (content.kind === 'NOTEBOOK') return <>
    <h3>Nội dung kiểm tra vở</h3><p>{content.description}</p>
    <h3>Ảnh mẫu đã chọn</h3><p>Chỉ giữ tên và dung lượng trong phiên xem trước; ảnh chưa được tải lên.</p>
    <ul>{content.images.map((image, index) => <li key={index}>{image.name} · {(image.size / 1024 / 1024).toFixed(1)} MB</li>)}</ul>
    <h3>Tiêu chí giáo viên đã xác nhận</h3><ol>{content.criteria.map(item => <li key={item.id}>{item.content}</li>)}</ol>
  </>
  return <>
    <p>Bản câu hỏi giáo viên đã duyệt · {content.questions.length}/{content.requestedCount} câu minh họa · {content.difficulty === 'BASIC' ? 'Cơ bản' : content.difficulty === 'INTERMEDIATE' ? 'Trung bình' : 'Nâng cao'}</p>
    <h3>Nguồn bài học đã chọn</h3>{content.sourceLessons.map(lesson => <div key={lesson.id}><Link to={lessonBase + lesson.id}>{lesson.title}</Link><ul>{lesson.materials.map((file, index) => <li key={index}>{file.name} · phiên bản {file.version} · {file.sourcePosition}</li>)}</ul></div>)}
    {content.questions.map((question, index) => <article className="ta-question" key={question.id}>
      <h3>Câu {index + 1}: {question.prompt}</h3>
      {question.options && <ol type="A">{question.options.map((option, optionIndex) => <li key={optionIndex}>{option}</li>)}</ol>}
      <p><strong>Đáp án:</strong> {question.answer}</p>
      {question.markingCriteria && <p><strong>Tiêu chí chấm:</strong> {question.markingCriteria}</p>}
      <p><strong>Điểm tối đa:</strong> {question.maxPoints} · {question.lessonTag}</p>
      <p><strong>Giải thích:</strong> {question.explanation}</p><p><strong>Trích dẫn:</strong> {question.citation}</p>
    </article>)}
  </>
}
