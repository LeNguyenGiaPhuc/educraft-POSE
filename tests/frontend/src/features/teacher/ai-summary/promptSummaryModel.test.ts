import { describe, expect, it } from 'vitest'
import { buildTopicStats, flattenTopics } from '../../../../../../frontend/src/features/teacher/ai-summary/promptSummaryModel'
import type { TeacherPromptTopicItem } from '../../../../../../frontend/src/lib/api/teacher/results'

const items: TeacherPromptTopicItem[] = [
  {
    id: 'summary-1',
    student: { id: 'student-1', username: 'an', fullName: 'An' },
    periodStart: '2026-11-01', periodEnd: '2026-11-07', promptCount: 5, generatedAt: '2026-11-08T01:00:00.000Z',
    topics: [{ label: 'Đổi mới', count: 3 }],
  },
  {
    id: 'summary-2',
    student: { id: 'student-1', username: 'an', fullName: 'An' },
    periodStart: '2026-11-08', periodEnd: '2026-11-14', promptCount: 4, generatedAt: '2026-11-15T01:00:00.000Z',
    topics: [{ label: 'Đổi mới', count: 2 }, { label: 'Kinh tế', count: 1 }],
  },
]

describe('prompt summary model', () => {
  it('keeps entry, topic, occurrence and prompt counts distinct', () => {
    const stats = buildTopicStats(items).get('student-1')

    expect(stats).toEqual({
      entryCount: 2,
      topicCount: 3,
      occurrenceCount: 6,
      promptCount: 9,
      latestPeriodEnd: '2026-11-14',
      latestGeneratedAt: '2026-11-15T01:00:00.000Z',
    })
  })

  it('keeps repeated labels from different periods as separate entries', () => {
    const topics = flattenTopics(items)

    expect(topics).toHaveLength(3)
    expect(topics.filter((topic) => topic.label === 'Đổi mới').map((topic) => topic.periodEnd)).toEqual(['2026-11-07', '2026-11-14'])
    expect(topics[0].promptCount).toBe(5)
  })
})
