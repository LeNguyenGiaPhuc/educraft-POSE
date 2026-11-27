import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ExternalLink, FileImage, RotateCcw } from 'lucide-react'
import craftSpark from '../../../assets/educraft/brand/craft-spark.svg'
import { ApiError } from '../../../lib/api/client'
import {
  teacherNotebookChecksApi,
  type TeacherCriterionStatus,
  type TeacherNotebookSubmissionReview,
} from '../../../lib/api/teacher/notebookChecks'
import { buildTeacherReviewDraft, isCurrentReviewRequest, submissionStatusLabel } from './notebookReviewState'

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
  const [selectedFileId, setSelectedFileId] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)
  const submissionIdRef = useRef(submissionId)
  const reviewRequestRef = useRef({ requestId: 0, submissionId })
  const previewUrlRef = useRef('')

  const replacePreviewUrl = useCallback((nextUrl: string) => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    previewUrlRef.current = nextUrl
    setPreviewUrl(nextUrl)
  }, [])

  const loadReview = useCallback(async (preserveDraft = false) => {
    const requestId = reviewRequestRef.current.requestId + 1
    reviewRequestRef.current = { requestId, submissionId }
    setIsLoading(true)
    setError('')
    try {
      const nextReview = await teacherNotebookChecksApi.getReview(submissionId)
      if (!isCurrentReviewRequest(reviewRequestRef.current, requestId, submissionId)) return
      setReview(nextReview)
      if (!preserveDraft) {
        const draft = buildTeacherReviewDraft(nextReview)
        setComment(draft.comment)
        setResults(draft.results)
      }
    } catch (loadError) {
      if (isCurrentReviewRequest(reviewRequestRef.current, requestId, submissionId)) {
        setError(errorMessage(loadError))
      }
    } finally {
      if (isCurrentReviewRequest(reviewRequestRef.current, requestId, submissionId)) {
        setIsLoading(false)
      }
    }
  }, [submissionId])

  useEffect(() => {
    submissionIdRef.current = submissionId
    setReview(null)
    setResults({})
    setComment('')
    setIsAnalyzing(false)
    setIsSaving(false)
    setIsPreviewLoading(false)
    setNotice('')
    setError('')
    setSelectedFileId('')
    replacePreviewUrl('')
    void loadReview()
  }, [loadReview, replacePreviewUrl, submissionId])

  useEffect(() => () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
  }, [])

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

  async function previewFile(fileId: string) {
    const targetSubmissionId = submissionId
    setSelectedFileId(fileId)
    setIsPreviewLoading(true)
    setError('')
    try {
      const result = await teacherNotebookChecksApi.downloadSubmissionFile(targetSubmissionId, fileId)
      const nextUrl = URL.createObjectURL(result.blob)
      if (submissionIdRef.current !== targetSubmissionId) {
        URL.revokeObjectURL(nextUrl)
        return
      }
      replacePreviewUrl(nextUrl)
    } catch (fileError) {
      if (submissionIdRef.current === targetSubmissionId) setError(errorMessage(fileError))
    } finally {
      if (submissionIdRef.current === targetSubmissionId) setIsPreviewLoading(false)
    }
  }

  async function runAnalysis() {
    const targetSubmissionId = submissionId
    setIsAnalyzing(true)
    setError('')
    setNotice('')
    try {
      const result = review?.processingStatus === 'FAILED'
        ? await teacherNotebookChecksApi.retryAnalysis(targetSubmissionId)
        : await teacherNotebookChecksApi.analyze(targetSubmissionId)
      if (submissionIdRef.current !== targetSubmissionId) return
      if (result.status === 'UNAVAILABLE' || result.status === 'FAILED') {
        setNotice(result.message ?? 'AI chưa thể phân tích; giáo viên có thể chấm thủ công.')
      } else {
        setNotice('Đã tạo bản nháp AI. Hãy kiểm tra trước khi chốt.')
      }
      await loadReview(true)
    } catch (analysisError) {
      if (submissionIdRef.current === targetSubmissionId) setError(errorMessage(analysisError))
    } finally {
      if (submissionIdRef.current === targetSubmissionId) setIsAnalyzing(false)
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
    const targetSubmissionId = submissionId
    setIsSaving(true)
    setError('')
    try {
      await teacherNotebookChecksApi.finalize(targetSubmissionId, {
        results: review.criteria.map((criterion) => ({
          criterionId: criterion.id,
          status: results[criterion.id]?.status ?? 'UNDETERMINED',
          note: results[criterion.id]?.note.trim() || null,
        })),
        teacherComment: comment.trim() || null,
      })
      if (submissionIdRef.current !== targetSubmissionId) return
      setNotice('Đã chốt kết quả kiểm tra vở.')
      await loadReview()
      onFinalized?.()
    } catch (finalizeError) {
      if (submissionIdRef.current === targetSubmissionId) setError(errorMessage(finalizeError))
    } finally {
      if (submissionIdRef.current === targetSubmissionId) setIsSaving(false)
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
        <strong>{submissionStatusLabel(review.status)}</strong>
      </header>

      <div className="tn-review-desk">
        <aside className="tn-review-evidence" aria-labelledby="tn-evidence-title">
          <div className="tn-review-files">
            <h4 id="tn-evidence-title">Ảnh bài nộp</h4>
            <p className="tn-help">Ảnh được mở bằng phiên truy cập riêng tư hiện tại.</p>
            {review.files.length === 0 && <p className="tn-empty">Bài nộp chưa có file ảnh.</p>}
            <div className="tn-review-file-actions">
              {review.files.map((file) => <button type="button" className={`tn-file-button${selectedFileId === file.id ? ' is-selected' : ''}`} key={file.id} onClick={() => void previewFile(file.id)}><FileImage size={15} /> Xem ảnh {file.sortOrder}</button>)}
            </div>
            {isPreviewLoading && <div className="tn-evidence-preview is-loading" aria-busy="true">Đang tải ảnh riêng tư...</div>}
            {!isPreviewLoading && previewUrl && <figure className="tn-evidence-preview"><img src={previewUrl} alt="Ảnh bài nộp đang xem" /><figcaption><button type="button" className="tn-file-button" onClick={() => void openFile(selectedFileId)}><ExternalLink size={14} /> Mở ảnh trong tab mới</button></figcaption></figure>}
          </div>

          <div className="tn-ai-review">
            <div><strong><img src={craftSpark} alt="" /> Gợi ý Gemini</strong><p>{statusText}</p></div>
            {!readOnly && !isFinalized && <button type="button" className="ta-secondary" disabled={isAnalyzing || review.status !== 'LOCKED'} onClick={() => void runAnalysis()}>{isAnalyzing ? 'Đang phân tích...' : review.processingStatus === 'FAILED' ? 'Thử lại Gemini' : aiReady ? 'Phân tích lại' : 'Phân tích bằng Gemini'}</button>}
          </div>
          {review.aiDraft?.ocrText && <details className="tn-ocr"><summary>Xem bản chép AI</summary><pre>{review.aiDraft.ocrText}</pre></details>}
          {notice && <p className="ta-success" role="status">{notice}</p>}
          {error && <p className="ta-error" role="alert">{error}</p>}
        </aside>

        <div className="tn-review-assessment">
      <div className="tn-result-list">
        <h4>Đánh giá theo tiêu chí</h4>
        {review.criteria.map((criterion, index) => {
          const result = results[criterion.id] ?? { status: 'UNDETERMINED' as TeacherCriterionStatus, note: '' }
          const aiSuggestion = review.aiDraft?.suggestions.find((item) => item.criterionId === criterion.id)
          return (
            <fieldset className="tn-result-row" key={criterion.id}>
              <legend>{index + 1}. {criterion.content}</legend>
              {aiSuggestion && <div className="tn-ai-suggestion"><strong>AI đề xuất: {statusLabel(aiSuggestion.status)}</strong>{aiSuggestion.note && <span>{aiSuggestion.note}</span>}{aiSuggestion.evidence && <span>Bằng chứng: {aiSuggestion.evidence}</span>}</div>}
              <label>Trạng thái<select value={result.status} disabled={readOnly || isFinalized} onChange={(event) => updateResult(criterion.id, { status: event.target.value as TeacherCriterionStatus })}><option value="RECORDED">{statusLabel('RECORDED')}</option><option value="NEEDS_SUPPLEMENTATION">{statusLabel('NEEDS_SUPPLEMENTATION')}</option><option value="UNDETERMINED">{statusLabel('UNDETERMINED')}</option></select></label>
              <label>Ghi chú<textarea rows={2} value={result.note} disabled={readOnly || isFinalized} onChange={(event) => updateResult(criterion.id, { note: event.target.value })} /></label>
            </fieldset>
          )
        })}
      </div>

      <label className="tn-comment">Nhận xét chung<textarea rows={3} value={comment} disabled={readOnly || isFinalized} onChange={(event) => setComment(event.target.value)} /></label>
      {!readOnly && !isFinalized && <button type="button" className="ta-primary" disabled={isSaving || review.status !== 'LOCKED'} onClick={() => void finalize()}>{isSaving ? 'Đang chốt...' : 'Chốt kết quả'}</button>}
        </div>
      </div>
    </section>
  )
}
