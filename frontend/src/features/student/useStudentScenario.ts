import { useSearchParams } from 'react-router'
import type { StudentScenario } from './fixtures'

const scenarios: StudentScenario[] = ['current', 'unassigned', 'history-only']

export function useStudentScenario() {
  const [params, setParams] = useSearchParams()
  const requested = params.get('scenario')
  const scenario: StudentScenario = scenarios.find((item) => item === requested) ?? 'current'

  function setScenario(next: StudentScenario) {
    const updated = new URLSearchParams(params)
    if (next === 'current') updated.delete('scenario')
    else updated.set('scenario', next)
    setParams(updated)
  }

  return { scenario, setScenario }
}
