import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, ArrowLeft, LoaderCircle, RotateCcw } from 'lucide-react'
import { Link, useParams, useSearchParams } from 'react-router'
import { ApiError } from '../../../lib/api/client'
import { teacherResultsApi, type TeacherPromptTopicItem } from '../../../lib/api/teacher/results'
import type { TeacherClassroomSummary, TeacherSubjectStudent } from '../../../lib/api/teacher/types'
import { teacherWorkspaceApi } from '../../../lib/api/teacher/workspace'
import { PreviewNotice } from '../insights/TeacherUI'
import { PromptSummaryDetail } from './PromptSummaryDetail'
import { PromptSummaryFilters } from './PromptSummaryFilters'
import { PromptSummaryList } from './PromptSummaryList'
import type { PromptSummaryStats, PromptSummaryStudent, PromptSummaryTopic } from './promptSummaryTypes'
import './ai-summary.css'

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) return 'Bạn không còn quyền xem chủ đề của môn học này.'
    if (error.status === 404) return 'Không tìm thấy học sinh hoặc môn học được phân công.'
    return error.message
  }
  return 'Không thể tải tổng hợp chủ đề. Hãy thử lại.'
}

function buildStudent(
  student: TeacherSubjectStudent,
  classroom: TeacherClassroomSummary,
  subjectId: string,
  subjectName: string
): PromptSummaryStudent {
  return {
    studentId: student.id,
    studentName: student.name,
    classroomId: classroom.id,
    classroomName: classroom.name,
    subjectId,
    subjectName,
  }
}

function buildTopicStats(items: TeacherPromptTopicItem[]): Map<string, PromptSummaryStats> {
  const stats = new Map<string, PromptSummaryStats>()
  for (const item of items) {
    const current = stats.get(item.student.id)
    const topicCount = item.topics.length
    stats.set(item.student.id, {
      count: (current?.count ?? 0) + topicCount,
      latestDate: current && current.latestDate > item.periodEnd ? current.latestDate : item.periodEnd,
    })
  }
  return stats
}

function flattenTopics(items: TeacherPromptTopicItem[]): PromptSummaryTopic[] {
  const topics: PromptSummaryTopic[] = []
  for (const summary of items) {
    for (let index = 0; index < summary.topics.length; index += 1) {
      const topic = summary.topics[index]
      topics.push({
        id: `${summary.id}-${index}`,
        label: topic.label,
        count: topic.count,
        periodStart: summary.periodStart,
        periodEnd: summary.periodEnd,
      })
    }
  }
  return topics
}

