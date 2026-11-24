import type { TeacherAiDraftResult } from '../../../lib/api/teacher/activities'

type Props = {
  instructions: string
  questionCount: number
  isGenerating: boolean
  result: TeacherAiDraftResult | null
  onInstructionsChange: (value: string) => void
  onQuestionCountChange: (value: number) => void
  onGenerate: () => void
}

export function AiDraftPanel({ instructions, questionCount, isGenerating, result, onInstructionsChange, onQuestionCountChange, onGenerate }: Props) {
  return (
    <section className="ta-ai-panel" aria-label="Tạo bản nháp bằng AI">
      <div>
        <strong>Tạo bản nháp bằng Gemini</strong>
        <p>AI chỉ tạo gợi ý từ các bài học đã công bố. Giáo viên phải đọc và chỉnh sửa trước khi công bố.</p>
      </div>
      <label>Yêu cầu cho AI
        <textarea value={instructions} maxLength={1000} rows={3} onChange={(event) => onInstructionsChange(event.target.value)} placeholder="Ví dụ: Tập trung vào các mốc thời gian quan trọng" />
      </label>
      <label>Số câu
        <input type="number" min={1} max={20} value={questionCount} onChange={(event) => onQuestionCountChange(event.target.valueAsNumber || 1)} />
      </label>
      <button type="button" className="ta-secondary" onClick={onGenerate} disabled={isGenerating}>{isGenerating ? 'Đang tạo...' : 'Tạo bản nháp'}</button>
      {result?.status === 'READY' && <p className="ta-success" role="status">Đã tạo {result.questions.length} câu. Hãy kiểm tra nội dung bên dưới.</p>}
      {result?.status !== 'READY' && result?.message && <p className="ta-error" role="alert">{result.message} Bạn có thể nhập câu hỏi thủ công.</p>}
    </section>
  )
}
