import { useState } from 'react'
import { StudentScenarioControl } from '../ScenarioControl'
import { getOwnConversations } from './assistant.mock'
import { summaryLessons } from '../summary/summary.mock'
import './assistant.css'

export function ChatHistoryPage() {
  const own = getOwnConversations()
  const [selectedId, setSelectedId] = useState(own[0]?.id ?? '')
  const selected = own.find((item) => item.id === selectedId)
  return <div className="page-content sa-assistant"><header className="page-heading"><div><h1>Lịch sử hỏi đáp</h1><p>Các cuộc trò chuyện đã lưu của chính bạn.</p></div></header><StudentScenarioControl /><p className="sc-preview">Dữ liệu mẫu của Phúc · Mở lại ở chế độ chỉ đọc. Nội dung không được chia sẻ nguyên văn cho giáo viên.</p>
    <div className="sc-history"><nav className="sc-conversations" aria-label="Cuộc trò chuyện của tôi">{own.map((conversation) => <button type="button" key={conversation.id} aria-pressed={selectedId === conversation.id} onClick={() => setSelectedId(conversation.id)}><strong>{conversation.title}</strong><span>{conversation.subjects.join(' · ')}</span><small>{conversation.updatedAt}</small>{conversation.classroomId !== 'class-11a2-2026' && <span>Lớp cũ · chỉ đọc</span>}</button>)}</nav>
      <section className="panel sc-history-detail" aria-label="Nội dung đã lưu">{selected ? <><h2>{selected.title}</h2><p className="sc-muted">Hội thoại minh họa đã lưu · không nhận thêm tin nhắn tại đây.</p><ol className="sc-messages">{selected.messages.map((message) => { const source = selected.classroomId === 'class-11a2-2026' ? summaryLessons.find((item) => item.id === message.sourceLessonId && item.processed && item.published) : undefined; return <li className={`sc-message ${message.role}`} key={message.id}><strong>{message.role === 'student' ? 'Bạn · mẫu' : 'Trợ lý · mẫu'}</strong><p>{message.text}</p>{source && <details><summary>{source.material} · v{source.version} · {source.position}</summary><blockquote>{source.excerpt}</blockquote></details>}</li> })}</ol></> : <p>Chưa có hội thoại của bạn.</p>}</section></div>
  </div>
}
