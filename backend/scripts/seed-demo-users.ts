import { prisma } from '../src/lib/prisma.js'
import { seedDemoUsers } from '../src/dev/demo-seed.js'

try {
  const result = await seedDemoUsers()
  console.log(`Demo accounts ready: ${result.adminUsername}, ${result.teacherUsername}, ${result.studentUsername}`)
  console.log(`Student demo class ready: ${result.classroomName} · ${result.subjectName}`)
} finally {
  await prisma.$disconnect()
}
