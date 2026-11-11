import type { Criterion } from '../insights/fixtures'

export type NotebookRecord = {
  studentId: string
  status: 'LOCKED' | 'MISSING'
  submittedAt?: string
  aiStatus?: 'READY' | 'FAILED'
  ocrExcerpt?: string
  finalizedHistory: { date: string; evaluator: string; summary: string }[]
}

export const notebookRecords: NotebookRecord[] = [
  { studentId: 'phuc', status: 'LOCKED', submittedAt: '2026-11-08 19:30', aiStatus: 'READY', ocrExcerpt: 'Thời cơ tổng khởi nghĩa ... ngày 19/8 ... nước Việt Nam Dân chủ Cộng hòa ...', finalizedHistory: [{ date: '2026-10-22', evaluator: 'Cô Nguyễn Minh Anh', summary: '2 tiêu chí đã ghi, 1 cần bổ sung' }] },
  { studentId: 'mai', status: 'LOCKED', submittedAt: '2026-11-08 20:10', aiStatus: 'FAILED', finalizedHistory: [] },
  { studentId: 'khanh', status: 'MISSING', finalizedHistory: [] },
]

export type CriterionDraft = Pick<Criterion, 'id' | 'content' | 'note'> & { status: Criterion['suggested'] }

export const exerciseResults: Record<string, { studentId: string; status: 'GRADED' | 'PROCESSING' | 'FAILED' | 'MISSING'; score?: number; answer?: string }[]> = {
  'quiz-11a2': [
    { studentId: 'phuc', status: 'GRADED', score: 4.2 },
    { studentId: 'mai', status: 'GRADED', score: 8.6 },
    { studentId: 'khanh', status: 'GRADED', score: 6.5 },
  ],
  'quiz-postwar-11a2': [
    { studentId: 'phuc', status: 'GRADED', score: 4.8 },
    { studentId: 'mai', status: 'MISSING' },
    { studentId: 'khanh', status: 'MISSING' },
  ],
  'written-11a2': [
    { studentId: 'phuc', status: 'GRADED', score: 7.6, answer: 'Mở ra kỷ nguyên độc lập, tự do và cổ vũ phong trào giải phóng dân tộc.' },
    { studentId: 'mai', status: 'FAILED', answer: 'Cách mạng tháng Tám mở ra kỷ nguyên độc lập, tự do cho dân tộc.' },
    { studentId: 'khanh', status: 'MISSING' },
  ],
  'quiz-11a1': [
    { studentId: 'an', status: 'GRADED', score: 6.7 },
    { studentId: 'linh', status: 'GRADED', score: 6 },
    { studentId: 'bao', status: 'MISSING' },
  ],
}
