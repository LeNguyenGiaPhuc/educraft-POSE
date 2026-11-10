import { useState } from 'react'
import { BookOpen, ClipboardCheck, FilePenLine, Plus } from 'lucide-react'
import { useSearchParams } from 'react-router'
import { assignedSubjects } from '../fixtures'
import { sampleActivities } from './activities.mock'
import { ExerciseActivityPage } from './ExerciseActivityPage'
import { NotebookActivityPage } from './NotebookActivityPage'
import './activities.css'

type View = 'list' | 'quiz' | 'written' | 'notebook'

export function ActivitiesPage() {
  const [params] = useSearchParams()
  const requested = params.get('classroomSubjectId')
  const [subjectId, setSubjectId] = useState(assignedSubjects.some((item) => item.id === requested) ? requested! : assignedSubjects[0]?.id ?? '')
  const [view, setView] = useState<View>('list')
  const [notice, setNotice] = useState('')
  const visible = sampleActivities.filter((item) => item.classroomSubjectId === subjectId)
  const typeLabels = { QUIZ: 'Quiz', WRITTEN: 'Tự luận ngắn', NOTEBOOK: 'Kiểm tra vở' }

  return <div className="page-content ta-page"><div className="page-heading"><h1>Hoạt động học tập</h1><p>Tạo hoạt động trong môn được phân công. Giáo viên duyệt nội dung trước khi công bố.</p></div><div className="sample-strip"><ClipboardCheck size={16} /> Bản xem trước giao diện · chưa tạo, đóng hoặc mở lại hoạt động thật.</div><div className="ta-top"><label htmlFor="ta-subject">Môn của lớp</label><select id="ta-subject" value={subjectId} onChange={(event) => { setSubjectId(event.target.value); setView('list'); setNotice('') }}>{assignedSubjects.map((item) => <option value={item.id} key={item.id}>{item.name} · {item.id.endsWith('11a1') ? '11A1' : '11A2'}</option>)}</select></div>
    {view === 'list' ? <><div className="ta-create-grid"><button type="button" onClick={() => setView('quiz')}><BookOpen size={22} /><strong>Tạo quiz</strong><span>Câu hỏi trắc nghiệm từ bài học đã công bố.</span><Plus size={17} /></button><button type="button" onClick={() => setView('written')}><FilePenLine size={22} /><strong>Tạo bài tự luận</strong><span>Câu trả lời ngắn và tiêu chí chấm rõ ràng.</span><Plus size={17} /></button><button type="button" onClick={() => setView('notebook')}><ClipboardCheck size={22} /><strong>Kiểm tra vở</strong><span>Ảnh mẫu và tiêu chí nội dung do giáo viên chốt.</span><Plus size={17} /></button></div><section className="panel ta-existing"><h2>Hoạt động của môn này</h2>{visible.length === 0 ? <p>Chưa có hoạt động nào trong dữ liệu mẫu.</p> : <div className="ta-activity-list">{visible.map((item) => <div className="ta-activity-row" key={item.id}><span className="ta-list-icon"><ClipboardCheck size={18} /></span><div><strong>{item.title}</strong><small>{typeLabels[item.type]} · Đóng nhận bài {item.closesAt}</small></div><span className={`ta-status ${item.status.toLowerCase()}`}>{item.status === 'PUBLISHED' ? 'Đang mở' : 'Đã đóng'}</span><button type="button" onClick={() => setNotice(`Đây là bản xem trước: chưa ${item.status === 'PUBLISHED' ? 'đóng' : 'mở lại'} hoạt động “${item.title}”.`)}>{item.status === 'PUBLISHED' ? 'Đóng' : 'Mở lại'}</button></div>)}</div>}{notice && <p className="ta-notice" role="status">{notice}</p>}</section></> : view === 'notebook' ? <NotebookActivityPage classroomSubjectId={subjectId} onBack={() => setView('list')} /> : <ExerciseActivityPage key={view} classroomSubjectId={subjectId} type={view === 'quiz' ? 'QUIZ' : 'WRITTEN'} onBack={() => setView('list')} />}
  </div>
}
