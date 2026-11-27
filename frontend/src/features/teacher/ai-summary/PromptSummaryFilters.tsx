import { Search } from 'lucide-react'
import type { TeacherAssignedSubject, TeacherClassroomSummary } from '../../../lib/api/teacher/types'

type Props = {
  searchTerm: string
  selectedClassId: string
  selectedSubjectId: string
  classes: TeacherClassroomSummary[]
  subjects: TeacherAssignedSubject[]
  onSearchChange: (value: string) => void
  onClassChange: (value: string) => void
  onSubjectChange: (value: string) => void
}

export function PromptSummaryFilters({
  searchTerm,
  selectedClassId,
  selectedSubjectId,
  classes,
  subjects,
  onSearchChange,
  onClassChange,
  onSubjectChange,
}: Props) {
  return (
    <div className="ai-filter-toolbar">
      <div className="ai-search-box">
        <Search size={16} />
        <input
          type="text"
          aria-label="Tìm tên học sinh"
          placeholder="Tìm tên học sinh..."
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </div>

      <div className="ai-class-selector">
        <label htmlFor="ai-class-filter">Lớp giảng dạy:</label>
        <select id="ai-class-filter" value={selectedClassId} onChange={(event) => onClassChange(event.target.value)}>
          {classes.map((classroom) => (
            <option key={classroom.id} value={classroom.id}>
              {classroom.name} ({classroom.academicYear})
            </option>
          ))}
        </select>
      </div>

      <div className="ai-class-selector">
        <label htmlFor="ai-subject-filter">Môn phụ trách:</label>
        <select id="ai-subject-filter" value={selectedSubjectId} onChange={(event) => onSubjectChange(event.target.value)}>
          {subjects.map((subject) => (
            <option key={subject.id} value={subject.id}>{subject.name}</option>
          ))}
        </select>
      </div>
    </div>
  )
}
