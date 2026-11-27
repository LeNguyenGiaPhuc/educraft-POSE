import { Link } from 'react-router'
import type { TeacherStudentProgressResult } from '../../../lib/api/teacher/results'
import { teacherWorkspacePath } from '../../../lib/api/teacher/workspace'
import { EmptyState } from '../insights/TeacherUI'
import { formatPercentage } from '../insights/insightSemantics'
import { buildProgressPoints } from './progressModel'
import './progress.css'

function resultPath(progress: TeacherStudentProgressResult, submissionId: string): string {
  const query = new URLSearchParams({
    tab: 'submissions',
    submissionId,
    submissionKind: 'EXERCISE',
  })
  return `${teacherWorkspacePath(progress.classroomSubject.classroom.id, progress.classroomSubject.id)}?${query.toString()}`
}

export function StudentProgress({ progress }: { progress: TeacherStudentProgressResult }) {
  const points = buildProgressPoints(progress)

  return (
    <section className="ti-card">
      <h2>Xu hướng điểm bài được giao</h2>
      <p className="ti-muted">Chỉ gồm Quiz và tự luận đã chấm. Tự ôn và kiểm tra vở không được cộng vào biểu đồ điểm.</p>
      {points.length === 0 ? (
        <EmptyState title="Chưa có kết quả chấm hợp lệ" detail="Khi có Quiz hoặc tự luận đã chấm, xu hướng sẽ xuất hiện tại đây." />
      ) : (
        <>
          <div className="ti-chart" role="img" aria-label={points.map((point) => `${point.occurredAt.slice(0, 10)}: ${formatPercentage(point.percentage)}`).join('; ')}>
            {points.map((point) => {
              const percent = point.percentage === null ? null : Math.round(point.percentage)
              return <div className="ti-bar-item" key={point.id}><span>{formatPercentage(point.percentage)}</span><div className={`ti-bar ${percent !== null && percent < 50 ? 'low' : ''} ${percent === null ? 'unavailable' : ''}`} style={{ height: `${percent === null ? 4 : Math.max(4, percent)}%` }} /><small>{point.occurredAt.slice(5, 10)}</small></div>
            })}
          </div>
          <div className="ti-table-wrap ti-chart-data">
            <table className="ti-table">
              <caption>Dữ liệu xu hướng điểm theo thời gian</caption>
              <thead><tr><th>Ngày</th><th>Bài học</th><th>Điểm</th><th>Tỷ lệ</th></tr></thead>
              <tbody>{points.map((point) => <tr key={`table-${point.id}`}><td>{point.occurredAt.slice(0, 10)}</td><td>{point.lessonTitle}</td><td>{point.earnedPoints === null || point.maxPoints === null ? 'Chưa có dữ liệu' : `${point.earnedPoints}/${point.maxPoints}`}</td><td>{formatPercentage(point.percentage)}</td></tr>)}</tbody>
            </table>
          </div>
          <h3>Dấu hiệu theo bài học</h3>
          <p className="ti-muted">Dấu hiệu gặp khó được tổng hợp từ các kết quả đã chấm; đây là căn cứ hỗ trợ dạy học, không phải kết luận năng lực.</p>
          {progress.lessons.map((lesson) => (
            <details className="tw-evidence" key={lesson.lessonId}>
              <summary>{lesson.title} · {lesson.hasDifficulty ? 'Có đánh dấu khó' : 'Không đánh dấu khó'}</summary>
              {lesson.results.length === 0 ? <p>Chưa có kết quả chấm.</p> : <ul>{lesson.results.map((result) => {
                const summary = `${result.occurredAt.slice(0, 10)} · ${result.earnedPoints ?? '—'}/${result.maxPoints ?? '—'} điểm · ${formatPercentage(result.percentage)}`
                return <li key={result.id}>{result.exerciseSubmissionId ? <Link to={resultPath(progress, result.exerciseSubmissionId)}>{summary}</Link> : summary}</li>
              })}</ul>}
            </details>
          ))}
        </>
      )}
    </section>
  )
}
