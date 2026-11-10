import type { ComponentType } from 'react'
import { ActivitiesPage } from './activities/ActivitiesPage'
import { AssistantPage } from './assistant/AssistantPage'
import { ChatHistoryPage } from './assistant/ChatHistoryPage'
import { CalendarPage } from './calendar/CalendarPage'
import { PracticePage } from './practice/PracticePage'
import { ProfilePage } from './profile/ProfilePage'
import { ResultsPage } from './results/ResultsPage'
import { SubjectsPage } from './subjects/SubjectsPage'
import { SummaryPage } from './summary/SummaryPage'

export const studentPages: Record<string, ComponentType> = {
  subjects: SubjectsPage,
  activities: ActivitiesPage,
  practice: PracticePage,
  results: ResultsPage,
  profile: ProfilePage,
  calendar: CalendarPage,
  summary: SummaryPage,
  assistant: AssistantPage,
  'chat-history': ChatHistoryPage,
}
