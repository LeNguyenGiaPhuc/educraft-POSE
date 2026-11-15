import { useEffect, useState } from 'react'
import { AlertCircle, ArrowLeft, Archive, BookOpen, RotateCcw, School, Users } from 'lucide-react'
import { Link } from 'react-router'
import { ApiError } from '../../../lib/api/client'
import { teacherWorkspaceApi } from '../../../lib/api/teacher/workspace'
import type { TeacherClassroomDetail } from '../../../lib/api/teacher/types'
import './classes.css'

type Props = {
  classroomId: string
}

export function TeacherClassroomDetailPage({ classroomId }: Props) {
  const [classroom, setClassroom] = useState<TeacherClassroomDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  function retryLoad() {
    setIsLoading(true)
    setLoadError('')
    setClassroom(null)

    teacherWorkspaceApi.getClassroom(classroomId)
      .then(setClassroom)
      .catch((error) => {
        setLoadError(error instanceof ApiError ? error.message : 'Không thể tải chi tiết lớp học.')
      })
      .finally(() => setIsLoading(false))
  }

  useEffect(() => {
    let cancelled = false

    teacherWorkspaceApi.getClassroom(classroomId)
      .then((data) => {
        if (!cancelled) setClassroom(data)
      })
      .catch((error) => {
        if (!cancelled) {
          setLoadError(error instanceof ApiError ? error.message : 'Không thể tải chi tiết lớp học.')
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [classroomId])

  if (isLoading) {
    return <div className="page-content tc-page"><p>Đang tải chi tiết lớp học...</p></div>
  }

  if (loadError) {
    return (
      <div className="page-content tc-page">
        <Link className="tc-back-link" to="/teacher/classes"><ArrowLeft size={15} /> Quay lại lớp của tôi</Link>
        <div className="panel tc-empty" role="alert">
          <AlertCircle size={28} />
          <h2>Không thể tải lớp học</h2>
          <p>{loadError}</p>
          <button type="button" onClick={retryLoad}>
            <RotateCcw size={14} /> Thử lại
          </button>
        </div>
      </div>
    )
  }

  if (!classroom) return null

  return (
    <div className="page-content tc-page">
      <Link className="tc-back-link" to="/teacher/classes"><ArrowLeft size={15} /> Quay lại lớp của tôi</Link>

      <header className="tw-class-header tc-detail-header">
        <div>
          <div className="tc-status-line">
            {classroom.readOnly ? <Archive size={14} /> : <School size={14} />}
            {classroom.readOnly ? 'LỊCH SỬ GIẢNG DẠY' : 'LỚP HIỆN TẠI'}
          </div>
          <h1>{classroom.name}</h1>
          <p>Khối {classroom.gradeLevel} · Năm học {classroom.academicYear} · {classroom.students.length} học sinh</p>
        </div>
        <span className={`tc-status-pill ${classroom.readOnly ? 'is-archived' : 'is-active'}`}>
          {classroom.readOnly ? 'Chỉ xem' : 'Đang hoạt động'}
        </span>
      </header>

      {classroom.readOnly && (
        <div className="tc-archive-notice" role="status">
          <Archive size={16} />
          <span>Lớp đã lưu trữ. Bạn vẫn xem được dữ liệu lịch sử nhưng không thể thay đổi nội dung.</span>
        </div>
      )}

      <section className="panel tc-api-section">
        <div className="tc-section-title">
          <BookOpen size={18} />
          <h2>Môn học được phân công</h2>
          <span>{classroom.subjects.length} môn</span>
        </div>
        {classroom.subjects.length === 0 ? (
          <p className="tc-muted">Lớp chưa có môn học được phân công cho bạn.</p>
        ) : (
          <div className="tc-subject-list">
            {classroom.subjects.map((subject) => (
              <div key={subject.id} className="tc-subject-row">
                <BookOpen size={17} />
                <div>
                  <strong>{subject.name}</strong>
                  <small>Môn học đã được phân công cho bạn</small>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="panel tc-api-section">
        <div className="tc-section-title">
          <Users size={18} />
          <h2>{classroom.readOnly ? 'Lịch sử học sinh' : 'Học sinh trong lớp'}</h2>
          <span>{classroom.students.length} học sinh</span>
        </div>
        {classroom.students.length === 0 ? (
          <p className="tc-muted">Chưa có dữ liệu học sinh.</p>
        ) : (
          <ul className="tc-roster">
            {classroom.students.map((student) => (
              <li key={`${student.id}-${student.joinedAt ?? 'membership'}`}>
                <strong>{student.name}</strong>
                <span>@{student.username}</span>
                {classroom.readOnly && student.leftAt && <span>Rời lớp: {formatDate(student.leftAt)}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value))
}
