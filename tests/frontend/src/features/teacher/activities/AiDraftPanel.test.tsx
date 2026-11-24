import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { AiDraftPanel } from '../../../../../../frontend/src/features/teacher/activities/AiDraftPanel'

describe('AiDraftPanel', () => {
  it('renders prompt controls and ready state', () => {
    const html = renderToStaticMarkup(<AiDraftPanel
      instructions="Tập trung mốc thời gian"
      questionCount={4}
      isGenerating={false}
      result={{ status: 'READY', questions: [{ prompt: 'Câu hỏi', explanation: 'Giải thích', maxPoints: 1, lessonId: 'lesson-1', citations: [] }] }}
      onInstructionsChange={vi.fn()}
      onQuestionCountChange={vi.fn()}
      onGenerate={vi.fn()}
    />)

    expect(html).toContain('Yêu cầu cho AI')
    expect(html).toContain('Tập trung mốc thời gian')
    expect(html).toContain('Đã tạo 1 câu')
    expect(html).toContain('Tạo bản nháp')
  })

  it('renders a manual fallback message when generation fails', () => {
    const html = renderToStaticMarkup(<AiDraftPanel
      instructions=""
      questionCount={5}
      isGenerating={false}
      result={{ status: 'FAILED', message: 'Nguồn chưa đủ', questions: [] }}
      onInstructionsChange={vi.fn()}
      onQuestionCountChange={vi.fn()}
      onGenerate={vi.fn()}
    />)

    expect(html).toContain('Nguồn chưa đủ')
    expect(html).toContain('nhập câu hỏi thủ công')
  })
})