export function PromptSummaryPage() {
  const { studentId } = useParams<{ studentId?: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const [classrooms, setClassrooms] = useState<TeacherClassroomSummary[]>([])
  const [roster, setRoster] = useState<TeacherSubjectStudent[]>([])
  const [topicItems, setTopicItems] = useState<TeacherPromptTopicItem[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoadingClasses, setIsLoadingClasses] = useState(true)
  const [isLoadingTopics, setIsLoadingTopics] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setIsLoadingClasses(true)
    teacherWorkspaceApi.listClassrooms()
      .then((items) => {
        if (!cancelled) {
          setClassrooms(items.filter((item) => item.status === 'ACTIVE'))
          setLoadError('')
        }
      })
      .catch((error) => {
        if (!cancelled) setLoadError(errorMessage(error))
      })
      .finally(() => {
        if (!cancelled) setIsLoadingClasses(false)
      })
    return () => { cancelled = true }
  }, [reloadKey])

  const selectedClassroom = useMemo(() => {
    const requestedId = searchParams.get('classroomId')
    return classrooms.find((item) => item.id === requestedId) ?? classrooms[0]
  }, [classrooms, searchParams])

  const selectedSubject = useMemo(() => {
    const requestedId = searchParams.get('classroomSubjectId')
    return selectedClassroom?.subjects.find((item) => item.id === requestedId) ?? selectedClassroom?.subjects[0]
  }, [selectedClassroom, searchParams])

  useEffect(() => {
    if (!selectedSubject) {
      setRoster([])
      setTopicItems([])
      return
    }

    let cancelled = false
    setIsLoadingTopics(true)
    setLoadError('')
    Promise.all([
      teacherWorkspaceApi.listClassroomSubjectStudents(selectedSubject.id),
      teacherResultsApi.getPromptTopics(selectedSubject.id, studentId ? { studentId } : {}),
    ])
      .then(([students, result]) => {
        if (!cancelled) {
          setRoster(students)
          setTopicItems(result.items)
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setRoster([])
          setTopicItems([])
          setLoadError(errorMessage(error))
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingTopics(false)
      })
    return () => { cancelled = true }
  }, [selectedSubject, studentId, reloadKey])

  const students = useMemo(() => {
    if (!selectedClassroom || !selectedSubject) return []
    return roster.map((student) => buildStudent(student, selectedClassroom, selectedSubject.id, selectedSubject.name))
  }, [roster, selectedClassroom, selectedSubject])

  const visibleStudents = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return students
    return students.filter((student) => student.studentName.toLowerCase().includes(term))
  }, [students, searchTerm])

  const topicStats = useMemo(() => buildTopicStats(topicItems), [topicItems])
  const selectedStudent = studentId ? students.find((student) => student.studentId === studentId) : undefined
  const currentSearch = selectedClassroom && selectedSubject
    ? `?classroomId=${encodeURIComponent(selectedClassroom.id)}&classroomSubjectId=${encodeURIComponent(selectedSubject.id)}`
    : ''

  function selectClass(classroomId: string) {
    const classroom = classrooms.find((item) => item.id === classroomId)
    const nextSubject = classroom?.subjects[0]
    const next = new URLSearchParams()
    next.set('classroomId', classroomId)
    if (nextSubject) next.set('classroomSubjectId', nextSubject.id)
    setSearchParams(next)
  }

  function selectSubject(classroomSubjectId: string) {
    const next = new URLSearchParams(searchParams)
    if (selectedClassroom) next.set('classroomId', selectedClassroom.id)
    next.set('classroomSubjectId', classroomSubjectId)
    setSearchParams(next)
  }

  if (isLoadingClasses || isLoadingTopics) {
    return <div className="page-content tc-page"><div className="panel tc-empty"><LoaderCircle size={28} className="spin" /><h2>Đang tải chủ đề học tập...</h2></div></div>
  }

  if (loadError) {
    return (
      <div className="page-content tc-page">
        <div className="panel tc-empty" role="alert">
          <AlertCircle size={30} />
          <h2>Không thể tải dữ liệu</h2>
          <p>{loadError}</p>
          <button type="button" className="ti-button" onClick={() => setReloadKey((value) => value + 1)}><RotateCcw size={15} /> Thử lại</button>
        </div>
      </div>
    )
  }

  if (!selectedClassroom || !selectedSubject) {
    return <div className="page-content tc-page"><div className="panel tc-empty"><h2>Chưa có môn học đang hoạt động</h2><p>Chủ đề AI chỉ được tổng hợp cho lớp đang hoạt động mà giáo viên được phân công.</p></div></div>
  }

  if (studentId) {
    if (!selectedStudent) {
      return (
        <div className="page-content tc-page">
          <div className="panel tc-empty" role="alert">
            <AlertCircle size={32} />
            <h2>Học sinh không thuộc phạm vi quản lý</h2>
            <p>Học sinh không thuộc lớp và môn đang được chọn.</p>
            <Link to={`/teacher/ai-summary${currentSearch}`} className="tc-back-link-btn"><ArrowLeft size={16} /> Quay lại danh sách chủ đề</Link>
          </div>
        </div>
      )
    }
    return (
      <PromptSummaryDetail
        student={selectedStudent}
        topics={flattenTopics(topicItems)}
        academicYear={selectedClassroom.academicYear}
        backSearch={currentSearch}
      />
    )
  }

  return (
    <div className="page-content tc-page">
      <div className="page-heading">
        <span className="eyebrow"><span className="eyebrow-line" /> THEO DÕI HỌC TẬP</span>
        <h1>Chủ đề học sinh hỏi AI</h1>
        <p>Danh sách chủ đề tổng hợp theo môn và lớp bạn đang giảng dạy. Hệ thống không hiển thị nguyên văn hội thoại.</p>
      </div>

      <PreviewNotice>
        Dữ liệu được tải từ backend theo phạm vi phân công hiện tại. Học sinh chưa có chủ đề vẫn xuất hiện với số lượng 0.
      </PreviewNotice>

      <PromptSummaryFilters
        searchTerm={searchTerm}
        selectedClassId={selectedClassroom.id}
        selectedSubjectId={selectedSubject.id}
        classes={classrooms}
        subjects={selectedClassroom.subjects}
        onSearchChange={setSearchTerm}
        onClassChange={selectClass}
        onSubjectChange={selectSubject}
      />
      <PromptSummaryList students={visibleStudents} topicStats={topicStats} detailSearch={currentSearch} />
    </div>
  )
}
