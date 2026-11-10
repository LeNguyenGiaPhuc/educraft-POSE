import type { StudentScenario } from './fixtures'
import { useStudentScenario } from './useStudentScenario'
import './scenario.css'

export function StudentScenarioControl() {
  const { scenario, setScenario } = useStudentScenario()
  return <label className="student-scenario">Tình huống xem trước
    <select value={scenario} onChange={(event) => setScenario(event.target.value as StudentScenario)}>
      <option value="current">Đang học lớp 11A2</option>
      <option value="unassigned">Chưa được phân lớp</option>
      <option value="history-only">Chỉ có lớp đã học</option>
    </select>
  </label>
}
