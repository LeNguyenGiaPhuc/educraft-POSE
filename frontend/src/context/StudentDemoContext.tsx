import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type ClassMode = 'current' | 'former' | 'unassigned'
export type QuizAttempt = { answers: number[]; score: number; completedAt: string }
export type WrittenAttempt = { answer: string; score: number; completedAt: string }
export type NotebookSubmission = { imageCount: number; submittedAt: string }
export type NotebookPhase = 'open' | 'closed' | 'finalized'
export type PracticeSession = { id: number; subject: string; lesson: string; score: number; completedAt: string }
export type ChatMessage = { role: 'student' | 'assistant'; text: string; source?: string }

type StudentDemoState = {
  classMode: ClassMode
  attempts: Record<string, QuizAttempt>
  writtenAttempts: Record<string, WrittenAttempt>
  notebookSubmission: NotebookSubmission | null
  notebookPhase: NotebookPhase
  notebookHistoryCount: number
  practiceSessions: PracticeSession[]
  chatMessages: ChatMessage[]
}

type StudentDemoContextValue = StudentDemoState & {
  setClassMode: (mode: ClassMode) => void
  completeQuiz: (activityId: string, answers: number[], score: number) => void
  completeWritten: (activityId: string, answer: string, score: number) => void
  submitNotebook: (imageCount: number) => void
  updateNotebookImages: (imageCount: number) => void
  deleteNotebookSubmission: () => void
  closeNotebook: () => void
  finalizeNotebook: () => void
  reopenNotebook: () => void
  completePractice: (subject: string, lesson: string, score: number) => void
  addChatMessage: (message: ChatMessage) => void
  resetDemo: () => void
}

const storageKey = 'educraft-student-preview-state'

const initialState: StudentDemoState = {
  classMode: 'current',
  attempts: {},
  writtenAttempts: {},
  notebookSubmission: null,
  notebookPhase: 'open',
  notebookHistoryCount: 0,
  practiceSessions: [],
  chatMessages: [
    { role: 'student', text: 'Vì sao hệ tuần hoàn kín trao đổi chất hiệu quả hơn?' },
    { role: 'assistant', text: 'Trong hệ tuần hoàn kín, máu luôn lưu thông trong mạch nên duy trì được áp lực và tốc độ dòng chảy phù hợp. Điều này giúp việc đưa chất đến mô và thu nhận chất thải diễn ra hiệu quả hơn.', source: 'Sinh học 11 · Bài 9, trang 64' },
  ],
}

function readInitialState(): StudentDemoState {
  try {
    const stored = sessionStorage.getItem(storageKey)
    if (!stored) return initialState
    const parsed = JSON.parse(stored) as Partial<StudentDemoState>
    return {
      ...initialState,
      ...parsed,
      classMode: parsed.classMode === 'former' || parsed.classMode === 'unassigned' ? parsed.classMode : 'current',
      attempts: parsed.attempts ?? {},
      writtenAttempts: parsed.writtenAttempts ?? {},
      notebookPhase: parsed.notebookPhase === 'closed' || parsed.notebookPhase === 'finalized' ? parsed.notebookPhase : 'open',
      notebookHistoryCount: parsed.notebookHistoryCount ?? 0,
      practiceSessions: parsed.practiceSessions ?? [],
      chatMessages: parsed.chatMessages ?? initialState.chatMessages,
    }
  } catch {
    return initialState
  }
}

const StudentDemoContext = createContext<StudentDemoContextValue | null>(null)

export function StudentDemoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StudentDemoState>(readInitialState)

  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(state))
    } catch {
      // The student preview remains usable when browser storage is unavailable.
    }
  }, [state])

  const value = useMemo<StudentDemoContextValue>(() => ({
    ...state,
    setClassMode: (classMode) => setState((previous) => ({ ...previous, classMode })),
    completeQuiz: (activityId, answers, score) => setState((previous) => ({ ...previous, attempts: { ...previous.attempts, [activityId]: { answers, score, completedAt: new Date().toLocaleString('vi-VN') } } })),
    completeWritten: (activityId, answer, score) => setState((previous) => ({ ...previous, writtenAttempts: { ...previous.writtenAttempts, [activityId]: { answer, score, completedAt: new Date().toLocaleString('vi-VN') } } })),
    submitNotebook: (imageCount) => setState((previous) => ({ ...previous, notebookSubmission: { imageCount, submittedAt: new Date().toLocaleString('vi-VN') } })),
    updateNotebookImages: (imageCount) => setState((previous) => previous.notebookSubmission ? { ...previous, notebookSubmission: { ...previous.notebookSubmission, imageCount } } : previous),
    deleteNotebookSubmission: () => setState((previous) => ({ ...previous, notebookSubmission: null })),
    closeNotebook: () => setState((previous) => previous.notebookSubmission ? { ...previous, notebookPhase: 'closed' } : previous),
    finalizeNotebook: () => setState((previous) => previous.notebookPhase === 'closed' ? { ...previous, notebookPhase: 'finalized', notebookHistoryCount: previous.notebookHistoryCount + 1 } : previous),
    reopenNotebook: () => setState((previous) => previous.notebookPhase === 'finalized' ? { ...previous, notebookPhase: 'open', notebookSubmission: null } : previous),
    completePractice: (subject, lesson, score) => setState((previous) => ({ ...previous, practiceSessions: [...previous.practiceSessions, { id: Date.now(), subject, lesson, score, completedAt: new Date().toLocaleString('vi-VN') }] })),
    addChatMessage: (message) => setState((previous) => ({ ...previous, chatMessages: [...previous.chatMessages, message] })),
    resetDemo: () => setState(initialState),
  }), [state])

  return <StudentDemoContext.Provider value={value}>{children}</StudentDemoContext.Provider>
}

export function useStudentDemo() {
  const context = useContext(StudentDemoContext)
  if (!context) throw new Error('useStudentDemo must be used within StudentDemoProvider')
  return context
}
