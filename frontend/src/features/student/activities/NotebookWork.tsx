import { useState, type ChangeEvent } from 'react'
import { notebookActivity } from './activities.mock'

type Period = 'OPEN' | 'CLOSED' | 'REOPENED'

export function NotebookWork({ readOnly }: { readOnly: boolean }) {
  const [period, setPeriod] = useState<Period>('OPEN')
  const [images, setImages] = useState<string[]>(notebookActivity.existingImages)
  const [message, setMessage] = useState('')
  const [qualityExample, setQualityExample] = useState(false)
  const editable = !readOnly && period !== 'CLOSED'
  const currentImages = images

  function changePeriod(next: Period) {
    setPeriod(next)
    setImages(next === 'REOPENED' ? [] : notebookActivity.existingImages)
    setMessage('')
    setQualityExample(false)
  }

  function selectImages(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    event.currentTarget.value = ''
    if (!files.length) return
    if (files.some((file) => !['image/jpeg', 'image/png'].includes(file.type) || !/\.(jpe?g|png)$/i.test(file.name))) {
      setMessage('Chỉ chọn ảnh JPEG hoặc PNG rõ nội dung. Hãy chọn lại tệp.')
      return
    }
    setImages(files.map((file) => file.name))
    setMessage('Đã thay ảnh trong bản xem trước trên máy. Chưa tải ảnh hoặc sửa bài nộp thật.')
  }

  function previewSubmission() {
    setMessage(currentImages.length ? 'Đã đủ ảnh để xem trước. Chưa nộp bài; cần kết nối API để lưu và kiểm tra chất lượng ảnh.' : 'Cần ít nhất một ảnh trước khi nộp bài kiểm tra vở.')
  }

  return <section className="panel sa-work"><h2>{notebookActivity.title}</h2>
    <p>Giáo viên sẽ đối chiếu ảnh vở với từng tiêu chí nội dung. Kết quả chỉ xuất hiện sau khi giáo viên chốt.</p>
    <div className="student-toolbar"><label>Tình huống mẫu<select value={period} onChange={(event) => changePeriod(event.target.value as Period)}><option value="OPEN">Đang mở · sửa bài hiện tại</option><option value="CLOSED">Đã đóng · khóa bài</option><option value="REOPENED">Mở lại · nộp bài mới</option></select></label></div>
    {readOnly && <p className="student-notice">Lớp đã học chỉ được xem lại. Bạn không thể nộp hoặc sửa bài.</p>}
    {period === 'CLOSED' && <p className="student-notice">Bài gần nhất đã khóa để AI phân tích và giáo viên xem lại. Không thể thay hoặc xóa ảnh lúc này.</p>}
    {period === 'REOPENED' && <p className="student-notice">Giáo viên đã mở lại thời gian nộp. Đây là bài hiện tại mới; kết quả đã chốt trước đó vẫn được giữ.</p>}
    <div className="sa-image-list"><h3>Ảnh của bài hiện tại</h3>{currentImages.length ? <ul>{currentImages.map((name, index) => <li key={`${name}-${index}`}>{index + 1}. {name}</li>)}</ul> : <p>Chưa chọn ảnh nào.</p>}</div>
    {editable && <div className="student-stack"><label className="student-field">Thay ảnh bài hiện tại<input type="file" accept="image/jpeg,image/png" multiple onChange={selectImages} /></label><div className="student-toolbar"><button type="button" className="student-action secondary" onClick={() => { setImages([]); setMessage('Ảnh đã được xóa khỏi bản xem trước, chưa xóa bài nộp thật.') }}>Xóa ảnh hiện tại</button><button type="button" className="student-action secondary" onClick={() => setQualityExample((value) => !value)}>Xem ví dụ ảnh chưa đạt</button></div>{qualityExample && <p className="student-notice">Ví dụ cảnh báo: ảnh bị mờ, thiếu sáng, nghiêng nhiều hoặc bị cắt mất mép trang. Bạn nên chụp lại trước khi nộp. Chưa có phân tích ảnh thật.</p>}<div className="student-toolbar"><button type="button" className="student-action" onClick={previewSubmission}>Kiểm tra trước khi nộp</button><button type="button" disabled title="Cần kết nối API để lưu ảnh">Nộp ảnh · chưa kết nối</button></div></div>}
    {message && <p className="student-notice" role="status">{message}</p>}
    <div className="sa-history"><h3>Lịch sử đã chốt</h3><p>{notebookActivity.previousFinalized.date} · {notebookActivity.previousFinalized.teacher}</p><p>{notebookActivity.previousFinalized.summary}. Xem từng tiêu chí trong mục Kết quả.</p></div>
  </section>
}
