import { useEffect, useState } from 'react'
import { AlertCircle, RotateCcw } from 'lucide-react'
import { useParams } from 'react-router'
import { ApiError } from '../../../lib/api/client'
import { teacherResultsApi, type TeacherStudentProgressResult } from '../../../lib/api/teacher/results'
import { teacherWorkspacePath } from '../../../lib/api/teacher/workspace'
import { TeacherBackButton } from '../components/TeacherBackButton'
import { InfoNotice } from '../insights/TeacherUI'
import { StudentProgress } from '../progress/ProgressPage'
import '../classes/classes.css'

function studentError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) return 'Bạn không còn quyền xem học sinh trong môn này.'
    if (error.status === 404) return 'Không tìm thấy học sinh trong lớp được phân công.'
    return error.message
  }
  return 'Không thể tải tiến độ học sinh. Hãy thử lại.'
}

export function StudentDetailPage() {
  const { classroomId, classroomSubjectId, studentId } = useParams()
  const [progress, setProgress] = useState<TeacherStudentProgressResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const parent = classroomId && classroomSubjectId
    ? `${teacherWorkspacePath(classroomId, classroomSubjectId)}?tab=students`
    : '/teacher/classes'

  useEffect(() => {
    if (!classroomSubjectId || !studentId) {
      setIsLoading(false)
      return
    }
    let cancelled = false
    setIsLoading(true)
    setLoadError('')
    teacherResultsApi.getStudentProgress(classroomSubjectId, studentId)
      .then((result) => {
        if (!cancelled) setProgress(result)
      })
      .catch((error) => {
        if (!cancelled) {
          setProgress(null)
          setLoadError(studentError(error))
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => { cancelled = true }
  }, [classroomSubjectId, studentId, reloadKey])

  if (isLoading) return <div className="page-content tw-page"><p>Đang tải tiến độ học sinh...</p></div>

  if (loadError || !progress) {
    return (
      <div className="page-content tw-page">
        <TeacherBackButton fallbackTo={parent} />
        <div className="panel tc-empty" role="alert"><AlertCircle size={28} /><h2>Không thể tải hồ sơ học sinh</h2><p>{loadError || 'Thiếu thông tin học sinh.'}</p><button type="button" onClick={() => setReloadKey((value) => value + 1)}><RotateCcw size={14} /> Thử lại</button></div>
      </div>
    )
  }

  const context = progress.classroomSubject
  return (
    <div className="page-content tw-page">
      <TeacherBackButton fallbackTo={parent} />
      <div className="page-heading"><h1>{progress.student.fullName}</h1><p>{context.classroom.name} · {context.subject.name} · {context.classroom.academicYear}</p></div>
      <InfoNotice>Dữ liệu tiến độ được tải từ backend. Kiểm tra vở được giữ riêng và không cộng vào xu hướng điểm.</InfoNotice>
      <StudentProgress progress={progress} />
    </div>
  )
}
