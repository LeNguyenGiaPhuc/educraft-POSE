import { prisma } from '../src/lib/prisma.js'
import { seedDemoUsers } from '../src/dev/demo-seed.js'

try {
  const result = await seedDemoUsers()
  console.log(`Demo accounts ready: ${result.adminUsername}, ${result.teacherUsername}`)
} finally {
  await prisma.$disconnect()
}
