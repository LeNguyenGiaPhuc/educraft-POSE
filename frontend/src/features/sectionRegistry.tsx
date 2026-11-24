import type { ComponentType } from 'react'
import type { Role } from '../data/demo'
import { adminPages } from './admin/routes'
import { studentPages } from './student/routes'

export const sectionPages: Record<Role, Record<string, ComponentType>> = {
  admin: adminPages,
  // Teacher navigation is rendered by teacherRouteElements in App.tsx.
  // Keep an empty entry so the generic SectionPage remains safe for all roles.
  teacher: {},
  student: studentPages,
}
