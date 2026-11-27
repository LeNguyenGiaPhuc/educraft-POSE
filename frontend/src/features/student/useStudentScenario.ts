import { useSearchParams } from 'react-router'
import type { StudentScenario } from './fixtures'
import { useApiData } from '../../api/useApiData'
import type { StudentWorkspace } from '../../api/client'

export function useStudentScenario() {
  const [params, setParams] = useSearchParams()
  const { data } = useApiData<StudentWorkspace>('/student/workspace')
  const hasHistory = Boolean(data?.history.length)
  const requested = params.get('class') === 'history' || params.get('scenario') === 'history-only' ? 'history-only' : 'current'
  const scenario: StudentScenario = data?.current ? requested : hasHistory && requested === 'history-only' ? 'history-only' : 'unassigned'

  function setScenario(next: StudentScenario) {
    const updated = new URLSearchParams(params)
    updated.delete('scenario')
    if (next === 'history-only') updated.set('class', 'history')
    else updated.delete('class')
    setParams(updated)
  }

  return { scenario, setScenario }
}
