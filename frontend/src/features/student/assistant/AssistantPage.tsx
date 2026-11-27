import { useState, type FormEvent } from 'react'
import { BookOpen, History, MessageCircle, Send } from 'lucide-react'
import { useSearchParams } from 'react-router'
import type { StudentConversation, StudentWorkspace } from '../../../api/client'
import { studentApi } from '../../../api/client'
import { useApiData } from '../../../api/useApiData'
import { StudentScenarioControl } from '../ScenarioControl'
import { useStudentScenario } from '../useStudentScenario'
import './assistant.css'

export function AssistantPage() {
  const { scenario } = useStudentScenario()
  const [params, setParams] = useSearchParams()
  const [draft, setDraft] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [notice, setNotice] = useState('')
  const [sending, setSending] = useState(false)
  const { data: workspace, loading: workspaceLoading, error: workspaceError } = useApiData<StudentWorkspace>('/student/workspace')
  const { data: conversations, loading, error } = useApiData<StudentConversation[]>(`/student/conversations?refresh=${refresh}`)
  const requestedClassHistory = params.get('class') === 'history' || scenario === 'history-only'
  const visible = (conversations ?? []).filter((conversation) => requestedClassHistory
    ? workspace?.history.some((membership) => membership.classroom.id === conversation.classroom_id)
    : true)
  const selectedId = params.get('conversation')
  const selected = visible.find((conversation) => conversation.id === selectedId)
    ?? visible.find((conversation) => conversation.classroom_id === workspace?.current?.classroom.id)
    ?? visible[0]
  const isCurrentConversation = Boolean(selected && selected.classroom_id === workspace?.current?.classroom.id)
  const requestedSubject = workspace?.current?.subjects.find((subject) => subject.id === params.get('subject'))
    ?? workspace?.history.flatMap((membership) => membership.subjects).find((subject) => subject.id === params.get('subject'))
  const contextMatches = !requestedSubject || requestedSubject.id && selected?.classroom_id === (workspace?.current?.subjects.some((subject) => subject.id === requestedSubject.id) ? workspace.current?.classroom.id : workspace?.history.find((membership) => membership.subjects.some((subject) => subject.id === requestedSubject.id))?.classroom.id)

  function selectConversation(id: string) {
    const updated = new URLSearchParams(params)
    updated.delete('view')
    updated.set('conversation', id)
    setParams(updated)
    setDraft('')
    setNotice('')
  }

  async function createConversation() {
    if (!workspace?.current) return
    setNotice('')
    try {
      const conversation = await studentApi.createConversation(workspace.current.classroom.id)
      setRefresh((value) => value + 1)
      const updated = new URLSearchParams(params)
      updated.delete('class')
      updated.delete('view')
      updated.set('conversation', conversation.id)
      setParams(updated)
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : 'Không tạo được cuộc trò chuyện.')
    }
  }

  async function sendQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selected || !isCurrentConversation || !draft.trim()) return
    setSending(true)
    setNotice('')
    try {
      const result = await studentApi.sendChatTurn(selected.id, draft.trim(), requestedSubject?.id)
      setNotice(result.message)
      setDraft('')
      setRefresh((value) => value + 1)
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : 'Không gửi được câu hỏi. Nội dung vẫn còn trong ô nhập.')
    } finally {
      setSending(false)
    }
  }

  if (workspaceLoading || loading) return <div className="page-content student-page"><p role="status">Đang tải hội thoại…</p></div>
  if (workspaceError || error) return <div className="page-content student-page"><section className="panel student-empty" role="alert"><h2>Không tải được hội thoại</h2><p>{workspaceError || error}</p></section></div>
  if (!workspace) return null

  return <div className="page-content student-page sa-assistant">
    <header className="page-heading assistant-heading"><div><span className="eyebrow"><span className="eyebrow-line" />TRỢ LÝ HỌC TẬP</span><h1>Trợ lý AI & lịch sử hỏi đáp</h1><p>Hội thoại và câu hỏi được lưu theo tài khoản của em.</p></div><StudentScenarioControl /></header>
    {requestedSubject && <p className="student-notice">Ngữ cảnh đang mở: {requestedSubject.name}. Chỉ học liệu đã công bố và xử lý thành công mới được dùng làm bằng chứng.</p>}
    <div className="assistant-workspace">
      <aside className="panel assistant-conversation-list"><div className="assistant-list-title"><History size={18} /><div><strong>Cuộc trò chuyện</strong><small>Chỉ hiển thị hội thoại của em</small></div><button type="button" className="student-action secondary" onClick={createConversation} disabled={!workspace.current}>Cuộc trò chuyện mới</button></div>
        {visible.length ? visible.map((conversation) => {
          const firstQuestion = conversation.turns.flatMap((turn) => turn.messages).find((message) => message.role === 'USER')?.content
          return <button type="button" key={conversation.id} aria-pressed={selected?.id === conversation.id} onClick={() => selectConversation(conversation.id)}><strong>{firstQuestion?.slice(0, 52) || 'Cuộc trò chuyện mới'}</strong><span>{conversation.classroom.name}</span><small>{new Date(conversation.updated_at).toLocaleString('vi-VN')}</small></button>
        }) : <p className="student-muted">Chưa có cuộc trò chuyện đã lưu.</p>}
      </aside>
      {!selected ? <section className="panel sc-empty"><MessageCircle size={28} /><h2>Chưa có cuộc trò chuyện</h2><p>{workspace.current ? 'Tạo cuộc trò chuyện mới để lưu câu hỏi trong lớp hiện tại.' : 'Em chưa có lớp hiện tại để bắt đầu hội thoại mới.'}</p></section> : <section className="panel assistant-chat-panel"><div className="assistant-chat-head"><span className="assistant-avatar"><MessageCircle size={18} /></span><div><strong>{selected.classroom.name}</strong><small>{isCurrentConversation ? 'Lớp hiện tại' : 'Hội thoại lớp cũ · chỉ đọc'}</small></div><span className={`student-badge ${isCurrentConversation ? '' : 'muted'}`}>{isCurrentConversation ? 'Tài khoản của em' : 'Đã lưu'}</span></div>
        <ol className="sc-messages" aria-label="Nội dung cuộc trò chuyện">{selected.turns.flatMap((turn) => turn.messages.map((message) => <li key={message.id} className={`sc-message ${message.role === 'USER' ? 'student' : 'assistant'}`}><strong>{message.role === 'USER' ? 'Em' : 'Trợ lý EduCraft'}</strong><p>{message.content}</p>{message.citations.map((citation) => <a key={citation.segment.id} href={`#chat-source-${citation.segment.id}`}>Nguồn học liệu · {citation.segment.position_label}</a>)}</li>))}</ol>
        {isCurrentConversation ? <form className="sc-composer" onSubmit={sendQuestion}><label htmlFor="student-chat-draft">Câu hỏi cho trợ lý học tập</label><textarea id="student-chat-draft" value={draft} maxLength={2000} rows={3} onChange={(event) => setDraft(event.target.value)} placeholder="Hỏi về nội dung trong học liệu đã công bố..." /><div><button type="submit" disabled={!draft.trim() || sending}><Send size={15} /> {sending ? 'Đang lưu câu hỏi…' : 'Gửi câu hỏi'}</button></div><p>Câu hỏi sẽ được lưu. Nếu chưa có nguồn phù hợp hoặc dịch vụ AI chưa cấu hình, hệ thống sẽ báo rõ trạng thái.</p></form> : <p className="student-notice">Hội thoại lớp đã học chỉ để xem lại, không nhận thêm câu hỏi.</p>}
        {notice && <p className="student-notice" role="status">{notice}</p>}
        {selected.turns.some((turn) => turn.messages.some((message) => message.role === 'ASSISTANT' && message.content.includes('Chưa đủ bằng chứng'))) && <p className="student-notice">Trợ lý không tự tạo câu trả lời khi học liệu không có bằng chứng hỗ trợ.</p>}
        {selected.turns.flatMap((turn) => turn.messages.flatMap((message) => message.citations.map((citation) => ({ message, citation })))).length > 0 && <section className="sc-sources"><h2><BookOpen size={17} /> Nguồn được dẫn trong hội thoại</h2>{selected.turns.flatMap((turn) => turn.messages.flatMap((message) => message.citations.map((citation) => ({ message, citation })))).map(({ citation }) => <details id={`chat-source-${citation.segment.id}`} key={citation.segment.id}><summary>{citation.segment.position_label}</summary><blockquote>Đoạn học liệu được dùng làm nguồn cho câu trả lời.</blockquote></details>)}</section>}
      </section>}
    </div>
    {!contextMatches && <p className="student-notice">Ngữ cảnh môn học không khớp với lớp của hội thoại đã chọn.</p>}
  </div>
}
