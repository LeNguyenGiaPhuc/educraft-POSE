import { prisma } from '../lib/prisma.js'
import { passwordService } from '../modules/auth/password.service.js'

type DemoUserRole = 'ADMIN' | 'TEACHER'

type DemoSeedUserData = {
  username: string
  password_hash: string
  full_name: string
  role: DemoUserRole
  status: 'ACTIVE'
  must_change_password: false
  password_changed_at: Date
  contact: null
}

export type DemoSeedClient = {
  subject: {
    upsert(input: {
      where: { name: string }
      update: { is_active: boolean }
      create: { name: string; is_active: boolean }
    }): Promise<{ id: string }>
  }
  user: {
    upsert(input: {
      where: { username: string }
      update: DemoSeedUserData
      create: DemoSeedUserData
    }): Promise<{ id: string }>
  }
  teacherProfile: {
    upsert(input: {
      where: { teacher_id: string }
      update: { qualification: string; specialized_subject_id: string }
      create: { teacher_id: string; qualification: string; specialized_subject_id: string }
    }): Promise<{ teacher_id: string }>
  }
}

export async function seedDemoUsers(client: DemoSeedClient = prisma): Promise<{
  adminUsername: string
  teacherUsername: string
  subjectName: string
}> {
  const subjectName = 'Lịch sử'
  const subject = await client.subject.upsert({
    where: { name: subjectName },
    update: { is_active: true },
    create: { name: subjectName, is_active: true },
  })

  const passwordHash = await passwordService.hashPassword('demo123')
  const passwordChangedAt = new Date()

  const adminData: DemoSeedUserData = {
    username: 'admin@demo.educraft',
    password_hash: passwordHash,
    full_name: 'Quản trị viên',
    role: 'ADMIN',
    status: 'ACTIVE',
    must_change_password: false,
    password_changed_at: passwordChangedAt,
    contact: null,
  }

  const teacherData: DemoSeedUserData = {
    username: 'teacher@demo.educraft',
    password_hash: passwordHash,
    full_name: 'Giáo viên',
    role: 'TEACHER',
    status: 'ACTIVE',
    must_change_password: false,
    password_changed_at: passwordChangedAt,
    contact: null,
  }

  await client.user.upsert({
    where: { username: adminData.username },
    update: adminData,
    create: adminData,
  })

  const teacher = await client.user.upsert({
    where: { username: teacherData.username },
    update: teacherData,
    create: teacherData,
  })

  await client.teacherProfile.upsert({
    where: { teacher_id: teacher.id },
    update: {
      qualification: 'Cử nhân Sư phạm',
      specialized_subject_id: subject.id,
    },
    create: {
      teacher_id: teacher.id,
      qualification: 'Cử nhân Sư phạm',
      specialized_subject_id: subject.id,
    },
  })

  return {
    adminUsername: adminData.username,
    teacherUsername: teacherData.username,
    subjectName,
  }
}
