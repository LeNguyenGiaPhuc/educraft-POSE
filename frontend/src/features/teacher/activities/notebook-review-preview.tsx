import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../../../index.css'
import '../../../design-system/foundation.css'
import './activities.css'
import { NotebookSubmissionReviewPanel } from './NotebookSubmissionReviewPanel'

const fixture = {
  id: 'fixture-submission',
  student_id: 'fixture-student',
  student: { full_name: 'Nguyễn Minh An', username: 'minhan' },
  submitted_at: '2026-11-25T08:30:00.000Z',
  updated_at: '2026-11-25T08:30:00.000Z',
  status: 'LOCKED',
  processing_status: 'PROCESSED',
  files: [
    { id: 'fixture-file-1', mime_type: 'image/jpeg', byte_size: 820000, sort_order: 1 },
    { id: 'fixture-file-2', mime_type: 'image/png', byte_size: 640000, sort_order: 2 },
  ],
  assessment: null,
  period: {
    id: 'fixture-period',
    period_no: 2,
    activity: {
      criteria: [
        { id: 'criterion-1', content: 'Ghi đầy đủ các mốc chính của bài học', order_index: 0 },
        { id: 'criterion-2', content: 'Trình bày sạch sẽ, dễ đọc và có tiêu đề', order_index: 1 },
      ],
    },
  },
  aiDraft: {
    ocr_text: 'Bản chép thử nghiệm dùng cho kiểm tra bố cục phát triển.',
    generated_at: '2026-11-25T08:35:00.000Z',
    suggestions: [
      { criterion_id: 'criterion-1', status: 'RECORDED', note: 'Có đủ ba mốc chính.', evidence: 'Quan sát thấy các mốc 1986, 1995 và 2007.' },
      { criterion_id: 'criterion-2', status: 'NEEDS_SUPPLEMENTATION', note: 'Tiêu đề còn thiếu.', evidence: 'Trang đầu chưa có tiêu đề bài học.' },
    ],
  },
}

const previewImage = `
  <svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200" viewBox="0 0 900 1200">
    <rect width="900" height="1200" fill="#f5f2eb"/>
    <path d="M120 160h660M120 260h660M120 360h660M120 460h660M120 560h660M120 660h660M120 760h660M120 860h660M120 960h660" stroke="#c9c4bb" stroke-width="4"/>
    <path d="M190 210c120 30 245 12 360 8M190 310c140 24 280 18 430 2M190 410c110 18 240 12 380 0" fill="none" stroke="#29264f" stroke-linecap="round" stroke-width="18"/>
    <circle cx="120" cy="210" r="18" fill="#5d52c9"/>
    <circle cx="120" cy="310" r="18" fill="#86b879"/>
    <circle cx="120" cy="410" r="18" fill="#f2cc59"/>
    <text x="120" y="1100" fill="#706c82" font-family="sans-serif" font-size="32">Development fixture · ảnh vở mô phỏng</text>
  </svg>
`

globalThis.fetch = async (input) => {
  if (String(input).includes('/download')) {
    return new Response(previewImage, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Content-Disposition': 'attachment; filename="notebook-fixture.svg"',
      },
    })
  }

  return new Response(JSON.stringify({ data: fixture }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

export function Preview() {
  return (
    <main className="role-teacher page-content ta-page tn-review-preview">
      <p className="tn-review-preview-label">Development fixture · Review Desk · dữ liệu mô phỏng</p>
      <NotebookSubmissionReviewPanel submissionId="fixture-submission" readOnly={false} />
    </main>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Preview />
  </StrictMode>,
)
