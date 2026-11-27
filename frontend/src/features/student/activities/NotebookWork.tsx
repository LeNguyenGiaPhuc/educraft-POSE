import { useState, type ChangeEvent } from 'react'
import type { StudentActivity } from '../../../api/client'
import { studentApi } from '../../../api/client'

type NotebookSubmission = NonNullable<NonNullable<StudentActivity['notebookCheck']>['periods'][number]['submissions'][number]>

export function NotebookWork({ readOnly, activity }: { readOnly: boolean; activity: StudentActivity }) {
  const notebook = activity.notebookCheck
  const period = notebook?.periods[0]
  const [submission, setSubmission] = useState<NotebookSubmission | null>(period?.submissions[0] ?? null)
  const [files, setFiles] = useState<File[]>([])
  const [mode, setMode] = useState<'append' | 'replace'>('append')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [now] = useState(() => Date.now())
  const periodOpen = Boolean(period && !period.closed_at && Date.parse(period.due_at) > now && activity.status === 'PUBLISHED')
  const editable = !readOnly && periodOpen && (!submission || submission.status === 'CURRENT')
  const criteria = notebook?.criteria ?? []

  function selectFiles(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? [])
    event.currentTarget.value = ''
    if (selected.some((file) => !['image/jpeg', 'image/png'].includes(file.type))) {
      setMessage('Chỉ chọn ảnh JPEG hoặc PNG.')
      return
    }
    setFiles(selected)
    setMessage('')
  }

  async function saveImages() {
    if (!files.length) {
      setMessage('Chọn ảnh trước khi lưu bài nộp.')
      return
    }
    setLoading(true)
    setMessage('')
    try {
      const saved = await studentApi.saveNotebookImages(activity.id, files, submission && mode === 'append' ? 'append' : 'replace')
      const refreshed = await studentApi.activities()
      const updatedActivity = refreshed.find((item) => item.id === activity.id)
      const updatedSubmission = updatedActivity?.notebookCheck?.periods[0]?.submissions[0]
      setSubmission(updatedSubmission ?? null)
      setFiles([])
      setMessage(`Ảnh đã được lưu vào bài nộp (${saved.files.length} ảnh).`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể lưu ảnh. Hãy thử lại.')
    } finally {
      setLoading(false)
    }
  }

  async function deleteSubmission() {
    if (!submission) return
    setLoading(true)
    setMessage('')
    try {
      await studentApi.deleteNotebookSubmission(submission.id)
      setSubmission(null)
      setFiles([])
      setMessage('Bài nộp hiện tại đã được xóa khỏi hệ thống.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể xóa bài nộp.')
    } finally {
      setLoading(false)
    }
  }

  return <section className="panel sa-work">
    <h2>{activity.title}</h2>
    <p>Giáo viên chỉ hiển thị kết quả theo từng tiêu chí sau khi chốt; kiểm tra vở không có điểm tổng.</p>
    <div className="student-notice"><strong>Thời hạn:</strong> {period ? new Date(period.due_at).toLocaleString('vi-VN') : 'Chưa mở kỳ nộp'}<br /><strong>Tiêu chí đã chốt:</strong>{criteria.length ? <ul>{criteria.map((criterion) => <li key={criterion.id}>{criterion.content}</li>)}</ul> : ' Chưa có tiêu chí.'}</div>
    {readOnly && <p className="student-notice">Lớp đã học chỉ được xem lại. Không thể nộp hoặc sửa ảnh.</p>}
    {!periodOpen && <p className="student-notice">Kỳ nộp đã đóng hoặc hết hạn. Bài nộp hiện tại chỉ xem được.</p>}
    {submission && <><div className="sa-image-list"><h3>{submission.status === 'CURRENT' ? 'Bài nộp hiện tại' : 'Bài nộp đã khóa'}</h3><p>Đã nộp {new Date(submission.submitted_at).toLocaleString('vi-VN')} · {submission.status}</p><ul>{submission.files.map((file) => <li key={file.id}><a href={`/api/v1/student/notebook-submissions/${submission.id}/files/${file.id}`} target="_blank" rel="noreferrer">Ảnh {file.sort_order + 1} · {file.mime_type}</a></li>)}</ul></div>{submission.assessment && <section className="student-notice"><strong>Giáo viên đã chốt kết quả</strong><ul>{submission.assessment.results.map((result) => <li key={result.criterion.content}>{result.criterion.content}: {result.status}{result.note ? ` · ${result.note}` : ''}</li>)}</ul></section>}</>}
    {!submission && <p className="student-notice">Chưa có bài nộp trong kỳ này.</p>}
    {editable && <div className="student-stack"><label className="student-field">{submission ? 'Chọn ảnh để thêm hoặc thay ảnh hiện tại' : 'Chọn ảnh vở'}<input type="file" accept="image/jpeg,image/png" multiple onChange={selectFiles} /></label>{submission && <label className="student-field">Thao tác<select value={mode} onChange={(event) => setMode(event.target.value as 'append' | 'replace')}><option value="append">Thêm ảnh vào bài hiện tại</option><option value="replace">Thay toàn bộ ảnh hiện tại</option></select></label>}{files.length > 0 && <p>{files.length} ảnh sẽ được {submission && mode === 'append' ? 'thêm vào' : 'dùng để thay thế'} trong hệ thống.</p>}<div className="student-toolbar"><button type="button" className="student-action" onClick={saveImages} disabled={loading || !files.length}>{loading ? 'Đang lưu…' : 'Lưu bài nộp'}</button>{submission && <button type="button" className="student-action secondary" onClick={deleteSubmission} disabled={loading}>Xóa bài nộp hiện tại</button>}</div><p className="student-muted">Ảnh được tải lên kho lưu trữ riêng tư của hệ thống.</p></div>}
    {message && <p className="student-notice" role="status">{message}</p>}
  </section>
}
