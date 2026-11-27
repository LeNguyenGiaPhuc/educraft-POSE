import { prisma } from '../lib/prisma.js'
import { passwordService } from '../modules/auth/password.service.js'

type DemoUserRole = 'ADMIN' | 'TEACHER' | 'STUDENT'

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
    findUnique(input: {
      where: { username: string }
      select: { id: true; role: true; status: true }
    }): Promise<{ id: string; role: DemoUserRole; status: 'ACTIVE' | 'INACTIVE' } | null>
  }
  teacherProfile: {
    upsert(input: {
      where: { teacher_id: string }
      update: { qualification: string; specialized_subject_id: string }
      create: { teacher_id: string; qualification: string; specialized_subject_id: string }
    }): Promise<{ teacher_id: string }>
  }
  classroom: {
    upsert(input: {
      where: { name_academic_year: { name: string; academic_year: string } }
      update: { grade_level: number; status: 'ACTIVE' }
      create: { name: string; grade_level: number; academic_year: string; status: 'ACTIVE' }
    }): Promise<{ id: string }>
  }
  classroomSubject: {
    upsert(input: {
      where: { classroom_id_subject_id: { classroom_id: string; subject_id: string } }
      update: { teacher_id?: string | null }
      create: { classroom_id: string; subject_id: string; teacher_id: string | null }
    }): Promise<{ id: string }>
  }
  classroomEnrollment: {
    findFirst(input: {
      where: { student_id: string; classroom_id: string; left_at: null }
      select: { id: true }
    }): Promise<{ id: string } | null>
    create(input: {
      data: { student_id: string; classroom_id: string }
    }): Promise<{ id: string }>
  }
}

const DEMO_SUBJECT_NAME = 'Lịch sử'
const DEMO_STUDENT_USERNAME = 'student@demo.educraft'
const DEMO_CLASSROOM_NAME = '11A2 Demo'
const DEMO_ACADEMIC_YEAR = '2026-2027'

async function ensureDemoStudent(
  client: DemoSeedClient,
  subjectId: string,
  passwordHash: string,
  passwordChangedAt: Date,
  teacherId: string | null,
) {
  const studentData: DemoSeedUserData = {
    username: DEMO_STUDENT_USERNAME,
    password_hash: passwordHash,
    full_name: 'Lê Gia Phúc',
    role: 'STUDENT',
    status: 'ACTIVE',
    must_change_password: false,
    password_changed_at: passwordChangedAt,
    contact: null,
  }
  const student = await client.user.upsert({
    where: { username: studentData.username },
    update: studentData,
    create: studentData,
  })
  const classroom = await client.classroom.upsert({
    where: { name_academic_year: { name: DEMO_CLASSROOM_NAME, academic_year: DEMO_ACADEMIC_YEAR } },
    update: { grade_level: 11, status: 'ACTIVE' },
    create: { name: DEMO_CLASSROOM_NAME, grade_level: 11, academic_year: DEMO_ACADEMIC_YEAR, status: 'ACTIVE' },
  })
  await client.classroomSubject.upsert({
    where: { classroom_id_subject_id: { classroom_id: classroom.id, subject_id: subjectId } },
    update: teacherId ? { teacher_id: teacherId } : {},
    create: { classroom_id: classroom.id, subject_id: subjectId, teacher_id: teacherId },
  })
  const enrollment = await client.classroomEnrollment.findFirst({
    where: { student_id: student.id, classroom_id: classroom.id, left_at: null },
    select: { id: true },
  })
  if (!enrollment) {
    await client.classroomEnrollment.create({
      data: { student_id: student.id, classroom_id: classroom.id },
    })
  }

  return { studentUsername: studentData.username, classroomName: DEMO_CLASSROOM_NAME }
}

export async function seedDemoStudent(client: DemoSeedClient = prisma): Promise<{
  studentUsername: string
  classroomName: string
  subjectName: string
  teacherUsername: string | null
}> {
  const subject = await client.subject.upsert({
    where: { name: DEMO_SUBJECT_NAME },
    update: { is_active: true },
    create: { name: DEMO_SUBJECT_NAME, is_active: true },
  })
  const passwordHash = await passwordService.hashPassword('demo123')
  const teacher = await client.user.findUnique({
    where: { username: 'teacher@demo.educraft' },
    select: { id: true, role: true, status: true },
  })
  const activeTeacher = teacher?.role === 'TEACHER' && teacher.status === 'ACTIVE' ? teacher : null
  const seeded = await ensureDemoStudent(client, subject.id, passwordHash, new Date(), activeTeacher?.id ?? null)
  return {
    ...seeded,
    subjectName: DEMO_SUBJECT_NAME,
    teacherUsername: activeTeacher ? 'teacher@demo.educraft' : null,
  }
}

export async function seedDemoUsers(client: DemoSeedClient = prisma): Promise<{
  adminUsername: string
  teacherUsername: string
  studentUsername: string
  classroomName: string
  subjectName: string
}> {
  const subjectName = DEMO_SUBJECT_NAME
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

  const seededStudent = await ensureDemoStudent(client, subject.id, passwordHash, passwordChangedAt, teacher.id)

  return {
    adminUsername: adminData.username,
    teacherUsername: teacherData.username,
    studentUsername: seededStudent.studentUsername,
    classroomName: seededStudent.classroomName,
    subjectName,
  }
}
