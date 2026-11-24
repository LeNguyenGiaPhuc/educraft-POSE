import { useState, type FormEvent } from 'react'
import type { TeacherLessonSummary } from '../../../lib/api/teacher/lessons'
import type {
  TeacherActivityDetail,
  TeacherActivityDifficulty,
  TeacherCreateActivityInput,
  TeacherExerciseType,
  TeacherQuestionInput,
  TeacherUpdateActivityInput,
  TeacherAiDraftResult,
} from '../../../lib/api/teacher/activities'
import { teacherActivitiesApi } from '../../../lib/api/teacher/activities'
import { difficultyLabels } from './activityRules'
import { AiDraftPanel } from './AiDraftPanel'

type DraftQuestion = TeacherQuestionInput & { id: string }

type Props = {
  activity?: TeacherActivityDetail
  exerciseType?: TeacherExerciseType
  lessons: TeacherLessonSummary[]
  isSaving: boolean
  onCancel: () => void
  classroomSubjectId: string
  onSave: (input: TeacherCreateActivityInput | TeacherUpdateActivityInput, questions: TeacherQuestionInput[]) => Promise<void>
}

function localDateTime(value: string | null | undefined): string {
  if (!value) return ''
  const date = new Date(value)
  const offset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

function toIso(value: string): string | null {
  return value ? new Date(value).toISOString() : null
}

function createQuestion(type: TeacherExerciseType, lessonId: string, index: number): DraftQuestion {
  return {
    id: `question-${Date.now()}-${index}`,
    prompt: '',
    ...(type === 'QUIZ' ? { options: ['', '', '', ''], answerKey: '' } : { markingCriteria: '' }),
    explanation: '',
    maxPoints: type === 'QUIZ' ? 1 : 5,
    lessonId,
    citations: [],
  }
}

function questionsFromActivity(activity: TeacherActivityDetail, type: TeacherExerciseType): DraftQuestion[] {
  if (activity.questions.length === 0) return [createQuestion(type, activity.lessons[0]?.id ?? '', 0)]
  return activity.questions.map((question) => ({
    id: question.id,
    prompt: question.prompt,
    ...(type === 'QUIZ'
      ? { options: question.options.length > 0 ? question.options : ['', '', '', ''], answerKey: question.answerKey ?? '' }
      : { answerKey: question.answerKey ?? '', markingCriteria: question.markingCriteria ?? '' }),
    explanation: question.explanation,
    maxPoints: question.maxPoints,
    lessonId: question.lessonId,
    citations: question.citations.map((citation) => ({ segmentId: citation.segmentId, excerpt: citation.excerpt ?? undefined })),
  }))
}

export function ExerciseActivityForm({ activity, exerciseType = activity?.exercise?.exercise_type ?? 'QUIZ', lessons, classroomSubjectId, isSaving, onCancel, onSave }: Props) {
  const publishedLessons = lessons.filter((lesson) => lesson.status === 'PUBLISHED')
  const initialLessonIds = activity?.lessons.map((lesson) => lesson.id) ?? (publishedLessons[0]?.id ? [publishedLessons[0].id] : [])
  const [title, setTitle] = useState(activity?.title ?? '')
  const [description, setDescription] = useState(activity?.description ?? '')
  const [difficulty, setDifficulty] = useState<TeacherActivityDifficulty>(activity?.exercise?.difficulty ?? 'BASIC')
  const [closesAt, setClosesAt] = useState(localDateTime(activity?.closes_at))
  const [lessonIds, setLessonIds] = useState<string[]>(initialLessonIds)
  const [questions, setQuestions] = useState<DraftQuestion[]>(() => activity ? questionsFromActivity(activity, exerciseType) : [])
  const [instructions, setInstructions] = useState('')
  const [questionCount, setQuestionCount] = useState(5)
  const [aiDraft, setAiDraft] = useState<TeacherAiDraftResult | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState('')

  function updateQuestion(id: string, patch: Partial<DraftQuestion>) {
    setQuestions((current) => current.map((question) => question.id === id ? { ...question, ...patch } : question))
  }

  function toggleLesson(lessonId: string) {
    setLessonIds((current) => current.includes(lessonId) ? current.filter((id) => id !== lessonId) : [...current, lessonId])
  }

  function addQuestion() {
    setQuestions((current) => [...current, createQuestion(exerciseType, lessonIds[0] ?? publishedLessons[0]?.id ?? '', current.length)])
  }

  function removeQuestion(id: string) {
    setQuestions((current) => current.filter((question) => question.id !== id))
  }

  async function generateDraft() {
    if (lessonIds.length === 0) {
      setError('Cần chọn ít nhất một bài học đã công bố trước khi tạo bản nháp AI.')
      return
    }
    setIsGenerating(true)
    setError('')
    try {
      const result = await teacherActivitiesApi.exerciseDraft(classroomSubjectId, {
        exerciseType,
        lessonIds,
        questionCount,
        difficulty,
        instructions: instructions.trim(),
      })
      setAiDraft(result)
      if (result.status === 'READY') {
        setQuestions(result.questions.map((question, index) => ({ ...question, id: `ai-question-${Date.now()}-${index}`, citations: question.citations ?? [] })))
      }
    } catch (error) {
      setAiDraft({ status: 'FAILED', message: error instanceof Error ? error.message : 'Không thể tạo bản nháp AI.', questions: [] })
    } finally {
      setIsGenerating(false)
    }
  }

  function validate(): string[] {
    const errors: string[] = []
    if (!title.trim()) errors.push('Tên hoạt động không được để trống.')
    if (lessonIds.length === 0) errors.push('Cần chọn ít nhất một bài học đã công bố.')
    if (questions.length === 0) errors.push('Cần có ít nhất một câu hỏi trước khi công bố.')

    questions.forEach((question, index) => {
      if (!question.prompt.trim()) errors.push(`Câu ${index + 1}: nội dung không được để trống.`)
      if (!question.lessonId || !lessonIds.includes(question.lessonId)) errors.push(`Câu ${index + 1}: chọn bài học nguồn hợp lệ.`)
      if (!Number.isFinite(question.maxPoints) || question.maxPoints <= 0) errors.push(`Câu ${index + 1}: điểm tối đa phải lớn hơn 0.`)
      if (exerciseType === 'QUIZ') {
        const options = question.options ?? []
        if (options.length !== 4 || options.some((option) => !option.trim())) errors.push(`Câu ${index + 1}: Quiz cần đúng 4 lựa chọn không rỗng.`)
        if (new Set(options.map((option) => option.trim())).size !== options.length) errors.push(`Câu ${index + 1}: Quiz không được trùng lựa chọn.`)
        if (!question.answerKey || !options.includes(question.answerKey)) errors.push(`Câu ${index + 1}: đáp án đúng phải nằm trong lựa chọn.`)
      } else if (!question.answerKey?.trim() || !question.markingCriteria?.trim()) {
        errors.push(`Câu ${index + 1}: tự luận cần đáp án tham khảo và tiêu chí chấm.`)
      }
    })
    return errors
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const errors = validate()
    if (errors.length > 0) {
      setError(errors[0])
      return
    }

    setError('')
    const cleanQuestions = questions.map(({ id: ignoredId, ...question }) => {
      void ignoredId
      return question
    })
    const activityInput = activity
      ? {
          title: title.trim(),
          description: description.trim(),
          difficulty,
          lessonIds,
          closesAt: toIso(closesAt),
        }
      : {
          title: title.trim(),
          description: description.trim(),
          exerciseType,
          difficulty,
          lessonIds,
          closesAt: toIso(closesAt),
        }

    try {
      await onSave(activityInput, cleanQuestions)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Không thể lưu hoạt động.')
    }
  }

  return (
    <form className="ta-api-form" onSubmit={submit} noValidate>
      <div className="ta-form-grid">
        <label>Tên hoạt động *<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={250} /></label>
        {!activity && <label>Loại hoạt động
          <select value={exerciseType} disabled>
            <option value="QUIZ">Quiz</option>
            <option value="WRITTEN">Tự luận</option>
          </select>
        </label>}
        <label>Độ khó
          <select value={difficulty} onChange={(event) => setDifficulty(event.target.value as TeacherActivityDifficulty)}>
            {Object.entries(difficultyLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
          </select>
        </label>
        <label>Đóng nhận bài<input type="datetime-local" value={closesAt} onChange={(event) => setClosesAt(event.target.value)} /></label>
      </div>

      <label>Mô tả hoạt động<textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} /></label>

      <fieldset className="ta-api-source-list">
        <legend>Bài học nguồn đã công bố</legend>
        {publishedLessons.length === 0 && <p>Chưa có bài học đã công bố. Hãy công bố bài học trước khi tạo hoạt động.</p>}
        {publishedLessons.map((lesson) => <label key={lesson.id}><input type="checkbox" checked={lessonIds.includes(lesson.id)} onChange={() => toggleLesson(lesson.id)} /> {lesson.title}</label>)}
      </fieldset>

      {!activity && <AiDraftPanel instructions={instructions} questionCount={questionCount} isGenerating={isGenerating} result={aiDraft} onInstructionsChange={setInstructions} onQuestionCountChange={setQuestionCount} onGenerate={() => void generateDraft()} />}

      <div className="ta-api-question-heading"><div><h3>Câu hỏi</h3><p>Giáo viên kiểm tra và chỉnh sửa trước khi công bố.</p></div><button type="button" className="ta-secondary" onClick={addQuestion}>Thêm câu hỏi</button></div>
      <div className="ta-api-question-list">
        {questions.map((question, index) => (
          <fieldset className="ta-api-question" key={question.id}>
            <legend>Câu {index + 1}</legend>
            <button type="button" className="ta-api-remove" onClick={() => removeQuestion(question.id)} disabled={questions.length === 1}>Xóa</button>
            <label>Nội dung<textarea value={question.prompt} onChange={(event) => updateQuestion(question.id, { prompt: event.target.value })} rows={3} /></label>
            <label>Bài học nguồn<select value={question.lessonId} onChange={(event) => updateQuestion(question.id, { lessonId: event.target.value })}>{publishedLessons.map((lesson) => <option value={lesson.id} key={lesson.id}>{lesson.title}</option>)}</select></label>
            {exerciseType === 'QUIZ' ? (
              <>
                <div className="ta-api-options">{(question.options ?? []).map((option, optionIndex) => <label key={`${question.id}-option-${optionIndex}`}>Lựa chọn {optionIndex + 1}<input value={option} onChange={(event) => updateQuestion(question.id, { options: question.options?.map((item, itemIndex) => itemIndex === optionIndex ? event.target.value : item), answerKey: question.answerKey === option ? event.target.value : question.answerKey })} /></label>)}</div>
                <label>Đáp án đúng<select value={question.answerKey ?? ''} onChange={(event) => updateQuestion(question.id, { answerKey: event.target.value })}><option value="">Chọn đáp án</option>{(question.options ?? []).map((option, optionIndex) => <option value={option} key={`${question.id}-answer-${optionIndex}`}>{option || `Lựa chọn ${optionIndex + 1}`}</option>)}</select></label>
              </>
            ) : <><label>Đáp án tham khảo<textarea value={question.answerKey ?? ''} onChange={(event) => updateQuestion(question.id, { answerKey: event.target.value })} rows={3} /></label><label>Tiêu chí chấm<textarea value={question.markingCriteria ?? ''} onChange={(event) => updateQuestion(question.id, { markingCriteria: event.target.value })} rows={3} /></label></>}
            <div className="ta-form-grid"><label>Điểm tối đa<input type="number" min="0.5" step="0.5" value={Number.isNaN(question.maxPoints) ? '' : question.maxPoints} onChange={(event) => updateQuestion(question.id, { maxPoints: event.target.valueAsNumber })} /></label><label>Giải thích<textarea value={question.explanation} onChange={(event) => updateQuestion(question.id, { explanation: event.target.value })} rows={2} /></label></div>
          </fieldset>
        ))}
      </div>

      {error && <p className="ta-error" role="alert">{error}</p>}
      <div className="ta-confirm-actions"><button type="button" className="ta-secondary" onClick={onCancel} disabled={isSaving || isGenerating}>Hủy</button><button type="submit" className="ta-primary" disabled={isSaving || isGenerating || publishedLessons.length === 0}>{isSaving ? 'Đang lưu...' : activity ? 'Lưu thay đổi' : 'Công bố hoạt động'}</button></div>
    </form>
  )
}
