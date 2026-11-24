import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '../../../../../../backend/src/lib/prisma.js'
import { passwordService } from '../../../../../../backend/src/modules/auth/password.service.js'
import { classroomRepository } from '../../../../../../backend/src/modules/admin/classrooms/classroom.repository.js'

describe('classroomRepository.createClassroomWithSubjects', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('creates the classroom, active subjects, students, and enrollments in one transaction', async () => {
    vi.spyOn(passwordService, 'hashPassword').mockResolvedValue('hashed-password')

    const mockTx = {
      classroom: {
        create: vi.fn().mockResolvedValue({ id: 'class-1' }),
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          id: 'class-1',
          name: '11A3',
          grade_level: 11,
          academic_year: '2026–2027',
          status: 'ACTIVE',
          created_at: new Date('2026-09-01T00:00:00Z'),
          updated_at: new Date('2026-09-01T00:00:00Z'),
          _count: { enrollments: 2, classroomSubjects: 1 },
          classroomSubjects: [],
        }),
      },
      subject: {
        findMany: vi.fn().mockResolvedValue([{ id: 'subject-1' }]),
      },
      classroomSubject: {
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      user: {
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn()
          .mockResolvedValueOnce({ id: 'student-1' })
          .mockResolvedValueOnce({ id: 'student-2' }),
      },
      classroomEnrollment: {
        create: vi.fn().mockResolvedValue({ id: 'enrollment-1' }),
      },
    }

    vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => callback(mockTx))

    const result = await classroomRepository.createClassroomWithSubjects({
      name: '11A3',
      gradeLevel: 11,
      academicYear: '2026–2027',
      initialStudentPassword: 'TempPassword123!',
      students: [
        { line: 2, fullName: 'Nguyễn Văn An', username: 'nguyen.an', contact: '0901' },
        { line: 3, fullName: 'Trần Thị Bình', username: 'tran.binh', contact: '0902' },
      ],
    })

    expect(result.id).toBe('class-1')
    expect(mockTx.user.create).toHaveBeenCalledTimes(2)
    expect(mockTx.classroomEnrollment.create).toHaveBeenCalledTimes(2)
    expect(mockTx.classroomEnrollment.create).toHaveBeenCalledWith({
      data: { student_id: 'student-1', classroom_id: 'class-1', left_at: null },
    })
  })

  it('does not continue creating students when a username conflict is found', async () => {
    const mockTx = {
      classroom: { create: vi.fn().mockResolvedValue({ id: 'class-1' }) },
      subject: { findMany: vi.fn().mockResolvedValue([]) },
      classroomSubject: { createMany: vi.fn() },
      user: {
        findMany: vi.fn().mockResolvedValue([{ username: 'nguyen.an' }]),
        create: vi.fn(),
      },
    }
    vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => callback(mockTx))

    await expect(classroomRepository.createClassroomWithSubjects({
      name: '11A3',
      gradeLevel: 11,
      academicYear: '2026–2027',
      initialStudentPassword: 'TempPassword123!',
      students: [{ line: 2, fullName: 'Nguyễn Văn An', username: 'nguyen.an', contact: '0901' }],
    })).rejects.toThrow('Tên đăng nhập')

    expect(mockTx.user.create).not.toHaveBeenCalled()
  })
})
