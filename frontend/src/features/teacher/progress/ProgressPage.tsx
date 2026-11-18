import { Link } from 'react-router'
import type { TeacherStudentProgressResult } from '../../../lib/api/teacher/results'
import { teacherWorkspacePath } from '../../../lib/api/teacher/workspace'
import { EmptyState } from '../insights/TeacherUI'

function resultPath(progress: TeacherStudentProgressResult, submissionId: string): string {
  const query = new URLSearchParams({
    tab: 'submissions',
    submissionId,
    submissionKind: 'EXERCISE',
  })
  return `${teacherWorkspacePath(progress.classroomSubject.classroom.id, progress.classroomSubject.id)}?${query.toString()}`
}

export function StudentProgress({ progress }: { progress: TeacherStudentProgressResult }) {
  const points = progress.lessons.flatMap((lesson) => lesson.results.map((result) => ({
    ...result,
    lessonTitle: lesson.title,
  }))).sort((left, right) => left.occurredAt.localeCompare(right.occurredAt))

  return (
    <section className="ti-card">
      <h2>Xu hướng điểm bài được giao</h2>
      <p className="ti-muted">Chỉ gồm Quiz và tự luận đã chấm. Tự ôn và kiểm tra vở không được cộng vào biểu đồ điểm.</p>
      {points.length === 0 ? (
        <EmptyState title="Chưa có kết quả chấm hợp lệ" detail="Khi có Quiz hoặc tự luận đã chấm, xu hướng sẽ xuất hiện tại đây." />
      ) : (
        <>
          <div className="ti-chart" role="img" aria-label={points.map((point) => `${point.occurredAt.slice(0, 10)}: ${Math.round(point.percentage ?? 0)}%`).join('; ')}>
            {points.map((point) => {
              const percent = Math.round(point.percentage ?? 0)
              return <div className="ti-bar-item" key={point.id}><span>{percent}%</span><div className={`ti-bar ${percent < 50 ? 'low' : ''}`} style={{ height: `${Math.max(4, percent)}%` }} /><small>{point.occurredAt.slice(5, 10)}</small></div>
            })}
          </div>
          <h3>Dấu hiệu theo bài học</h3>
          <p className="ti-muted">Dấu hiệu gặp khó được backend tổng hợp từ các kết quả đã chấm; đây là căn cứ hỗ trợ dạy học, không phải kết luận năng lực.</p>
          {progress.lessons.map((lesson) => (
            <details className="tw-evidence" key={lesson.lessonId}>
              <summary>{lesson.title} · {lesson.hasDifficulty ? 'Đang gặp khó' : 'Không đánh dấu khó'}</summary>
              {lesson.results.length === 0 ? <p>Chưa có kết quả chấm.</p> : <ul>{lesson.results.map((result) => {
                const summary = `${result.occurredAt.slice(0, 10)} · ${result.earnedPoints ?? '—'}/${result.maxPoints ?? '—'} điểm · ${result.percentage === null ? 'Chưa tính tỷ lệ' : `${Math.round(result.percentage)}%`}`
                return <li key={result.id}>{result.exerciseSubmissionId ? <Link to={resultPath(progress, result.exerciseSubmissionId)}>{summary}</Link> : summary}</li>
              })}</ul>}
            </details>
          ))}
        </>
      )}
    </section>
  )
}
