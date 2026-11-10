import { useState } from 'react'
import { Link } from 'react-router'
import { MessageCircle } from 'lucide-react'
import { StudentScenarioControl } from '../ScenarioControl'
import { useStudentScenario } from '../useStudentScenario'
import { getChatSources, getOwnConversations } from './assistant.mock'
import './assistant.css'

export function AssistantPage() {
  const { scenario } = useStudentScenario()
  const [draft, setDraft] = useState('')
  const [preview, setPreview] = useState('')
  const sources = getChatSources(scenario)
  const conversation = getOwnConversations().find((item) => item.classroomId === 'class-11a2-2026')!
  return <div className="page-content sa-assistant"><header className="page-heading"><div><h1>Trợ lý học tập AI</h1><p>Một cuộc trò chuyện cho các môn học của lớp hiện tại.</p></div><Link to={`../chat-history${scenario === 'current' ? '' : `?scenario=${scenario}`}`}>Lịch sử của tôi</Link></header>
    <StudentScenarioControl /><p className="sc-preview">Hội thoại AI mẫu · Chưa kết nối API. Không có tin nhắn nào được gửi.</p>
    {sources.length ? <><div className="sc-scope"><MessageCircle size={20} aria-hidden="true" /><div><strong>11A2 · Lịch sử và Toán</strong><p>Bạn có thể chuyển môn ngay trong cuộc trò chuyện. Nguồn chỉ gồm học liệu đã xử lý và công bố của lớp hiện tại.</p></div></div>
      <ol className="sc-messages" aria-label="Hội thoại minh họa">{conversation.messages.map((message) => { const source = sources.find((item) => item.id === message.sourceLessonId); return <li key={message.id} className={`sc-message ${message.role}`}><strong>{message.role === 'student' ? 'Bạn · tin nhắn mẫu' : 'Trợ lý · phản hồi mẫu'}</strong><p>{message.text}</p>{source && <a href={`#chat-source-${source.materialId}`}>{source.subject} · {source.material} · v{source.version} · {source.position}</a>}</li> })}</ol>
      <form className="sc-composer" onSubmit={(event) => { event.preventDefault(); if (draft.trim()) setPreview(draft.trim()) }}><label htmlFor="student-chat-draft">Soạn câu hỏi xem trước</label><textarea id="student-chat-draft" value={draft} maxLength={2000} rows={3} onChange={(event) => { setDraft(event.target.value); setPreview('') }} placeholder="Bạn muốn hiểu rõ phần nào trong bài học?" /><div><button type="submit" disabled={!draft.trim()}>Xem bản nháp cục bộ</button><button type="button" disabled>Gửi · chờ kết nối API</button></div><p>Chỉ hiển thị bản nháp tại máy, không thêm vào hội thoại hay tạo câu trả lời AI.</p>{preview && <div className="sc-draft" role="status"><strong>Bản nháp chưa gửi</strong><p>{preview}</p></div>}</form>
      <section className="sc-sources"><h2>Nguồn minh họa được phép</h2>{sources.map((source) => <details id={`chat-source-${source.materialId}`} key={source.id} open><summary>{source.subject} · {source.material} · v{source.version} · {source.position}</summary><blockquote>{source.excerpt}</blockquote><p>Trích đoạn học liệu mẫu, không phải tệp đã tải từ hệ thống.</p></details>)}</section></> : <section className="panel sc-empty"><h2>Chưa có học liệu cho cuộc trò chuyện mới</h2><p>{scenario === 'unassigned' ? 'Bạn chưa có lớp hiện tại. Nguồn hỏi đáp sẽ có sau khi được xếp lớp.' : 'Lớp cũ chỉ cho xem lịch sử; không nhận câu hỏi mới.'}</p><Link to={`../chat-history?scenario=${scenario}`}>Xem hội thoại đã lưu của tôi</Link></section>}
  </div>
}
