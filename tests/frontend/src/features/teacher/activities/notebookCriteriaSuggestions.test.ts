import { describe, expect, it } from 'vitest'
import { mergeNotebookCriteriaSuggestions } from '../../../../../../frontend/src/features/teacher/activities/notebookCriteriaSuggestions'

describe('Notebook criteria suggestions', () => {
  it('adds one suggestion at a time without case-insensitive duplicates', () => {
    expect(mergeNotebookCriteriaSuggestions(
      [{ id: 'one', content: 'Ghi đủ các mốc chính' }],
      [{ content: 'ghi đủ các mốc chính' }, { content: 'Nêu ý nghĩa' }],
    )).toEqual([
      { id: 'one', content: 'Ghi đủ các mốc chính' },
      { id: 'suggestion-1', content: 'Nêu ý nghĩa' },
    ])
  })

  it('keeps suggestion ids unique after deleting and adding rows', () => {
    const first = mergeNotebookCriteriaSuggestions([], [{ content: 'A' }, { content: 'B' }])
    const afterDelete = first.filter((criterion) => criterion.content !== 'A')

    expect(mergeNotebookCriteriaSuggestions(afterDelete, [{ content: 'C' }])).toEqual([
      { id: 'suggestion-2', content: 'B' },
      { id: 'suggestion-3', content: 'C' },
    ])
  })
})
