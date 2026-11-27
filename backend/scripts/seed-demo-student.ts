import { prisma } from '../src/lib/prisma.js'
import { seedDemoStudent } from '../src/dev/demo-seed.js'

try {
  const result = await seedDemoStudent()
  console.log(`Student demo account ready: ${result.studentUsername}`)
  console.log(`Student demo class ready: ${result.classroomName} · ${result.subjectName}`)
  console.log(`Teacher linked: ${result.teacherUsername ?? 'no active demo teacher account found'}`)
  console.log('Demo password: demo123')
} finally {
  await prisma.$disconnect()
}
