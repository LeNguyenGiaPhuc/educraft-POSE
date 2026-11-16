import { useState } from 'react'
import { BookOpen, History, MessageCircle, Send } from 'lucide-react'
import { useSearchParams } from 'react-router'
import { StudentScenarioControl } from '../ScenarioControl'
import { useStudentScenario } from '../useStudentScenario'
import { studentSubjects } from '../fixtures'
import { getChatSources, getOwnConversations, type ConversationPreview } from './assistant.mock'
import './assistant.css'

export function AssistantPage() {
  const { scenario } = useStudentScenario()
  const [params, setParams] = useSearchParams()
  const [draft, setDraft] = useState('')
  const [preview, setPreview] = useState('')
  const [own, setOwn] = useState<ConversationPreview[]>(getOwnConversations)
  const historicScope = scenario === 'history-only' || params.get('class') === 'history'
  const current = scenario === 'current' && !historicScope ? own.filter((item) => item.classroomId === 'class-11a2-2026') : []
  const historic = scenario === 'unassigned' ? [] : own.filter((item) => item.classroomId === 'class-10a1-2025')
  const visible = [...current, ...historic]
  const requestedId = params.get('conversation')
  const wantsHistory = params.get('view') === 'history' || params.get('class') === 'history'
  const defaultConversation = wantsHistory ? historic[0] : current[0] ?? historic[0]
  const selected = visible.find((item) => item.id === requestedId) ?? defaultConversation
  const isCurrentConversation = selected?.classroomId === 'class-11a2-2026'
  const requestedSubject = studentSubjects.find((subject) => subject.id === params.get('subject'))
  const requestedLessonId = params.get('lesson')
  const allSources = isCurrentConversation ? getChatSources('current') : getChatSources('history-only')
  const contextMatchesConversation = !requestedSubject || requestedSubject.classroomId === selected?.classroomId
  const sources = contextMatchesConversation ? allSources.filter((source) =>
    (!requestedSubject || source.subjectId === requestedSubject.id)
      && (!requestedLessonId || source.id === requestedLessonId),
  ) : []

  function selectConversation(id: string) {
    const updated = new URLSearchParams(params)
    updated.delete('view')
    updated.set('conversation', id)
    setParams(updated)
    setDraft('')
    setPreview('')
  }

  function createConversation() {
    if (scenario !== 'current' || historicScope) return
    const id = `chat-new-${own.length + 1}`
    const conversation: ConversationPreview = {
      id,
      studentId: 'phuc',
      classroomId: 'class-11a2-2026',
      title: 'Cuộc trò chuyện mới',
      updatedAt: 'Vừa tạo',
      subjects: requestedSubject && contextMatchesConversation ? [requestedSubject.name] : ['Lớp 11A2'],
      messages: [],
    }
    setOwn((items) => [...items, conversation])
    const updated = new URLSearchParams(params)
    updated.delete('view')
    updated.set('conversation', id)
    setParams(updated)
    setDraft('')
    setPreview('')
  }

  return <div className="page-content student-page sa-assistant">
    <header className="page-heading assistant-heading"><div><span className="eyebrow"><span className="eyebrow-line" />TRỢ LÝ HỌC TẬP</span><h1>Trợ lý AI & lịch sử hỏi đáp</h1><p>Hỏi theo học liệu của lớp và mở lại những cuộc trò chuyện của riêng em.</p></div><StudentScenarioControl /></header>
    <p className="sc-preview">Bản xem trước dùng hội thoại dựng sẵn, chưa gọi AI thật và không gửi tin nhắn ra ngoài.</p>
    {requestedSubject && <p className="student-notice">Ngữ cảnh đang mở: {requestedSubject.name}{requestedLessonId ? ` · ${allSources.find((source) => source.id === requestedLessonId)?.title ?? 'bài học chưa có nguồn xử lý thành công'}` : ''}. Chỉ học liệu đã công bố và xử lý thành công mới có thể làm nguồn.</p>}
    {!selected ? <section className="panel sc-empty"><MessageCircle size={28} /><h2>Chưa có cuộc trò chuyện</h2><p>{scenario === 'unassigned' ? 'Em chưa có lớp hiện tại nên chưa có nguồn để hỏi trợ lý.' : 'Chưa có hội thoại đã lưu trong phạm vi này.'}</p></section> : <div className="assistant-workspace">
      <aside className="panel assistant-conversation-list"><div className="assistant-list-title"><History size={18} /><div><strong>Cuộc trò chuyện</strong><small>Chỉ hiển thị dữ liệu của em</small></div><button type="button" className="student-action secondary" onClick={createConversation} disabled={scenario !== 'current' || historicScope}>Cuộc trò chuyện mới</button></div>{current.length > 0 && <section><h2>Lớp hiện tại · 11A2</h2>{current.map((conversation) => <button type="button" key={conversation.id} aria-pressed={selected.id === conversation.id} onClick={() => selectConversation(conversation.id)}><strong>{conversation.title}</strong><span>{conversation.subjects.join(' · ')}</span><small>{conversation.updatedAt}</small></button>)}</section>}{historic.length > 0 && <section><h2>Lớp đã học · chỉ đọc</h2>{historic.map((conversation) => <button type="button" key={conversation.id} aria-pressed={selected.id === conversation.id} onClick={() => selectConversation(conversation.id)}><strong>{conversation.title}</strong><span>{conversation.subjects.join(' · ')}</span><small>{conversation.updatedAt}</small></button>)}</section>}</aside>
      <section className="panel assistant-chat-panel"><div className="assistant-chat-head"><span className="assistant-avatar"><MessageCircle size={18} /></span><div><strong>{selected.title}</strong><small>{isCurrentConversation ? 'Có thể hỏi về các môn trong lớp 11A2' : 'Hội thoại lớp cũ · chỉ đọc'}</small></div><span className={`student-badge ${isCurrentConversation ? '' : 'muted'}`}>{isCurrentConversation ? 'Mô phỏng' : 'Đã lưu'}</span></div>
        <ol className="sc-messages" aria-label="Nội dung cuộc trò chuyện">{selected.messages.map((message) => { const source = allSources.find((item) => item.id === message.sourceLessonId); return <li key={message.id} className={`sc-message ${message.role}`}><strong>{message.role === 'student' ? 'Em' : 'Trợ lý EduCraft'}</strong><p>{message.text}</p>{source && <a href={`#chat-source-${source.materialId}`}>Nguồn: {source.subject} · {source.material} · {source.position}</a>}</li> })}</ol>
        {isCurrentConversation ? <form className="sc-composer" onSubmit={(event) => { event.preventDefault(); if (draft.trim()) setPreview(draft.trim()) }}><label htmlFor="student-chat-draft">Câu hỏi cho trợ lý học tập</label><textarea id="student-chat-draft" value={draft} maxLength={2000} rows={3} onChange={(event) => { setDraft(event.target.value); setPreview('') }} placeholder="Hỏi về nội dung trong học liệu đã công bố..." /><div><button type="submit" disabled={!draft.trim()}><Send size={15} /> Xem bản nháp cục bộ</button><button type="button" disabled>Gửi · chờ kết nối API</button></div>{preview && <div className="sc-draft" role="status"><strong>Bản nháp chưa gửi</strong><p>{preview}</p></div>}</form> : <p className="student-notice">Hội thoại lớp đã học chỉ để xem lại, không nhận thêm câu hỏi.</p>}
        {requestedSubject && requestedLessonId && !sources.length && <p className="student-notice">Chưa đủ bằng chứng từ học liệu đã xử lý của bài được chọn. Trợ lý không tạo câu trả lời khi thiếu nguồn.</p>}
        {allSources.length > 0 && <section className="sc-sources"><h2><BookOpen size={17} /> Nguồn minh họa được phép</h2>{allSources.map((source) => <details id={`chat-source-${source.materialId}`} key={source.id}><summary>{source.subject} · {source.material} · v{source.version} · {source.position}</summary><blockquote>{source.excerpt}</blockquote></details>)}</section>}
      </section>
    </div>}
  </div>
}
