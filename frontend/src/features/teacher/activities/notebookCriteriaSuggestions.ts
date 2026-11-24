export type NotebookCriterionDraft = { id: string; content: string }
export type NotebookCriteriaSuggestion = { content: string }

export function mergeNotebookCriteriaSuggestions(
  current: NotebookCriterionDraft[],
  suggestions: NotebookCriteriaSuggestion[]
): NotebookCriterionDraft[] {
  const result = [...current]
  const existing = new Set(current.map((criterion) => criterion.content.trim().toLocaleLowerCase('vi')))

  for (const suggestion of suggestions) {
    const content = suggestion.content.trim()
    const normalized = content.toLocaleLowerCase('vi')
    if (!content || existing.has(normalized)) continue
    existing.add(normalized)
    const usedIds = new Set(result.map((criterion) => criterion.id))
    let suggestionIndex = result.reduce((highest, criterion) => {
      const match = criterion.id.match(/^suggestion-(\d+)$/)
      return match ? Math.max(highest, Number(match[1])) : highest
    }, 0) + 1
    let id = `suggestion-${suggestionIndex}`
    while (usedIds.has(id)) {
      suggestionIndex += 1
      id = `suggestion-${suggestionIndex}`
    }
    result.push({ id, content })
  }

  return result
}
