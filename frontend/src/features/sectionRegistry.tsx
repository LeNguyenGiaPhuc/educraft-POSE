import type { ComponentType } from 'react'
import type { Role } from '../data/demo'
import { adminPages } from './admin/routes'
import { studentPages } from './student/routes'
import { teacherPages } from './teacher/routes'

export const sectionPages: Record<Role, Record<string, ComponentType>> = {
  admin: adminPages,
  teacher: teacherPages,
  student: studentPages,
}
