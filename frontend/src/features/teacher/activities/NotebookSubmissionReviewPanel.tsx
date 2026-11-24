import { useCallback, useEffect, useMemo, useState } from 'react'
import { FileImage, RotateCcw, Sparkles } from 'lucide-react'
import { ApiError } from '../../../lib/api/client'
import {
  teacherNotebookChecksApi,
  type TeacherCriterionStatus,
  type TeacherNotebookSubmissionReview,
} from '../../../lib/api/teacher/notebookChecks'

type Props = {
  submissionId: string
  readOnly: boolean
  onFinalized?: () => void
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  return 'Không thể hoàn tất thao tác. Hãy thử lại.'
}

function statusLabel(status: TeacherCriterionStatus): string {
  if (status === 'RECORDED') return 'Đã ghi nhận'
  if (status === 'NEEDS_SUPPLEMENTATION') return 'Cần bổ sung'
  return 'Chưa xác định'
}

export function NotebookSubmissionReviewPanel({ submissionId, readOnly, onFinalized }: Props) {
  const [review, setReview] = useState<TeacherNotebookSubmissionReview | null>(null)
  const [results, setResults] = useState<Record<string, { status: TeacherCriterionStatus; note: string }>>({})
  const [comment, setComment] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadReview = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const nextReview = await teacherNotebookChecksApi.getReview(submissionId)
      setReview(nextReview)
      setComment(nextReview.assessment?.teacherComment ?? '')
      const nextResults: Record<string, { status: TeacherCriterionStatus; note: string }> = {}
      const savedResults = new Map((nextReview.assessment?.results ?? []).map((item) => [item.criterionId, item]))
      const aiResults = new Map((nextReview.aiDraft?.suggestions ?? []).map((item) => [item.criterionId, item]))
      for (const criterion of nextReview.criteria) {
        const saved = savedResults.get(criterion.id)
        const ai = aiResults.get(criterion.id)
        nextResults[criterion.id] = {
          status: saved?.status ?? ai?.status ?? 'UNDETERMINED',
          note: saved?.note ?? ai?.note ?? '',
        }
      }
      setResults(nextResults)
    } catch (loadError) {
      setError(errorMessage(loadError))
    } finally {
      setIsLoading(false)
    }
  }, [submissionId])

  useEffect(() => {
    void loadReview()
  }, [loadReview])

  const isFinalized = review?.status === 'FINALIZED' || Boolean(review?.assessment)
  const aiReady = Boolean(review?.aiDraft)
  const statusText = useMemo(() => {
    if (!review) return ''
    if (review.processingStatus === 'PROCESSING') return 'AI đang phân tích...'
    if (review.processingStatus === 'PROCESSED') return 'Đã có bản nháp AI'
    if (review.processingStatus === 'FAILED') return 'AI phân tích thất bại; có thể chấm thủ công'
    return 'Chưa phân tích AI'
  }, [review])

  async function openFile(fileId: string) {
    try {
      const result = await teacherNotebookChecksApi.downloadSubmissionFile(submissionId, fileId)
      const url = URL.createObjectURL(result.blob)
      window.open(url, '_blank', 'noopener,noreferrer')
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (fileError) {
      setError(errorMessage(fileError))
    }
  }

  async function runAnalysis() {
    setIsAnalyzing(true)
    setError('')
    setNotice('')
    try {
      const result = review?.processingStatus === 'FAILED'
        ? await teacherNotebookChecksApi.retryAnalysis(submissionId)
        : await teacherNotebookChecksApi.analyze(submissionId)
      if (result.status === 'UNAVAILABLE' || result.status === 'FAILED') {
        setNotice(result.message ?? 'AI chưa thể phân tích; giáo viên có thể chấm thủ công.')
      } else {
        setNotice('Đã tạo bản nháp AI. Hãy kiểm tra trước khi chốt.')
      }
      await loadReview()
    } catch (analysisError) {
      setError(errorMessage(analysisError))
    } finally {
      setIsAnalyzing(false)
    }
  }

  function updateResult(criterionId: string, patch: Partial<{ status: TeacherCriterionStatus; note: string }>) {
    setResults((current) => ({
      ...current,
      [criterionId]: { ...current[criterionId], ...patch },
    }))
  }

  async function finalize() {
    if (!review || isFinalized) return
    setIsSaving(true)
    setError('')
    try {
      await teacherNotebookChecksApi.finalize(submissionId, {
        results: review.criteria.map((criterion) => ({
          criterionId: criterion.id,
          status: results[criterion.id]?.status ?? 'UNDETERMINED',
          note: results[criterion.id]?.note.trim() || null,
        })),
        teacherComment: comment.trim() || null,
      })
      setNotice('Đã chốt kết quả kiểm tra vở.')
      await loadReview()
      onFinalized?.()
    } catch (finalizeError) {
      setError(errorMessage(finalizeError))
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) return <div className="tn-review"><p>Đang tải bài nộp...</p></div>
  if (error && !review) return <div className="tn-review"><p className="ta-error" role="alert">{error}</p><button type="button" className="ta-secondary" onClick={() => void loadReview()}><RotateCcw size={14} /> Thử lại</button></div>
  if (!review) return null

  return (
    <section className="tn-review" aria-labelledby="tn-review-title">
      <header className="tn-review-header">
        <div>
          <span className="ta-step">BÀI NỘP · ĐỢT {review.periodNo}</span>
          <h3 id="tn-review-title">{review.studentName}</h3>
          <p>{review.username} · Nộp lúc {new Date(review.submittedAt).toLocaleString('vi-VN')}</p>
        </div>
        <strong>{isFinalized ? 'Đã chốt' : review.status}</strong>
      </header>

      <div className="tn-review-files">
        <h4>Ảnh bài nộp</h4>
        {review.files.length === 0 && <p className="tn-empty">Bài nộp chưa có file ảnh.</p>}
        {review.files.map((file) => <button type="button" className="tn-file-button" key={file.id} onClick={() => void openFile(file.id)}><FileImage size={15} /> Mở ảnh {file.sortOrder}</button>)}
      </div>

      <div className="tn-ai-review">
        <div><strong><Sparkles size={15} /> Gợi ý Gemini</strong><p>{statusText}</p></div>
        {!readOnly && !isFinalized && <button type="button" className="ta-secondary" disabled={isAnalyzing || review.status !== 'LOCKED'} onClick={() => void runAnalysis()}>{isAnalyzing ? 'Đang phân tích...' : review.processingStatus === 'FAILED' ? 'Thử lại Gemini' : aiReady ? 'Phân tích lại' : 'Phân tích bằng Gemini'}</button>}
      </div>
      {review.aiDraft?.ocrText && <details className="tn-ocr"><summary>Xem bản chép AI</summary><pre>{review.aiDraft.ocrText}</pre></details>}
      {notice && <p className="ta-success" role="status">{notice}</p>}
      {error && <p className="ta-error" role="alert">{error}</p>}

      <div className="tn-result-list">
        <h4>Đánh giá theo tiêu chí</h4>
        {review.criteria.map((criterion, index) => {
          const result = results[criterion.id] ?? { status: 'UNDETERMINED' as TeacherCriterionStatus, note: '' }
          const aiSuggestion = review.aiDraft?.suggestions.find((item) => item.criterionId === criterion.id)
          return (
            <fieldset className="tn-result-row" key={criterion.id}>
              <legend>{index + 1}. {criterion.content}</legend>
              {aiSuggestion?.evidence && <p className="tn-evidence-note">Bằng chứng AI: {aiSuggestion.evidence}</p>}
              <label>Trạng thái<select value={result.status} disabled={readOnly || isFinalized} onChange={(event) => updateResult(criterion.id, { status: event.target.value as TeacherCriterionStatus })}><option value="RECORDED">{statusLabel('RECORDED')}</option><option value="NEEDS_SUPPLEMENTATION">{statusLabel('NEEDS_SUPPLEMENTATION')}</option><option value="UNDETERMINED">{statusLabel('UNDETERMINED')}</option></select></label>
              <label>Ghi chú<textarea rows={2} value={result.note} disabled={readOnly || isFinalized} onChange={(event) => updateResult(criterion.id, { note: event.target.value })} /></label>
            </fieldset>
          )
        })}
      </div>

      <label className="tn-comment">Nhận xét chung<textarea rows={3} value={comment} disabled={readOnly || isFinalized} onChange={(event) => setComment(event.target.value)} /></label>
      {!readOnly && !isFinalized && <button type="button" className="ta-primary" disabled={isSaving || review.status !== 'LOCKED'} onClick={() => void finalize()}>{isSaving ? 'Đang chốt...' : 'Chốt kết quả'}</button>}
    </section>
  )
}
