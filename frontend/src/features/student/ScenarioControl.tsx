import { useStudentScenario } from './useStudentScenario'
import { useApiData } from '../../api/useApiData'
import type { StudentWorkspace } from '../../api/client'
import './scenario.css'

export function StudentScenarioControl() {
  const { scenario, setScenario } = useStudentScenario()
  const { data, loading } = useApiData<StudentWorkspace>('/student/workspace')
  if (loading || !data) return null
  return <label className="student-scenario">Phạm vi lớp
    <select value={scenario === 'history-only' ? 'history' : data.current ? 'current' : 'unassigned'} onChange={(event) => setScenario(event.target.value === 'history' ? 'history-only' : 'current')}>
      {data.current && <option value="current">Lớp hiện tại · {data.current.classroom.name}</option>}
      {data.history.length > 0 && <option value="history">Lớp đã học · chỉ xem</option>}
      {!data.current && !data.history.length && <option value="unassigned">Chưa được phân lớp</option>}
    </select>
  </label>
}
