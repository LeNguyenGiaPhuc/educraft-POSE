import { useMemo, useState } from 'react'
import { useParams, Link } from 'react-router'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Filter,
  MessageSquareOff,
  Search,
  Sparkles,
  Users,
} from 'lucide-react'
import { assignedClasses, currentTeacherId } from '../fixtures'
import { promptTopics } from '../insights/fixtures'
import { PreviewNotice } from '../insights/TeacherUI'
import './ai-summary.css'

export const CURRENT_ACADEMIC_YEAR = '2026–2027'

export function PromptSummaryPage() {
  const { studentId } = useParams<{ studentId?: string }>()

  // 1. Valid Active Classes of Current Academic Year where Current Teacher is assigned
  const activeAssignedClasses = useMemo(() => {
    return assignedClasses.filter(
      (classroom) =>
        classroom.status !== 'ARCHIVED' &&
        classroom.academicYear === CURRENT_ACADEMIC_YEAR &&
        classroom.subjects.some((subject) => subject.teacherId === currentTeacherId)
    )
  }, [])

  // 2. Allowed Subject IDs
  const allowedSubjectIds = useMemo(() => {
    const ids = new Set<string>()
    for (const c of activeAssignedClasses) {
      for (const s of c.subjects) {
        if (s.teacherId === currentTeacherId) {
          ids.add(s.id)
        }
      }
    }
    return ids
  }, [activeAssignedClasses])

  // 3. Allowed Students List
  const allowedStudents = useMemo(() => {
    const list: {
      studentId: string
      studentName: string
      classroomId: string
      classroomName: string
      subjectId: string
      subjectName: string
    }[] = []

    for (const c of activeAssignedClasses) {
      const mySubjects = c.subjects.filter((s) => s.teacherId === currentTeacherId)
      for (const student of c.students) {
        for (const sub of mySubjects) {
          list.push({
            studentId: student.id,
            studentName: student.name,
            classroomId: c.id,
            classroomName: c.name,
            subjectId: sub.id,
            subjectName: sub.name,
          })
        }
      }
    }
    return list
  }, [activeAssignedClasses])

  // Filters State for List View
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL')
  const [searchTerm, setSearchTerm] = useState('')

  // Group topics by student to compute counts (called unconditionally)
  const studentTopicStats = useMemo(() => {
    const map = new Map<string, { count: number; latestDate: string }>()
    for (const topic of promptTopics) {
      if (allowedSubjectIds.has(topic.subjectId)) {
        const prev = map.get(topic.studentId)
        if (!prev) {
          map.set(topic.studentId, { count: 1, latestDate: topic.askedAt })
        } else {
          map.set(topic.studentId, {
            count: prev.count + 1,
            latestDate: topic.askedAt > prev.latestDate ? topic.askedAt : prev.latestDate,
          })
        }
      }
    }
    return map
  }, [allowedSubjectIds])

  // Filtered Students (called unconditionally)
  const filteredStudents = useMemo(() => {
    return allowedStudents.filter((item) => {
      const matchClass = selectedClassId === 'ALL' || item.classroomId === selectedClassId
      const term = searchTerm.trim().toLowerCase()
      const matchSearch =
        !term ||
        item.studentName.toLowerCase().includes(term) ||
        item.classroomName.toLowerCase().includes(term)
      return matchClass && matchSearch
    })
  }, [allowedStudents, selectedClassId, searchTerm])

  // ==========================================
  // VIEW 1: CHI TIẾT CHỦ ĐỀ CỦA MỘT HỌC SINH
  // ==========================================
  if (studentId) {
    const studentInfo = allowedStudents.find((s) => s.studentId === studentId)

    if (!studentInfo) {
      return (
        <div className="page-content tc-page">
          <div className="panel tc-empty" role="alert">
            <AlertCircle size={32} />
            <h2>Học sinh không thuộc phạm vi quản lý</h2>
            <p>
              Học sinh không tồn tại hoặc không thuộc lớp đang hoạt động trong năm học {CURRENT_ACADEMIC_YEAR} mà bạn được phân công.
            </p>
            <Link to="/teacher/ai-summary" className="tc-back-link-btn">
              <ArrowLeft size={16} /> Quay lại danh sách chủ đề
            </Link>
          </div>
        </div>
      )
    }

    // Get topics strictly in teacher's assigned subjects for this student
    const studentTopics = promptTopics.filter(
      (topic) => topic.studentId === studentId && allowedSubjectIds.has(topic.subjectId)
    )

    return (
      <div className="page-content tc-page">
        <div className="tc-breadcrumb">
          <Link to="/teacher/ai-summary" className="tc-back-link">
            <ArrowLeft size={16} /> Quay lại danh sách học sinh hỏi AI
          </Link>
        </div>

        <div className="page-heading">
          <span className="eyebrow">
            <span className="eyebrow-line" /> TỔNG HỢP TRỢ LÝ HỌC TẬP
          </span>
          <h1>Chủ đề học sinh đã hỏi: {studentInfo.studentName}</h1>
          <p>
            Lớp {studentInfo.classroomName} · Môn {studentInfo.subjectName} · Năm học {CURRENT_ACADEMIC_YEAR}
          </p>
        </div>

        <PreviewNotice>
          Chỉ thống kê chủ đề học tập được gán rõ cho môn bạn đang phụ trách. Hệ thống tuyệt đối không lưu hoặc hiển thị nguyên văn hội thoại (chat), suy đoán tâm lý hay nhận xét năng lực.
        </PreviewNotice>

        <section className="panel" style={{ marginTop: 20 }}>
          <div className="tc-section-title">
            <Sparkles size={18} />
            <h2>Danh sách chủ đề đã hỏi ({studentTopics.length})</h2>
          </div>

          {studentTopics.length === 0 ? (
            <div className="panel tc-empty" style={{ padding: '36px 20px' }}>
              <MessageSquareOff size={28} />
              <h3>Chưa ghi nhận chủ đề nào</h3>
              <p>Học sinh chưa đặt câu hỏi nào thuộc môn {studentInfo.subjectName} trong dữ liệu mẫu.</p>
            </div>
          ) : (
            <div className="ai-topic-list">
              {studentTopics.map((item) => (
                <div key={item.id} className="ai-topic-card">
                  <div className="ai-topic-header">
                    <span className="ai-topic-badge">Chủ đề kiến thức</span>
                    <span className="ai-topic-date">Ghi nhận: {item.askedAt}</span>
                  </div>
                  <h3 className="ai-topic-title">{item.topic}</h3>
                  <div className="ai-topic-footer">
                    <BookOpen size={14} />
                    <span>Môn {studentInfo.subjectName} · Lớp {studentInfo.classroomName}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    )
  }

  // ==========================================
  // VIEW 2: DANH SÁCH CHỦ ĐỀ THEO BỘ LỌC LỚP
  // ==========================================
  return (
    <div className="page-content tc-page">
      <div className="page-heading">
        <span className="eyebrow">
          <span className="eyebrow-line" /> THEO DÕI HỌC TẬP
        </span>
        <h1>Chủ đề học sinh hỏi AI</h1>
        <p>
          Danh sách học sinh và các chủ đề đặt câu hỏi cho trợ lý AI thuộc môn và lớp bạn đang giảng dạy trong năm học {CURRENT_ACADEMIC_YEAR}.
        </p>
      </div>

      <PreviewNotice>
        Dữ liệu minh họa phạm vi giáo viên đang phụ trách. Không hiển thị tin nhắn riêng tư, suy đoán hành vi hay đánh giá năng lực học sinh.
      </PreviewNotice>

      {/* Filter and Search Bar */}
      <div className="ai-filter-toolbar">
        <div className="ai-search-box">
          <Search size={16} />
          <input
            type="text"
            placeholder="Tìm tên học sinh hoặc lớp..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="ai-class-selector">
          <Filter size={15} />
          <label htmlFor="ai-class-filter">Lớp giảng dạy:</label>
          <select
            id="ai-class-filter"
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
          >
            <option value="ALL">Tất cả lớp ({activeAssignedClasses.length} lớp)</option>
            {activeAssignedClasses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.academicYear})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Students Table */}
      {filteredStudents.length === 0 ? (
        <div className="panel tc-empty" style={{ padding: '40px 20px' }}>
          <Users size={28} />
          <h3>Không tìm thấy học sinh</h3>
          <p>Không có học sinh nào phù hợp với bộ lọc lớp hoặc từ khóa tìm kiếm.</p>
        </div>
      ) : (
        <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="ti-table-wrap">
            <table className="ti-table">
              <thead>
                <tr>
                  <th>Học sinh</th>
                  <th>Lớp</th>
                  <th>Môn học phụ trách</th>
                  <th>Số chủ đề hỏi AI</th>
                  <th>Ghi nhận gần nhất</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((item) => {
                  const stats = studentTopicStats.get(item.studentId)
                  const hasTopics = Boolean(stats && stats.count > 0)
                  return (
                    <tr key={`${item.classroomId}-${item.studentId}`}>
                      <td>
                        <strong>{item.studentName}</strong>
                      </td>
                      <td>
                        <span className="ai-badge-class">{item.classroomName}</span>
                      </td>
                      <td>{item.subjectName}</td>
                      <td>
                        {hasTopics ? (
                          <span className="ai-chip-topics">{stats?.count} chủ đề</span>
                        ) : (
                          <span className="ai-chip-none">0 chủ đề</span>
                        )}
                      </td>
                      <td>
                        <span style={{ fontSize: 12, color: '#688271' }}>
                          {stats ? stats.latestDate : 'Chưa có'}
                        </span>
                      </td>
                      <td>
                        <Link
                          to={`/teacher/ai-summary/${item.studentId}`}
                          className="ai-btn-view"
                        >
                          Xem chủ đề <ArrowRight size={13} />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
