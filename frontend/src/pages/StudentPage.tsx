import { useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import {
  ArrowLeft, ArrowRight, BookOpen, CalendarDays, Check, CheckCircle2, ChevronDown,
  CircleHelp, ClipboardCheck, ClipboardList, Clock3, FileText, GraduationCap,
  ImagePlus, LibraryBig, MessageCircle, RotateCcw, Send, Sparkles, Trash2,
} from 'lucide-react'
import { useStudentDemo, type ClassMode, type NotebookPhase, type NotebookSubmission } from '../context/StudentDemoContext'
import {
  activities, assignedResultHistory, calendarEvents, closedNotebookResult,
  currentSubjects, formerSubjects, notebookCriteria, type ActivityType,
} from '../data/studentPreview'
import './StudentPage.css'

type Screen = 'home' | 'subjects' | 'subject' | 'lesson' | 'activities' | 'activity' | 'practice' | 'practice-session' | 'results' | 'profile' | 'calendar' | 'assistant' | 'summary'

const activityTypeLabel: Record<ActivityType, string> = { quiz: 'Quiz', written: 'Tự luận', notebook: 'Kiểm tra vở' }
const subjectColor: Record<string, string> = { history: 'sage', biology: 'blue', literature: 'peach', physics: 'lavender', chemistry: 'peach', mathematics: 'blue', english: 'sage', informatics: 'lavender' }

const practiceQuestionBank: Record<string, { prompt: string; options: string[]; answer: number }[]> = {
  'Lịch sử': [
    { prompt: 'Công cuộc Đổi mới ở Việt Nam bắt đầu từ năm nào?', options: ['1975', '1986', '1995'], answer: 1 },
    { prompt: 'Một nội dung của đường lối Đổi mới là gì?', options: ['Phát triển nền kinh tế nhiều thành phần', 'Đóng cửa quan hệ đối ngoại', 'Dừng hoạt động sản xuất'], answer: 0 },
    { prompt: 'Đổi mới gắn với việc mở rộng hoạt động nào?', options: ['Cô lập kinh tế', 'Quan hệ đối ngoại', 'Chỉ sản xuất nông nghiệp'], answer: 1 },
  ],
  'Sinh học': [
    { prompt: 'Trong hệ tuần hoàn kín, máu lưu thông ở đâu?', options: ['Trong khoang cơ thể', 'Trong hệ thống mạch kín', 'Chỉ trong tim'], answer: 1 },
    { prompt: 'Hệ tuần hoàn giúp cơ thể thực hiện chức năng nào?', options: ['Vận chuyển các chất', 'Tạo ra ánh sáng', 'Làm xương dài ra'], answer: 0 },
    { prompt: 'Cơ quan nào đẩy máu lưu thông?', options: ['Phổi', 'Dạ dày', 'Tim'], answer: 2 },
  ],
  'Ngữ văn': [
    { prompt: 'Khi phân tích hình ảnh thơ, em nên làm gì?', options: ['Nêu tên hình ảnh rồi dừng lại', 'Liên hệ hình ảnh với cảm xúc và ý nghĩa', 'Chỉ đếm số từ'], answer: 1 },
    { prompt: 'Giọng điệu của bài thơ nên được nhận xét dựa vào đâu?', options: ['Cách dùng từ và nhịp điệu', 'Độ dài tên tác giả', 'Số trang sách'], answer: 0 },
    { prompt: 'Một nhận xét nghệ thuật tốt cần có gì?', options: ['Dẫn chứng cụ thể từ văn bản', 'Ý kiến không liên quan', 'Chỉ kể lại nội dung'], answer: 0 },
  ],
  'Hóa học': [
    { prompt: 'Cân bằng hóa học xuất hiện trong loại phản ứng nào?', options: ['Phản ứng một chiều', 'Phản ứng thuận nghịch', 'Phản ứng không có chất sản phẩm'], answer: 1 },
    { prompt: 'Ở trạng thái cân bằng, điều gì đúng?', options: ['Tốc độ thuận bằng tốc độ nghịch', 'Không có phản ứng nào xảy ra', 'Nồng độ mọi chất bằng nhau'], answer: 0 },
    { prompt: 'Cân bằng hóa học là trạng thái như thế nào?', options: ['Đứng yên hoàn toàn', 'Động', 'Chỉ có chất phản ứng'], answer: 1 },
  ],
  'Toán': [
    { prompt: 'Dãy số được xác định trên tập nào?', options: ['Tập số tự nhiên khác không', 'Tập hợp chữ cái', 'Các điểm trong mặt phẳng'], answer: 0 },
    { prompt: 'Giới hạn dãy số mô tả điều gì?', options: ['Tổng mọi số hạng', 'Xu hướng khi chỉ số tăng không giới hạn', 'Số lượng phần tử hữu hạn'], answer: 1 },
    { prompt: 'Số hạng của dãy số thường được ký hiệu như thế nào?', options: ['Theo chỉ số n', 'Chỉ bằng chữ cái x', 'Bằng một đoạn thẳng'], answer: 0 },
  ],
  'Tiếng Anh': [
    { prompt: 'Which action can reduce household waste?', options: ['Reuse containers', 'Throw away reusable items', 'Leave lights on'], answer: 0 },
    { prompt: 'Which resource can be conserved by turning off unused lights?', options: ['Energy', 'Soil', 'Wildlife'], answer: 0 },
    { prompt: 'What does “protect the environment” mean?', options: ['Care for nature and resources', 'Use more disposable items', 'Ignore pollution'], answer: 0 },
  ],
  'Tin học': [
    { prompt: 'Trong bảng dữ liệu, mỗi cột thường biểu diễn gì?', options: ['Một thuộc tính', 'Một trang tính', 'Một phép tính'], answer: 0 },
    { prompt: 'Mỗi hàng trong bảng thường chứa gì?', options: ['Thông tin của một đối tượng', 'Tên của mọi cột', 'Một định dạng chữ'], answer: 0 },
    { prompt: 'Bảng dữ liệu giúp ích gì?', options: ['Tổ chức dữ liệu theo hàng và cột', 'Tạo ảnh động', 'Mã hóa mọi tài liệu'], answer: 0 },
  ],
}

const quizQuestions = [
  { prompt: 'Công cuộc Đổi mới ở Việt Nam bắt đầu từ năm nào?', options: ['1975', '1986', '1995'], answer: 1, explanation: 'Đại hội đại biểu toàn quốc lần thứ VI năm 1986 đề ra đường lối Đổi mới.', source: 'Lịch sử 11 · Bài 8, trang 52' },
  { prompt: 'Một nội dung của đường lối Đổi mới là gì?', options: ['Xây dựng nền kinh tế nhiều thành phần', 'Đóng cửa quan hệ đối ngoại', 'Bỏ toàn bộ hoạt động sản xuất'], answer: 0, explanation: 'Đổi mới phát triển nền kinh tế nhiều thành phần, vận hành theo cơ chế thị trường có sự quản lý của Nhà nước.', source: 'Lịch sử 11 · Bài 8, trang 54' },
  { prompt: 'Việc mở rộng quan hệ đối ngoại gắn với mục tiêu nào?', options: ['Hạn chế giao lưu', 'Hội nhập và phát triển đất nước', 'Thay thế hoạt động trong nước'], answer: 1, explanation: 'Mở rộng quan hệ đối ngoại là một phần trong quá trình đổi mới và hội nhập.', source: 'Slide bài giảng · Công cuộc Đổi mới' },
]

function PageHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <div className="student-page-heading"><span>{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>
}

function CardLink({ to, icon: Icon, eyebrow, title, detail, tone = 'sage' }: { to: string; icon: typeof BookOpen; eyebrow?: string; title: string; detail: string; tone?: string }) {
  return <Link className="student-card-link" to={to}><span className={`student-icon-tile ${tone}`}><Icon size={19} /></span><span className="student-link-copy">{eyebrow && <small>{eyebrow}</small>}<strong>{title}</strong><span>{detail}</span></span><ArrowRight size={18} className="student-link-arrow" /></Link>
}

function StatePill({ children, tone = 'neutral' }: { children: ReactNode; tone?: string }) {
  return <span className={`student-pill ${tone}`}><span />{children}</span>
}

function ClassModeControl() {
  const { classMode, setClassMode } = useStudentDemo()
  const options: { value: ClassMode; label: string }[] = [
    { value: 'current', label: 'Lớp hiện tại · 11A2' },
    { value: 'former', label: 'Lớp cũ · 10A3 (chỉ đọc)' },
    { value: 'unassigned', label: 'Chưa được xếp lớp' },
  ]
  return <label className="student-mode-control"><span>Trạng thái dữ liệu mẫu</span><span className="student-select-wrap"><select aria-label="Chọn trạng thái lớp mẫu" value={classMode} onChange={(event) => setClassMode(event.target.value as ClassMode)}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><ChevronDown size={16} /></span></label>
}

function ReadOnlyNotice({ onReturn }: { onReturn?: string }) {
  return <div className="student-notice read-only"><BookOpen size={19} /><div><strong>Đang xem lớp cũ · 10A3</strong><p>Học liệu, bài nộp và kết quả của lớp này chỉ có thể xem lại. Em không thể làm hoạt động mới trong lớp cũ.</p></div>{onReturn && <Link to={onReturn}>Về lớp hiện tại</Link>}</div>
}

function NoClassNotice() {
  return <div className="student-empty-state"><span className="student-icon-tile sage"><GraduationCap size={22} /></span><h2>Chưa có lớp học được phân công</h2><p>Khi quản trị viên xếp lớp, môn học và hoạt động được công bố sẽ xuất hiện ở đây. Hiện tại em chưa thể truy cập nội dung lớp.</p><span className="student-help-text"><CircleHelp size={15} /> Nếu thông tin này chưa đúng, hãy liên hệ giáo viên hoặc quản trị viên.</span></div>
}

function HomePage() {
  const { classMode, resetDemo } = useStudentDemo()
  const isCurrent = classMode === 'current'
  const isFormer = classMode === 'former'
  const subjects = isCurrent ? currentSubjects : isFormer ? formerSubjects : []
  const openActivities = isCurrent ? activities.filter((activity) => activity.status === 'open') : []
  const upcomingLesson = subjects.flatMap((subject) => subject.lessons)[0]
  return <div className="student-page">
    <div className="student-home-top"><PageHeading eyebrow="KHÔNG GIAN HỌC SINH" title="Chào Phúc, hôm nay mình học gì?" description="Bắt đầu từ bài đang học, hoàn thành hoạt động được giao và xem lại tiến độ của em." /><ClassModeControl /></div>
    <div className="student-context-line"><span className="student-context-dot" />{isCurrent ? 'Lớp hiện tại · 11A2' : isFormer ? 'Đang xem lớp đã học · 10A3' : 'Tài khoản chưa có lớp hiện tại'}</div>
    {isFormer && <ReadOnlyNotice onReturn="/student/subjects" />}
    {!isCurrent && !isFormer ? <NoClassNotice /> : <>
      <section className="student-stat-grid" aria-label="Tổng quan học tập">
        <div className="student-stat-card"><span className="student-stat-icon sage"><GraduationCap size={19} /></span><p>Môn học</p><strong>{isCurrent ? '08' : '02'}</strong><small>{isCurrent ? 'Trong lớp 11A2' : 'Lớp 10A3 · chỉ đọc'}</small></div>
        <div className="student-stat-card"><span className="student-stat-icon peach"><ClipboardList size={19} /></span><p>Việc sắp tới</p><strong>{openActivities.length.toString().padStart(2, '0')}</strong><small>{isCurrent ? 'Quiz, tự luận và kiểm tra vở' : 'Không có hoạt động mới'}</small></div>
        <div className="student-stat-card"><span className="student-stat-icon blue"><BookOpen size={19} /></span><p>Bài đã công bố</p><strong>{subjects.reduce((count, subject) => count + subject.lessons.length, 0).toString().padStart(2, '0')}</strong><small>Học liệu sẵn sàng để xem</small></div>
      </section>
      <div className="student-home-grid">
        <section className="student-panel"><div className="student-section-heading"><div><span className="student-overline">BẮT ĐẦU TỪ ĐÂY</span><h2>Gợi ý cho em</h2></div><Clock3 size={18} /></div>
          {isCurrent ? <div className="student-action-list">
            {upcomingLesson && <CardLink to={`/student/lessons/${upcomingLesson.id}`} icon={BookOpen} eyebrow={subjects[0].name} title="Xem bài học gần nhất" detail={upcomingLesson.title} />}
            <CardLink to="/student/activities/quiz-history-reform" icon={ClipboardCheck} eyebrow="CÒN MỞ · HẠN 18/11" title="Hoàn thành quiz được giao" detail="3 câu · Có giải thích và nguồn tham khảo" tone="peach" />
            <CardLink to="/student/activities/notebook-history" icon={ImagePlus} eyebrow="CÒN MỞ ĐẾN 20/11" title="Nộp bài kiểm tra vở" detail="Có thể sửa hoặc xóa bài trước khi đợt nộp đóng" tone="blue" />
          </div> : <div className="student-action-list"><CardLink to="/student/subjects" icon={LibraryBig} title="Xem lại học liệu cũ" detail="Các môn và bài học lớp 10A3 chỉ đọc." />{isFormer && <CardLink to="/student/results" icon={ClipboardCheck} title="Xem kết quả đã lưu" detail="Bài tập và kết quả trước đây của em." tone="blue" />}</div>}
        </section>
        <section className="student-panel student-quick-panel"><span className="student-overline">ĐI TỚI</span><h2>Không gian học tập</h2><div className="student-quick-grid">
          <CardLink to="/student/subjects" icon={LibraryBig} title="Môn học" detail="Bài học và học liệu" />
          <CardLink to="/student/activities" icon={ClipboardList} title="Hoạt động" detail="Bài được giáo viên giao" tone="peach" />
          <CardLink to="/student/practice" icon={Sparkles} title="Tự ôn tập" detail="Tạo phiên luyện riêng" tone="blue" />
          <CardLink to="/student/assistant" icon={MessageCircle} title="Hỏi trợ lý học tập" detail="Dựa trên học liệu của lớp" tone="lavender" />
        </div>
        <button className="student-reset-button" type="button" onClick={resetDemo}><RotateCcw size={14} /> Đặt lại dữ liệu mô phỏng</button></section>
      </div>
    </>}
  </div>
}

function SubjectsPage() {
  const { classMode, setClassMode } = useStudentDemo()
  const navigate = useNavigate()
  const subjects = classMode === 'current' ? currentSubjects : classMode === 'former' ? formerSubjects : []
  return <div className="student-page"><PageHeading eyebrow="MÔN HỌC" title={classMode === 'former' ? 'Lớp đã học' : 'Môn học của em'} description="Mở một môn để xem bài học, tài liệu và các hoạt động liên quan." />
    {classMode === 'former' && <ReadOnlyNotice onReturn="/student" />}{classMode === 'unassigned' && <NoClassNotice />}
    {subjects.length > 0 && <><div className="student-section-heading subject-section-title"><div><span className="student-overline">{classMode === 'current' ? 'LỚP HIỆN TẠI · 11A2' : 'LỚP CŨ · 10A3'}</span><h2>{subjects.length} môn học</h2></div>{classMode === 'current' && <button className="student-text-button" type="button" onClick={() => { setClassMode('former'); navigate('/student/subjects') }}>Xem lớp cũ <ArrowRight size={15} /></button>}</div>
      <div className="student-subject-grid">{subjects.map((subject) => <Link className="student-subject-card" to={`/student/subjects/${subject.id}`} key={subject.id}><span className={`student-icon-tile ${subjectColor[subject.id] ?? 'sage'}`}><BookOpen size={20} /></span><span className="student-subject-name"><strong>{subject.name}</strong><small>{subject.lessons.length} bài học đã công bố</small></span><span className="student-teacher">{subject.teacher}</span><ArrowRight size={17} className="student-link-arrow" />{subject.teacher.startsWith('Chưa') && <StatePill tone="neutral">Chưa có giáo viên</StatePill>}</Link>)}</div>
    </>}
  </div>
}

function SubjectPage() {
  const { subjectId } = useParams()
  const { classMode } = useStudentDemo()
  const subjects = classMode === 'current' ? currentSubjects : classMode === 'former' ? formerSubjects : []
  const subject = subjects.find((item) => item.id === subjectId)
  if (!subject) return <div className="student-page"><PageHeading eyebrow="MÔN HỌC" title="Không tìm thấy môn học" description="Môn này không có trong lớp đang chọn." /><Link className="student-back-link" to="/student/subjects"><ArrowLeft size={16} /> Về danh sách môn</Link></div>
  return <div className="student-page"><Link className="student-back-link" to="/student/subjects"><ArrowLeft size={16} /> Tất cả môn học</Link>{classMode === 'former' && <ReadOnlyNotice onReturn="/student/subjects" />}<PageHeading eyebrow={classMode === 'former' ? 'LỚP 10A3 · CHỈ ĐỌC' : 'LỚP 11A2'} title={subject.name} description={`Giáo viên phụ trách: ${subject.teacher}. Xem bài học và học liệu đã công bố.`} />
    <section className="student-panel"><div className="student-section-heading"><div><span className="student-overline">BÀI HỌC ĐÃ CÔNG BỐ</span><h2>{subject.lessons.length} bài học</h2></div></div>{subject.lessons.length ? <div className="student-lesson-list">{subject.lessons.map((lesson) => <Link className="student-lesson-row" to={`/student/lessons/${lesson.id}`} key={lesson.id}><span className={`student-icon-tile ${subjectColor[subject.id] ?? 'sage'}`}><FileText size={18} /></span><span className="student-link-copy"><strong>{lesson.title}</strong><span>{lesson.materials.length} học liệu · {lesson.readTime}</span></span><ArrowRight size={17} className="student-link-arrow" /></Link>)}</div> : <p className="student-empty-line">Môn học này hiện chưa có giáo viên được phân công nên chưa có học liệu hoặc hoạt động được công bố.</p>}</section>
    {classMode === 'current' && <div className="student-inline-links"><Link to="/student/activities">Hoạt động môn học <ArrowRight size={15} /></Link><Link to="/student/practice">Tự ôn từ bài đã học <ArrowRight size={15} /></Link></div>}
  </div>
}

function LessonPage({ summaryOnly = false }: { summaryOnly?: boolean }) {
  const { lessonId } = useParams()
  const { classMode } = useStudentDemo()
  const subjects = classMode === 'current' ? currentSubjects : classMode === 'former' ? formerSubjects : []
  const resolvedLessonId = lessonId ?? (summaryOnly ? subjects.flatMap((item) => item.lessons)[0]?.id : undefined)
  const subject = subjects.find((item) => item.lessons.some((lesson) => lesson.id === resolvedLessonId))
  const lesson = subject?.lessons.find((item) => item.id === resolvedLessonId)
  if (!lesson || !subject) return <div className="student-page"><NoClassNotice /></div>
  const readOnly = classMode === 'former'
  return <div className="student-page"><Link className="student-back-link" to={`/student/subjects/${subject.id}`}><ArrowLeft size={16} /> Về môn {subject.name}</Link>{readOnly && <ReadOnlyNotice onReturn="/student/subjects" />}<PageHeading eyebrow={`${subject.name.toUpperCase()} · ${lesson.readTime.toUpperCase()}`} title={summaryOnly ? `Tóm tắt · ${lesson.title}` : lesson.title} description="Đọc bài học từ học liệu giáo viên đã công bố. Các nội dung mô phỏng đều có nguồn tham khảo đi kèm." />
    <div className="student-reading-layout"><article className="student-panel student-lesson-content"><div className="student-content-label"><BookOpen size={16} /> NỘI DUNG BÀI HỌC</div><p>{lesson.summary}</p><div className="student-source-box"><strong>Học liệu đã dùng</strong>{lesson.materials.map((material) => <span key={material}><FileText size={15} />{material}</span>)}</div><div className="student-summary-box"><span className="student-overline"><Sparkles size={14} /> TÓM TẮT THEO HỌC LIỆU</span><p>{lesson.summary}</p><small>Bản tóm tắt mẫu · đối chiếu với {lesson.materials[0]}</small></div></article><aside className="student-reading-aside"><div className="student-panel"><span className="student-overline">TIẾP THEO</span><h2>Tiếp tục học</h2>{!readOnly && <><CardLink to="/student/assistant" icon={MessageCircle} title="Hỏi trợ lý học tập" detail="Hỏi về bài học này hoặc môn khác" tone="lavender" /><CardLink to={`/student/practice?subject=${subject.id}&lesson=${lesson.id}`} icon={Sparkles} title="Tự ôn bài này" detail="Tạo phiên luyện tập riêng" tone="blue" /><CardLink to="/student/activities" icon={ClipboardList} title="Xem hoạt động được giao" detail="Quiz và bài tự luận" tone="peach" /> </>}</div></aside></div>
  </div>
}

function ActivitiesPage() {
  const { classMode, attempts, writtenAttempts, notebookSubmission, notebookPhase } = useStudentDemo()
  const visibleActivities = classMode === 'current' ? activities.filter((activity) => !activity.subjectId.startsWith('former-')) : classMode === 'former' ? activities.filter((activity) => activity.subjectId.startsWith('former-')) : []
  const readOnly = classMode !== 'current'
  return <div className="student-page"><PageHeading eyebrow="HOẠT ĐỘNG" title="Bài được giáo viên giao" description="Quiz và bài tự luận được chấm sau khi nộp. Bài kiểm tra vở được giáo viên chốt theo từng tiêu chí." />{classMode === 'former' && <ReadOnlyNotice onReturn="/student/activities" />}{classMode === 'unassigned' && <NoClassNotice />}
    {visibleActivities.length > 0 && <><div className="student-section-heading"><div><span className="student-overline">{readOnly ? 'LỊCH SỬ · CHỈ ĐỌC' : 'DANH SÁCH HOẠT ĐỘNG'}</span><h2>{readOnly ? 'Hoạt động cũ' : 'Đang mở và đã chốt'}</h2></div></div><div className="student-activity-list">{visibleActivities.map((activity) => { const completed = Boolean(attempts[activity.id] || writtenAttempts[activity.id]); const statusLabel = activity.status === 'closed' ? 'Đã chốt' : activity.id === 'notebook-history' ? notebookPhase === 'finalized' ? 'Đã chốt' : notebookPhase === 'closed' ? 'Đã đóng · chờ chốt' : notebookSubmission ? 'Đã nộp' : 'Đang mở' : completed ? 'Đã nộp' : 'Đang mở'; const tone = activity.status === 'closed' || activity.id === 'notebook-history' && notebookPhase === 'finalized' ? 'neutral' : completed || activity.id === 'notebook-history' && Boolean(notebookSubmission) ? 'success' : 'warning'; return <Link className="student-activity-card" to={`/student/activities/${activity.id}`} key={activity.id}><span className={`student-icon-tile ${activity.type === 'notebook' ? 'blue' : activity.type === 'written' ? 'peach' : 'sage'}`}>{activity.type === 'notebook' ? <ImagePlus size={19} /> : activity.type === 'written' ? <FileText size={19} /> : <ClipboardCheck size={19} />}</span><div className="student-activity-copy"><div className="student-activity-meta"><span>{activity.subject} · {activityTypeLabel[activity.type]}</span><StatePill tone={tone}>{statusLabel}</StatePill></div><strong>{activity.title}</strong><p>{activity.description}</p><small><Clock3 size={14} /> {activity.due}</small></div><ArrowRight size={17} className="student-link-arrow" /></Link> })}</div></>}
  </div>
}

function ActivityPage() {
  const { activityId } = useParams()
  const activity = activities.find((item) => item.id === activityId)
  const { classMode, attempts, writtenAttempts, notebookSubmission, notebookPhase, notebookHistoryCount, completeQuiz, completeWritten, submitNotebook, updateNotebookImages, deleteNotebookSubmission, closeNotebook, finalizeNotebook, reopenNotebook } = useStudentDemo()
  const [answers, setAnswers] = useState<number[]>([-1, -1, -1])
  const [writtenAnswer, setWrittenAnswer] = useState('')
  const [imageCount, setImageCount] = useState(0)
  const [editingNotebook, setEditingNotebook] = useState(false)
  if (!activity) return <div className="student-page"><PageHeading eyebrow="HOẠT ĐỘNG" title="Không tìm thấy hoạt động" description="Đường dẫn hoạt động không còn hợp lệ." /><Link className="student-back-link" to="/student/activities"><ArrowLeft size={16} /> Về hoạt động</Link></div>
  const readOnly = classMode !== 'current'
  const quizAttempt = attempts[activity.id]
  const writtenAttempt = writtenAttempts[activity.id]
  if (activity.subjectId.startsWith('former-') && classMode !== 'former') return <div className="student-page"><Link className="student-back-link" to="/student/activities"><ArrowLeft size={16} /> Về hoạt động</Link><div className="student-notice read-only"><BookOpen size={19} /><div><strong>Hoạt động thuộc lớp cũ</strong><p>Chọn trạng thái “Lớp cũ · 10A3” để xem bài nộp lịch sử ở chế độ chỉ đọc.</p></div></div></div>
  if (classMode === 'former' && activity.id === 'former-quiz-history') return <div className="student-page"><Link className="student-back-link" to="/student/activities"><ArrowLeft size={16} /> Về hoạt động</Link><ReadOnlyNotice onReturn="/student/activities" /><PageHeading eyebrow="LỊCH SỬ · BÀI ĐÃ CHẤM" title={activity.title} description={activity.description} /><section className="student-panel student-work-panel"><div className="student-completion"><span className="student-overline">KẾT QUẢ LƯU TỪ LỚP 10A3</span><h2>Em đạt 75%</h2><p>Em nhớ được các mốc chính. Xem lại phần nguyên nhân của phong trào Cần Vương.</p><div className="student-explanation"><strong>Nguồn bài học</strong><p>Lịch sử 10 · Bài 12, trang 78</p></div></div></section></div>
  if (activity.type === 'notebook' && activity.status === 'closed') return <div className="student-page"><Link className="student-back-link" to="/student/activities"><ArrowLeft size={16} /> Về hoạt động</Link>{classMode === 'former' && <ReadOnlyNotice onReturn="/student/activities" />}<PageHeading eyebrow="KIỂM TRA VỞ · ĐÃ ĐÓNG" title={activity.title} description={activity.description} /><NotebookResultCard former={activity.subjectId.startsWith('former-')} /></div>
  if (readOnly) return <div className="student-page"><Link className="student-back-link" to="/student/activities"><ArrowLeft size={16} /> Về hoạt động</Link>{classMode === 'former' ? <ReadOnlyNotice onReturn="/student/activities" /> : <NoClassNotice />}<PageHeading eyebrow={activity.subject.toUpperCase()} title={activity.title} description="Hoạt động chỉ có thể mở khi em đang ở lớp hiện tại." /><div className="student-notice"><CircleHelp size={18} /><div><strong>Không thể làm mới hoạt động này</strong><p>Bài nộp và kết quả lịch sử vẫn được giữ nguyên ở chế độ chỉ đọc.</p></div></div></div>
  if (activity.id === 'notebook-history' && notebookPhase === 'closed' && notebookSubmission) return <div className="student-page"><Link className="student-back-link" to="/student/activities"><ArrowLeft size={16} /> Về hoạt động</Link><PageHeading eyebrow="KIỂM TRA VỞ · ĐÃ ĐÓNG" title={activity.title} description="Bài nộp đã được khóa. Hệ thống đang chuẩn bị phần gợi ý để giáo viên kiểm tra và chốt." /><section className="student-panel student-work-panel"><div className="student-notice read-only"><Clock3 size={19} /><div><strong>Đã khóa bài nộp · {notebookSubmission.imageCount} ảnh mẫu</strong><p>Em không thể sửa hoặc xóa bài sau khi đợt nộp đóng. Chỉ kết quả giáo viên chốt mới được hiển thị như kết quả cuối.</p></div></div><div className="student-demo-step"><span className="student-overline">BƯỚC MÔ PHỎNG TIẾP THEO</span><p>Để người xem đi qua luồng mẫu, nút dưới đây mô phỏng giáo viên hoàn tất phần kiểm tra và chốt kết quả.</p><button className="student-primary-button" type="button" onClick={finalizeNotebook}>Mô phỏng giáo viên chốt tiêu chí <CheckCircle2 size={17} /></button></div></section></div>
  if (activity.id === 'notebook-history' && notebookPhase === 'finalized') return <div className="student-page"><Link className="student-back-link" to="/student/activities"><ArrowLeft size={16} /> Về hoạt động</Link><PageHeading eyebrow="KIỂM TRA VỞ · ĐÃ CHỐT" title={activity.title} description="Giáo viên đã chốt kết quả riêng cho từng tiêu chí. Bài kiểm tra vở không có điểm tổng." /><NotebookResultCard history onReopen={() => { reopenNotebook(); setImageCount(0); setEditingNotebook(false) }} />{notebookHistoryCount > 0 && <div className="student-notice"><CheckCircle2 size={18} /><div><strong>{notebookHistoryCount} kết quả đã chốt được lưu trong lịch sử</strong><p>Kết quả trước đây không bị thay thế khi hoạt động được mở lại.</p></div></div>}</div>
  const headingDescription = activity.description
  return <div className="student-page"><Link className="student-back-link" to="/student/activities"><ArrowLeft size={16} /> Tất cả hoạt động</Link><PageHeading eyebrow={`${activity.subject.toUpperCase()} · ${activityTypeLabel[activity.type].toUpperCase()}`} title={activity.title} description={headingDescription} /><div className="student-activity-detail-meta"><StatePill tone={activity.status === 'open' ? 'warning' : 'neutral'}>{activity.status === 'open' ? 'Đang mở' : 'Đã đóng'}</StatePill><span><Clock3 size={15} /> {activity.due}</span><span><BookOpen size={15} /> {activity.lesson}</span></div>
    {activity.type === 'quiz' && <section className="student-panel student-work-panel">{quizAttempt ? <div className="student-completion"><span className="student-completion-icon"><CheckCircle2 size={25} /></span><span className="student-overline">ĐÃ NỘP · {quizAttempt.completedAt}</span><h2>Em đạt {quizAttempt.score}%</h2><p>Kết quả được hiển thị ngay sau khi chấm thành công. Hoạt động này chỉ nhận một bài nộp.</p><div className="student-answer-review">{quizQuestions.map((question, index) => <div className="student-explanation" key={question.prompt}><strong>{index + 1}. {question.prompt}</strong><p>{quizAttempt.answers[index] === question.answer ? 'Chính xác.' : `Đáp án đúng: ${question.options[question.answer]}.`} {question.explanation}</p><small>Nguồn: {question.source}</small></div>)}</div></div> : <><div className="student-section-heading"><div><span className="student-overline">3 CÂU HỎI MẪU</span><h2>Chọn câu trả lời</h2></div><span className="student-count">01 / 01 lần làm</span></div><div className="student-questions">{quizQuestions.map((question, index) => <fieldset className="student-question" key={question.prompt}><legend><span>{String(index + 1).padStart(2, '0')}</span>{question.prompt}</legend>{question.options.map((option, optionIndex) => <label className={`student-option ${answers[index] === optionIndex ? 'selected' : ''}`} key={option}><input type="radio" name={`question-${index}`} checked={answers[index] === optionIndex} onChange={() => setAnswers((previous) => previous.map((value, questionIndex) => questionIndex === index ? optionIndex : value))} /><span>{option}</span></label>)}</fieldset>)}</div><button className="student-primary-button" type="button" disabled={answers.some((answer) => answer < 0)} onClick={() => { const correct = answers.reduce((total, answer, index) => total + (answer === quizQuestions[index].answer ? 1 : 0), 0); completeQuiz(activity.id, answers, Math.round(correct / quizQuestions.length * 100)) }}>Nộp bài và xem giải thích <ArrowRight size={17} /></button></>}</section>}
    {activity.type === 'written' && <section className="student-panel student-work-panel">{writtenAttempt ? <div className="student-completion"><span className="student-completion-icon"><CheckCircle2 size={25} /></span><span className="student-overline">ĐÃ NỘP · {writtenAttempt.completedAt}</span><h2>Điểm mô phỏng: {writtenAttempt.score}%</h2><p>Phản hồi được chấm theo tiêu chí mẫu và hiển thị ngay. Bài làm được lưu thành kết quả của phiên.</p><div className="student-explanation"><strong>Phản hồi</strong><p>{writtenAttempt.answer.length > 45 ? 'Em đã trình bày được ý chính. Hãy nhớ nêu rõ đường đi của máu và liên hệ chức năng vận chuyển.' : 'Câu trả lời còn ngắn. Em hãy mô tả rõ đường đi của máu trong hệ mạch và nêu một ưu điểm.'}</p><small>Nguồn tham khảo: Sinh học 11 · Bài 9, trang 63–64</small></div></div> : <><div className="student-rubric-box"><strong>Gợi ý trước khi viết</strong><ul><li>Nêu đường đi của máu trong hệ tuần hoàn kín.</li><li>Giải thích liên hệ giữa máu lưu thông trong mạch và hiệu quả trao đổi chất.</li></ul></div><label className="student-field-label" htmlFor="written-answer">Câu trả lời của em</label><textarea id="written-answer" className="student-textarea" rows={7} value={writtenAnswer} onChange={(event) => setWrittenAnswer(event.target.value)} placeholder="Viết câu trả lời bằng lời của em…" /><div className="student-field-hint">{writtenAnswer.length} ký tự · Có thể xem lại giải thích sau khi nộp</div><button className="student-primary-button" type="button" disabled={writtenAnswer.trim().length < 8} onClick={() => completeWritten(activity.id, writtenAnswer.trim(), writtenAnswer.trim().length > 120 ? 90 : writtenAnswer.trim().length > 45 ? 80 : 60)}>Nộp bài và xem phản hồi <ArrowRight size={17} /></button></>}</section>}
    {activity.type === 'notebook' && <NotebookActivityPanel submission={notebookSubmission} phase={notebookPhase} historyCount={notebookHistoryCount} imageCount={imageCount} editing={editingNotebook} onAddImage={() => setImageCount((previous) => Math.min(previous + 1, 4))} onToggleReplace={() => { setImageCount(Math.max(notebookSubmission?.imageCount ?? 0, 2)); setEditingNotebook((previous) => !previous) }} onSaveReplace={() => { updateNotebookImages(Math.max(imageCount, 2)); setEditingNotebook(false) }} onDelete={() => { deleteNotebookSubmission(); setImageCount(0); setEditingNotebook(false) }} onSubmit={() => { submitNotebook(imageCount); setEditingNotebook(false) }} onClose={closeNotebook} />}
  </div>
}

function NotebookActivityPanel({ submission, phase, historyCount, imageCount, editing, onAddImage, onToggleReplace, onSaveReplace, onDelete, onSubmit, onClose }: {
  submission: NotebookSubmission | null
  phase: NotebookPhase
  historyCount: number
  imageCount: number
  editing: boolean
  onAddImage: () => void
  onToggleReplace: () => void
  onSaveReplace: () => void
  onDelete: () => void
  onSubmit: () => void
  onClose: () => void
}) {
  return <section className="student-panel student-work-panel">
    <div className="student-notebook-rules"><span className="student-overline">TRƯỚC KHI NỘP</span><p>Chỉ dùng ảnh minh họa có sẵn trong bản xem trước. Không có ảnh nào được tải lên hoặc gửi ra ngoài trình duyệt.</p><ul>{notebookCriteria.map((criterion) => <li key={criterion}>{criterion}</li>)}</ul></div>
    {historyCount > 0 && <div className="student-notice"><CheckCircle2 size={18} /><div><strong>Kết quả chốt trước đây vẫn được lưu</strong><p>Việc mở lại hoạt động không thay thế các kết quả cũ.</p></div></div>}
    {submission ? <div className="student-notebook-submission">
      <div className="student-submission-heading"><span className="student-completion-icon"><CheckCircle2 size={22} /></span><div><strong>Bài nộp hiện tại</strong><small>{submission.submittedAt} · {submission.imageCount} ảnh mẫu</small></div><StatePill tone={phase === 'open' ? 'warning' : 'neutral'}>{phase === 'open' ? 'Đang mở · có thể sửa' : 'Đã khóa'}</StatePill></div>
      <p>Em có thể thay ảnh hoặc xóa bài nộp hiện tại trước 21:00, 20/11. Kết quả chỉ xuất hiện sau khi giáo viên chốt từng tiêu chí.</p>
      {editing && <div className="student-sample-images">{Array.from({ length: imageCount }).map((_, index) => <span key={index}><ImagePlus size={18} /> Ảnh vở mẫu {index + 1}</span>)}</div>}
      <div className="student-button-row"><button type="button" className="student-secondary-button" onClick={onToggleReplace}>{editing ? 'Ẩn ảnh mẫu' : 'Thay ảnh mẫu'}</button>{editing && <button type="button" className="student-primary-button compact" onClick={onSaveReplace}>Lưu thay đổi</button>}<button type="button" className="student-danger-button" onClick={onDelete}><Trash2 size={15} /> Xóa bài nộp</button><button type="button" className="student-secondary-button" onClick={onClose}>Mô phỏng đóng đợt nộp <ArrowRight size={15} /></button></div>
    </div> : <>
      <div className="student-upload-simulator"><span className="student-upload-icon"><ImagePlus size={24} /></span><strong>Thêm ảnh vở mẫu</strong><p>Chọn ảnh giả lập để đi hết luồng xem trước. Không mở file picker và không tải ảnh thật lên.</p>{imageCount > 0 && <div className="student-sample-images">{Array.from({ length: imageCount }).map((_, index) => <span key={index}><ImagePlus size={18} /> Ảnh vở mẫu {index + 1}</span>)}</div>}<button type="button" className="student-secondary-button" onClick={onAddImage}><ImagePlus size={16} /> Thêm ảnh mẫu{imageCount ? ` (${imageCount})` : ''}</button></div>
      <button className="student-primary-button" type="button" disabled={imageCount === 0} onClick={onSubmit}>Gửi bài nộp <ArrowRight size={17} /></button>
    </>}
  </section>
}

function NotebookResultCard({ former = false, history = false, onReopen }: { former?: boolean; history?: boolean; onReopen?: () => void }) {
  const criteria = former ? [
    { title: 'Nêu được nguyên nhân chính của phong trào.', status: 'Đã ghi nhận', note: 'Giáo viên xác nhận nội dung có trong trang vở.' },
    { title: 'Ghi được các diễn biến tiêu biểu.', status: 'Cần bổ sung', note: 'Bổ sung một mốc diễn biến trong bài học.' },
    { title: 'Nêu được kết quả và ý nghĩa.', status: 'Đã ghi nhận', note: 'Giáo viên xác nhận nội dung có trong trang vở.' },
  ] : history ? [
    { title: 'Ghi được năm bắt đầu công cuộc Đổi mới.', status: 'Đã ghi nhận', note: 'Giáo viên xác nhận năm 1986 có trong trang vở.' },
    { title: 'Nêu được thay đổi trong phát triển kinh tế nhiều thành phần.', status: 'Cần bổ sung', note: 'Bổ sung vai trò quản lý của Nhà nước.' },
    { title: 'Ghi được nội dung mở rộng quan hệ đối ngoại.', status: 'Chưa xác định', note: 'Ảnh chưa đủ rõ để giáo viên kết luận tiêu chí này.' },
  ] : closedNotebookResult.criteria
  const finalizedAt = former ? '02/05/2026' : history ? 'Mẫu kết quả hiện tại' : closedNotebookResult.finalizedAt
  return <section className="student-panel student-work-panel"><div className="student-notice"><ClipboardCheck size={19} /><div><strong>Giáo viên đã chốt · {finalizedAt}</strong><p>Đây là kết quả riêng cho từng tiêu chí; bài kiểm tra vở không có điểm tổng hoặc kết quả đạt/không đạt.</p></div></div><div className="student-criteria-list">{criteria.map((criterion) => <article className="student-criterion" key={criterion.title}><div><strong>{criterion.title}</strong><p>{criterion.note}</p></div><StatePill tone={criterion.status === 'Đã ghi nhận' ? 'success' : criterion.status === 'Cần bổ sung' ? 'warning' : 'neutral'}>{criterion.status}</StatePill></article>)}</div>{onReopen && <button className="student-secondary-button" type="button" onClick={onReopen}>Mô phỏng giáo viên mở lại hoạt động <RotateCcw size={15} /></button>}</section>
}

function PracticePage() {
  const { classMode } = useStudentDemo()
  const [searchParams] = useSearchParams()
  const [subjectId, setSubjectId] = useState(searchParams.get('subject') || 'biology')
  const [lessonId, setLessonId] = useState(searchParams.get('lesson') || 'biology-circulation')
  const navigate = useNavigate()
  const subjects = classMode === 'current' ? currentSubjects : []
  const subject = subjects.find((item) => item.id === subjectId) ?? subjects[0]
  const lesson = subject?.lessons.find((item) => item.id === lessonId) ?? subject?.lessons[0]
  if (classMode !== 'current') return <div className="student-page"><PageHeading eyebrow="TỰ ÔN TẬP" title="Tạo phiên ôn tập" description="Chọn một bài học đã công bố để bắt đầu luyện riêng." />{classMode === 'former' ? <ReadOnlyNotice onReturn="/student/subjects" /> : <NoClassNotice />}</div>
  return <div className="student-page"><PageHeading eyebrow="TỰ ÔN TẬP" title="Luyện tập theo nhịp của em" description="Tạo phiên riêng từ bài học đã công bố. Phiên tự ôn được lưu riêng, không tính vào bài giáo viên giao." />
    <div className="student-practice-layout"><section className="student-panel student-practice-setup"><span className="student-overline">BƯỚC 1 · CHỌN HỌC LIỆU</span><h2>Em muốn ôn bài nào?</h2><label className="student-field-label" htmlFor="practice-subject">Môn học</label><select id="practice-subject" className="student-select" value={subject?.id ?? ''} onChange={(event) => { const nextSubject = subjects.find((item) => item.id === event.target.value); setSubjectId(event.target.value); setLessonId(nextSubject?.lessons[0]?.id ?? '') }}>{subjects.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select><label className="student-field-label" htmlFor="practice-lesson">Bài học</label><select id="practice-lesson" className="student-select" value={lesson?.id ?? ''} onChange={(event) => setLessonId(event.target.value)}>{subject?.lessons.map((item) => <option value={item.id} key={item.id}>{item.title}</option>)}</select><div className="student-notice"><Sparkles size={18} /><div><strong>Phiên ôn mẫu · 3 câu</strong><p>Câu hỏi bám theo bài học đã chọn. Em có thể tạo nhiều phiên độc lập.</p></div></div><button type="button" className="student-primary-button" disabled={!lesson} onClick={() => navigate(`/student/practice/session?subject=${encodeURIComponent(subject?.name ?? '')}&lesson=${encodeURIComponent(lesson?.title ?? '')}`)}>Bắt đầu tự ôn <ArrowRight size={17} /></button></section><aside className="student-panel student-practice-aside"><span className="student-overline">PHIÊN RIÊNG</span><h2>Tách biệt bài được giao</h2><p>Kết quả tự ôn xuất hiện trong hồ sơ của em theo một dòng riêng. Giáo viên không xem được phiên tự luyện này.</p><div className="student-separate-streams"><span><ClipboardCheck size={17} /> Bài được giao</span><span><Sparkles size={17} /> Phiên tự ôn</span></div></aside></div>
  </div>
}

function PracticeSessionPage() {
  const { classMode, completePractice } = useStudentDemo()
  const [searchParams] = useSearchParams()
  const [answers, setAnswers] = useState<number[]>([-1, -1, -1])
  const [completedScore, setCompletedScore] = useState<number | null>(null)
  const subject = searchParams.get('subject') || 'Sinh học'
  const lesson = searchParams.get('lesson') || 'Tuần hoàn máu ở động vật'
  const questions = practiceQuestionBank[subject] ?? practiceQuestionBank['Sinh học']
  if (classMode !== 'current') return <div className="student-page"><NoClassNotice /></div>
  return <div className="student-page"><Link className="student-back-link" to="/student/practice"><ArrowLeft size={16} /> Kết thúc phiên</Link><PageHeading eyebrow={`TỰ ÔN · ${subject.toUpperCase()}`} title={lesson} description="Phiên tự luyện mẫu · kết quả chỉ lưu trong hồ sơ cá nhân." />
    <section className="student-panel student-work-panel">{completedScore !== null ? <div className="student-completion"><span className="student-completion-icon"><CheckCircle2 size={25} /></span><span className="student-overline">ĐÃ HOÀN THÀNH PHIÊN TỰ ÔN</span><h2>Em đạt {completedScore}%</h2><p>Kết quả này được lưu riêng với bài tập được giáo viên giao.</p><Link className="student-primary-link" to="/student/profile">Xem hồ sơ học tập <ArrowRight size={16} /></Link></div> : <><div className="student-section-heading"><div><span className="student-overline">3 CÂU · KHÔNG GIỚI HẠN SỐ PHIÊN</span><h2>Thử sức nhé</h2></div></div><div className="student-questions">{questions.map((question, index) => <fieldset className="student-question" key={question.prompt}><legend><span>{String(index + 1).padStart(2, '0')}</span>{question.prompt}</legend>{question.options.map((option, optionIndex) => <label className={`student-option ${answers[index] === optionIndex ? 'selected' : ''}`} key={option}><input type="radio" name={`practice-${index}`} checked={answers[index] === optionIndex} onChange={() => setAnswers((previous) => previous.map((value, questionIndex) => questionIndex === index ? optionIndex : value))} /><span>{option}</span></label>)}</fieldset>)}</div><button className="student-primary-button" type="button" disabled={answers.some((answer) => answer < 0)} onClick={() => { const score = Math.round(answers.reduce((total, answer, index) => total + (answer === questions[index].answer ? 1 : 0), 0) / questions.length * 100); completePractice(subject, lesson, score); setCompletedScore(score) }}>Hoàn tất phiên <Check size={17} /></button></>}</section>
  </div>
}

function ResultsPage() {
  const { classMode, attempts, writtenAttempts, practiceSessions, notebookSubmission, notebookPhase, notebookHistoryCount } = useStudentDemo()
  if (classMode === 'unassigned') return <div className="student-page"><PageHeading eyebrow="KẾT QUẢ" title="Kết quả học tập" description="Bài tập được giao và phiên tự ôn được lưu riêng." /><NoClassNotice /></div>
  const readOnly = classMode === 'former'
  const history = readOnly ? [
    { subject: 'Lịch sử', lesson: 'Việt Nam từ năm 1858 đến cuối thế kỷ XIX', activity: 'Quiz · Bài 12', score: 75, date: '05/05', explanation: 'Em nhớ được các mốc chính. Xem lại phần nguyên nhân của phong trào Cần Vương.', source: 'Lịch sử 10 · Bài 12, trang 78' },
    { subject: 'Ngữ văn', lesson: 'Truyện ngắn Việt Nam hiện đại', activity: 'Tự luận · Chủ đề 5', score: 85, date: '02/05', explanation: 'Bài viết có dẫn chứng phù hợp và nêu được tác dụng của chi tiết nghệ thuật.', source: 'Ngữ văn 10 · Chủ đề 5' },
  ] : assignedResultHistory
  return <div className="student-page"><PageHeading eyebrow="KẾT QUẢ" title="Bài nộp và phản hồi" description="Điểm quiz/tự luận xuất hiện sau khi chấm. Kết quả kiểm tra vở chỉ gồm trạng thái từng tiêu chí, không có điểm tổng." />{readOnly && <ReadOnlyNotice onReturn="/student/subjects" />}
    <section className="student-panel student-result-panel"><div className="student-section-heading"><div><span className="student-overline">BÀI ĐƯỢC GIAO</span><h2>Kết quả có giải thích</h2></div><ClipboardCheck size={19} /></div><div className="student-result-list">{history.map((result) => <article className="student-result-row" key={result.activity}><div className="student-result-score">{result.score}<small>%</small></div><div className="student-result-copy"><div className="student-result-head"><strong>{result.activity}</strong><small>{result.date} · {result.subject}</small></div><span>{result.lesson}</span><p>{result.explanation}</p><small className="student-citation"><FileText size={13} /> {result.source}</small></div></article>)}
      {Object.entries(readOnly ? {} : attempts).map(([activityId, attempt]) => { const item = activities.find((activity) => activity.id === activityId); return item ? <article className="student-result-row" key={activityId}><div className="student-result-score">{attempt.score}<small>%</small></div><div className="student-result-copy"><div className="student-result-head"><strong>{item.title}</strong><small>Vừa hoàn thành</small></div><span>{item.lesson}</span><p>Quiz đã được chấm ngay. Mở hoạt động để xem lời giải và nguồn cho từng câu.</p><Link to={`/student/activities/${activityId}`}>Xem giải thích <ArrowRight size={14} /></Link></div></article> : null })}
      {Object.entries(readOnly ? {} : writtenAttempts).map(([activityId, attempt]) => { const item = activities.find((activity) => activity.id === activityId); return item ? <article className="student-result-row" key={activityId}><div className="student-result-score">{attempt.score}<small>%</small></div><div className="student-result-copy"><div className="student-result-head"><strong>{item.title}</strong><small>Vừa hoàn thành</small></div><span>{item.lesson}</span><p>Phản hồi mẫu được lưu ngay khi chấm thành công.</p><Link to={`/student/activities/${activityId}`}>Xem phản hồi <ArrowRight size={14} /></Link></div></article> : null })}</div></section>
    <div className="student-results-grid"><section className="student-panel"><div className="student-section-heading"><div><span className="student-overline">KIỂM TRA VỞ</span><h2>Kết quả theo tiêu chí</h2></div></div>{readOnly ? <Link className="student-criteria-link" to="/student/activities/notebook-former-history"><span><strong>Kiểm tra vở · Lịch sử Việt Nam thế kỷ XIX</strong><small>Đã chốt · 02/05 · Không có điểm tổng</small></span><StatePill tone="success">Đã chốt</StatePill><ArrowRight size={16} /></Link> : <>
      {notebookPhase === 'finalized' && notebookHistoryCount > 0 && <div className="student-notebook-result-history"><NotebookResultCard history /></div>}
      {notebookSubmission && notebookPhase !== 'finalized' && <Link className="student-criteria-link" to="/student/activities/notebook-history"><span><strong>Kiểm tra vở · Tuần hoàn máu</strong><small>{notebookPhase === 'closed' ? 'Đã đóng · đang chờ giáo viên chốt' : 'Đã nộp · đang chờ giáo viên chốt'}</small></span><StatePill tone="warning">Đang chờ</StatePill><ArrowRight size={16} /></Link>}
      {!notebookSubmission && notebookHistoryCount === 0 && <Link className="student-criteria-link" to="/student/activities/notebook-closed-biology"><span><strong>Kiểm tra vở · Tuần hoàn máu</strong><small>Đã chốt · 08/11 · Không có điểm tổng</small></span><StatePill tone="success">Đã chốt</StatePill><ArrowRight size={16} /></Link>}
    </>}<div className="student-muted-note">Bài kiểm tra vở không góp vào điểm tiến độ môn học.</div></section><section className="student-panel"><div className="student-section-heading"><div><span className="student-overline">TỰ ÔN TẬP</span><h2>Phiên cá nhân</h2></div><Sparkles size={18} /></div>{!readOnly && practiceSessions.length ? practiceSessions.map((session) => <div className="student-practice-result" key={session.id}><strong>{session.lesson}</strong><span>{session.subject} · {session.completedAt}</span><StatePill tone="neutral">{session.score}%</StatePill></div>) : <p className="student-empty-line">{readOnly ? 'Các phiên tự ôn cũ được lưu trong hồ sơ học tập của lớp tương ứng.' : 'Chưa có phiên tự ôn. Kết quả sẽ được lưu ở đây, tách khỏi bài được giao.'}</p>}</section></div>
  </div>
}

function ProfilePage() {
  const { classMode, practiceSessions } = useStudentDemo()
  const subjects = classMode === 'current' ? currentSubjects : classMode === 'former' ? formerSubjects : []
  return <div className="student-page">
    <PageHeading eyebrow="HỒ SƠ HỌC TẬP" title="Tiến độ của em" description="Xu hướng theo từng môn và từng bài học. Đây là tín hiệu ôn tập, không phải nhãn đánh giá năng lực." />
    {classMode === 'former' && <ReadOnlyNotice onReturn="/student/subjects" />}
    {classMode === 'unassigned' && <NoClassNotice />}
    {subjects.length > 0 && <>
      <div className="student-progress-note"><CircleHelp size={16} /> Điểm bài được giao và điểm tự ôn nằm ở hai dòng riêng. Kiểm tra vở không tính vào điểm tiến độ.</div>
      <div className="student-progress-grid">{subjects.map((subject, index) => {
        const assigned = classMode === 'former' ? (subject.id === 'former-literature' ? 85 : 75) : (({ history: 80, biology: 70, literature: 85, chemistry: 42, mathematics: 78, english: 88, informatics: 74 } as Record<string, number>)[subject.id] ?? 70)
        const practice = practiceSessions.filter((session) => session.subject === subject.name).map((session) => session.score)
        const practiceScore = practice.length ? Math.round(practice.reduce((sum, value) => sum + value, 0) / practice.length) : classMode === 'former' ? 68 + index * 7 : [75, 90, 70, 80, 65, 77, 84, 72][index % 8]
        const lesson = subject.lessons[0]
        const hasPublishedWork = !subject.teacher.startsWith('Chưa') && Boolean(lesson)
        const needsReview = hasPublishedWork && assigned < 50
        return <article className="student-panel student-progress-card" key={subject.id}>
          <div className="student-progress-title"><span className={`student-icon-tile ${subjectColor[subject.id] ?? 'sage'}`}><BookOpen size={18} /></span><div><strong>{subject.name}</strong><small>{classMode === 'former' ? 'Lớp 10A3 · lịch sử' : 'Lớp 11A2'}</small></div><ArrowRight size={15} /></div>
          {lesson && <Link className="student-lesson-progress-link" to={`/student/lessons/${lesson.id}`}>{lesson.title}</Link>}
          {hasPublishedWork ? <>
            <div className="student-score-stream"><span><ClipboardCheck size={14} /> Bài được giao</span><strong>{assigned}%</strong></div><div className="student-score-track"><span style={{ width: `${assigned}%` }} /></div>
            <div className="student-score-stream"><span><Sparkles size={14} /> Tự ôn tập</span><strong>{practiceScore}%</strong></div><div className="student-score-track self-practice"><span style={{ width: `${practiceScore}%` }} /></div>
            {needsReview && <div className="student-difficulty-tag">Bài này cần ôn thêm · <Link to={`/student/lessons/${lesson.id}`}>Xem bài hỗ trợ</Link></div>}
          </> : <p className="student-empty-line">Chưa có hoạt động được chấm trong môn này. Tiến độ sẽ xuất hiện khi có bài học và kết quả.</p>}
          <small className="student-progress-foot">Dữ liệu mẫu theo bài đã chấm thành công</small>
        </article>
      })}</div>
    </>}
  </div>
}

function CalendarPage() {
  const { classMode, notebookPhase } = useStudentDemo()
  const visible = classMode === 'current' ? calendarEvents : []
  return (
    <div className="student-page">
      <PageHeading eyebrow="LỊCH & THÔNG BÁO" title="Những việc sắp tới" description="Lịch của lớp giúp em theo dõi hạn nộp; thông báo đã nhận được giữ lại để xem sau." />
      {classMode === 'former' && <ReadOnlyNotice onReturn="/student" />}
      {classMode === 'unassigned' && <NoClassNotice />}
      {classMode === 'current' && <>
        <section className="student-notification-banner">
          <span className="student-icon-tile peach"><CalendarDays size={19} /></span>
          <div><strong>{notebookPhase === 'open' ? 'Đợt nộp kiểm tra vở vẫn đang mở' : notebookPhase === 'closed' ? 'Bài nộp đã khóa, đang chờ giáo viên chốt' : 'Kết quả kiểm tra vở đã được chốt'}</strong><p>Lịch sử · Bài Công cuộc Đổi mới · Hạn 21:00, 20/11</p></div>
          <Link to="/student/activities/notebook-history">Mở hoạt động <ArrowRight size={15} /></Link>
        </section>
        <div className="student-calendar-layout">
          <section className="student-panel">
            <div className="student-section-heading"><div><span className="student-overline">THÁNG 11, 2026</span><h2>Lịch lớp 11A2</h2></div><CalendarDays size={18} /></div>
            <div className="student-event-list">{visible.map((event) => (
              <article className="student-event-row" key={event.title}>
                <div className="student-event-date"><strong>{event.date.split('/')[0]}</strong><small>THG 11</small></div>
                <div className="student-event-copy"><span>{event.time} · {event.subject}</span><strong>{event.title}</strong></div>
                <Link to={`/student/activities/${event.activityId}`} aria-label={`Mở ${event.title}`}><ArrowRight size={17} /></Link>
              </article>
            ))}</div>
          </section>
          <section className="student-panel">
            <div className="student-section-heading"><div><span className="student-overline">ĐÃ NHẬN</span><h2>Thông báo của em</h2></div><StatePill tone="neutral">Được lưu</StatePill></div>
            <div className="student-saved-notice"><span className="student-notification-dot" /><div><strong>Cô Nguyễn Minh Anh công bố quiz mới</strong><p>Ôn tập Công cuộc Đổi mới · Lịch sử</p><small>Hôm nay, 09:15</small></div></div>
            <div className="student-saved-notice"><span className="student-notification-dot muted" /><div><strong>Kết quả kiểm tra vở đã được chốt</strong><p>Tuần hoàn máu ở động vật · Sinh học</p><small>08/11, 16:40</small></div></div>
          </section>
        </div>
      </>}
      {classMode === 'former' && <div className="student-panel student-history-calendar"><span className="student-overline">LỊCH SỬ ĐÃ LƯU</span><h2>Thông tin của lớp 10A3</h2><p>Lịch hoạt động mới không còn áp dụng cho lớp cũ. Học liệu, bài nộp và kết quả trước đây vẫn có thể xem trong các mục tương ứng.</p><Link to="/student/subjects">Mở học liệu cũ <ArrowRight size={15} /></Link></div>}
    </div>
  )
}

function makeGroundedReply(question: string) {
  const normalized = question.toLocaleLowerCase('vi')
  if (normalized.includes('đổi mới') || normalized.includes('1986')) return { text: 'Đổi mới bắt đầu từ năm 1986, tập trung phát triển nền kinh tế nhiều thành phần và từng bước mở rộng quan hệ đối ngoại. Em có thể xem các ý này trong bài học đã công bố.', source: 'Lịch sử 11 · Bài 8, trang 52–54' }
  if (normalized.includes('tuần hoàn') || normalized.includes('máu')) return { text: 'Ở hệ tuần hoàn kín, máu lưu thông trong hệ thống mạch và được tim đẩy đi. Nhờ duy trì áp lực dòng chảy, việc trao đổi chất tại mô hiệu quả hơn.', source: 'Sinh học 11 · Bài 9, trang 63–64' }
  if (normalized.includes('thơ') || normalized.includes('văn')) return { text: 'Khi phân tích bài thơ, hãy dựa vào hình ảnh và cách dùng từ cụ thể rồi liên hệ chúng với giọng điệu hoặc cảm xúc. Học liệu môn Ngữ văn có ví dụ ở phần đọc hiểu.', source: 'Ngữ văn 11 · Chủ đề Thơ hiện đại' }
  return { text: 'Mình chưa tìm thấy câu trả lời đủ căn cứ trong các học liệu đã công bố của lớp. Em thử ghi rõ tên môn hoặc bài học để mình giới hạn nội dung cần xem nhé.', source: undefined }
}

function AssistantPage() {
  const { classMode, chatMessages, addChatMessage } = useStudentDemo()
  const [question, setQuestion] = useState('')
  const readOnly = classMode !== 'current'
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const archivedMessages = [
    { role: 'student' as const, text: 'Nguyên nhân nào dẫn đến phong trào Cần Vương?' },
    { role: 'assistant' as const, text: 'Phong trào Cần Vương gắn với việc vua Hàm Nghi xuống chiếu kêu gọi nhân dân giúp vua cứu nước. Nhiều sĩ phu và nhân dân đã hưởng ứng lời kêu gọi này.', source: 'Lịch sử 10 · Bài 12, trang 78' },
  ]
  const visibleMessages = classMode === 'former' ? archivedMessages : chatMessages
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const content = question.trim()
    if (!content || readOnly) return
    const response = makeGroundedReply(content)
    addChatMessage({ role: 'student', text: content })
    addChatMessage({ role: 'assistant', text: response.text, source: response.source })
    setQuestion('')
    window.setTimeout(() => messagesEndRef.current?.scrollIntoView({ block: 'end' }), 0)
  }
  return (
    <div className="student-page">
      <PageHeading eyebrow="TRỢ LÝ HỌC TẬP" title="Hỏi theo học liệu của lớp" description="Cuộc trò chuyện mô phỏng chỉ dùng các bài đã công bố. Câu trả lời mẫu kèm nguồn; nội dung chưa có căn cứ sẽ được nói rõ." />
      {classMode === 'former' && <ReadOnlyNotice onReturn="/student" />}
      {classMode === 'unassigned' && <NoClassNotice />}
      {classMode !== 'unassigned' && (
        <section className="student-panel student-chat-panel">
          <div className="student-chat-head">
            <span className="student-icon-tile lavender"><MessageCircle size={19} /></span>
            <div><strong>Trợ lý học tập EduCraft</strong><small>{readOnly ? 'Lịch sử trò chuyện · chỉ đọc' : 'Có thể hỏi về tất cả môn trong lớp 11A2'}</small></div>
            <StatePill tone="success">Mô phỏng</StatePill>
          </div>
          <div className="student-chat-history" aria-live="polite">
            {visibleMessages.map((message, index) => (
              <article className={`student-chat-message ${message.role}`} key={`${message.role}-${index}`}>
                <span className="student-chat-avatar">{message.role === 'student' ? 'GP' : <Sparkles size={15} />}</span>
                <div>
                  <span className="student-chat-role">{message.role === 'student' ? 'Em' : 'Trợ lý EduCraft'}</span>
                  <p>{message.text}</p>
                  {message.source && <small><FileText size={13} /> Nguồn: {message.source}</small>}
                </div>
              </article>
            ))}
            <div ref={messagesEndRef} />
          </div>
          {!readOnly && classMode === 'current' ? (
            <>
              <div className="student-chat-prompts">
                <span>Gợi ý hỏi</span>
                <button type="button" onClick={() => setQuestion('Vì sao hệ tuần hoàn kín trao đổi chất hiệu quả hơn?')}>So sánh hệ tuần hoàn kín <ArrowRight size={13} /></button>
                <button type="button" onClick={() => setQuestion('Công cuộc Đổi mới bắt đầu từ năm nào?')}>Mốc thời gian bài Đổi mới <ArrowRight size={13} /></button>
              </div>
              <form className="student-chat-composer" onSubmit={submit}>
                <label className="sr-only" htmlFor="assistant-question">Câu hỏi cho trợ lý học tập</label>
                <textarea id="assistant-question" rows={2} value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Hỏi về nội dung trong học liệu đã công bố…" />
                <button type="submit" aria-label="Gửi câu hỏi" disabled={!question.trim()}><Send size={17} /></button>
              </form>
              <p className="student-chat-disclaimer">Bản xem trước dùng câu trả lời dựng sẵn, không gọi AI thật. Nội dung học tập luôn cần đối chiếu với bài học nguồn.</p>
            </>
          ) : <p className="student-chat-disclaimer">Lịch sử chat được giữ lại để em xem; ở lớp cũ, cuộc trò chuyện chỉ đọc.</p>}
        </section>
      )}
    </div>
  )
}

export function StudentPage({ screen }: { screen: Screen }) {
  if (screen === 'home') return <HomePage />
  if (screen === 'subjects') return <SubjectsPage />
  if (screen === 'subject') return <SubjectPage />
  if (screen === 'lesson') return <LessonPage />
  if (screen === 'summary') return <LessonPage summaryOnly />
  if (screen === 'activities') return <ActivitiesPage />
  if (screen === 'activity') return <ActivityPage />
  if (screen === 'practice') return <PracticePage />
  if (screen === 'practice-session') return <PracticeSessionPage />
  if (screen === 'results') return <ResultsPage />
  if (screen === 'profile') return <ProfilePage />
  if (screen === 'calendar') return <CalendarPage />
  return <AssistantPage />
}
