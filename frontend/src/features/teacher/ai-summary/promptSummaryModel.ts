import type { TeacherPromptTopicItem } from '../../../lib/api/teacher/results'
import type { PromptSummaryStats, PromptSummaryTopic } from './promptSummaryTypes'

export function buildTopicStats(items: TeacherPromptTopicItem[]): Map<string, PromptSummaryStats> {
  const stats = new Map<string, PromptSummaryStats>()
  for (const item of items) {
    const current = stats.get(item.student.id)
    const occurrenceCount = item.topics.reduce((total, topic) => total + topic.count, 0)
    stats.set(item.student.id, {
      entryCount: (current?.entryCount ?? 0) + 1,
      topicCount: (current?.topicCount ?? 0) + item.topics.length,
      occurrenceCount: (current?.occurrenceCount ?? 0) + occurrenceCount,
      promptCount: (current?.promptCount ?? 0) + item.promptCount,
      latestPeriodEnd: current && current.latestPeriodEnd > item.periodEnd ? current.latestPeriodEnd : item.periodEnd,
      latestGeneratedAt: current && current.latestGeneratedAt > item.generatedAt ? current.latestGeneratedAt : item.generatedAt,
    })
  }
  return stats
}

export function flattenTopics(items: TeacherPromptTopicItem[]): PromptSummaryTopic[] {
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
        promptCount: summary.promptCount,
        generatedAt: summary.generatedAt,
      })
    }
  }
  return topics
}
