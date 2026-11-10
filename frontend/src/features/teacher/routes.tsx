import type { ComponentType } from 'react'
import { ActivitiesPage } from './activities/ActivitiesPage'
import { PromptSummaryPage } from './ai-summary/PromptSummaryPage'
import { AssignedClassesPage } from './classes/AssignedClassesPage'
import { LessonsPage } from './lessons/LessonsPage'
import { ProgressPage } from './progress/ProgressPage'
import { SchedulePage } from './schedule/SchedulePage'
import { ClassStatisticsPage } from './statistics/ClassStatisticsPage'
import { SubmissionsPage } from './submissions/SubmissionsPage'

export const teacherPages: Record<string, ComponentType> = {
  classes: AssignedClassesPage,
  lessons: LessonsPage,
  activities: ActivitiesPage,
  schedule: SchedulePage,
  statistics: ClassStatisticsPage,
  submissions: SubmissionsPage,
  progress: ProgressPage,
  'ai-summary': PromptSummaryPage,
}
