import type { ComponentType } from 'react'
import { AccountsPage } from './accounts/AccountsPage'
import { ClassroomsPage } from './classrooms/ClassroomsPage'
import { ClassroomSubjectsPage } from './subjects/ClassroomSubjectsPage'
import './admin.css'

export const adminPages: Record<string, ComponentType> = {
  accounts: AccountsPage,
  classrooms: ClassroomsPage,
  subjects: ClassroomSubjectsPage,
}
