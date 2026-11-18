import type { Prisma } from '@prisma/client';
import { prisma } from '../../../lib/prisma.js';
import { BadRequestError, ConflictError, NotFoundError } from '../../../shared/errors/app-error.js';
import { passwordService } from '../../auth/password.service.js';
import type { PaginationParams } from '../../../shared/pagination/pagination.dto.js';
import type { CreateClassroomInput, UpdateClassroomInput } from './classroom.schemas.js';

export interface ClassroomFilterParams extends PaginationParams {
  search?: string;
  status?: 'ACTIVE' | 'ARCHIVED';
  gradeLevel?: number;
  academicYear?: string;
  sortBy?: 'name' | 'grade_level' | 'academic_year' | 'created_at';
  sortOrder?: 'asc' | 'desc';
}

export const classroomRepository = {
  async listClassrooms(filters: ClassroomFilterParams) {
    const where: Prisma.ClassroomWhereInput = {};

    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.gradeLevel !== undefined) {
      where.grade_level = filters.gradeLevel;
    }
    if (filters.academicYear) {
      where.academic_year = filters.academicYear;
    }
    if (filters.search) {
      where.OR = [
        {
          name: {
            contains: filters.search,
            mode: 'insensitive',
          },
        },
        {
          academic_year: {
            contains: filters.search,
            mode: 'insensitive',
          },
        },
      ];
    }

    const orderBy: Prisma.ClassroomOrderByWithRelationInput = {};
    const sortField = filters.sortBy ?? 'created_at';
    const sortDir = filters.sortOrder ?? 'desc';
    orderBy[sortField] = sortDir;

    const [classrooms, total] = await Promise.all([
      prisma.classroom.findMany({
        where,
        skip: filters.skip,
        take: filters.take,
        orderBy,
        include: {
          _count: {
            select: {
              enrollments: {
                where: { left_at: null },
              },
              classroomSubjects: true,
            },
          },
          classroomSubjects: {
            where: {
              teacher_id: { not: null },
            },
            select: {
              id: true,
            },
          },
        },
      }),
      prisma.classroom.count({ where }),
    ]);

    return {
      items: classrooms.map((c) => ({
        id: c.id,
        name: c.name,
        gradeLevel: c.grade_level,
        academicYear: c.academic_year,
        status: c.status,
        studentCount: c._count.enrollments,
        subjectCount: c._count.classroomSubjects,
        assignedTeacherCount: c.classroomSubjects.length,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      })),
      total,
    };
  },

  async findByIdRaw(id: string) {
    return prisma.classroom.findUnique({
      where: { id },
    });
  },

  async findByNameAndAcademicYear(name: string, academicYear: string) {
    return prisma.classroom.findFirst({
      where: {
        academic_year: academicYear,
        name: {
          equals: name,
          mode: 'insensitive',
        },
      },
    });
  },

  async findDetailById(id: string) {
    return prisma.classroom.findUnique({
      where: { id },
      include: {
        enrollments: {
          orderBy: { joined_at: 'asc' },
          include: {
            student: {
              select: {
                id: true,
                full_name: true,
                username: true,
                contact: true,
                created_at: true,
                must_change_password: true,
                password_changed_at: true,
              },
            },
          },
        },
        classroomSubjects: {
          orderBy: { subject: { name: 'asc' } },
          include: {
            subject: {
              select: {
                id: true,
                name: true,
                is_active: true,
              },
            },
            teacher: {
              select: {
                id: true,
                full_name: true,
                username: true,
                contact: true,
                teacherProfile: {
                  select: {
                    qualification: true,
                  },
                },
              },
            },
            _count: {
              select: {
                lessons: true,
              },
            },
          },
        },
      },
    });
  },

  async createClassroomWithSubjects(data: CreateClassroomInput) {
    const students = data.students ?? [];
    const passwordHash = students.length > 0
      ? await passwordService.hashPassword(data.initialStudentPassword as string)
      : null;

    return prisma.$transaction(async (tx) => {
      if (students.length > 0) {
        const usernames = students.map((student) => student.username.trim().toLowerCase());
        const existingUsers = await tx.user.findMany({
          where: {
            username: {
              in: usernames,
              mode: 'insensitive',
            },
          },
          select: { username: true },
        });

        if (existingUsers.length > 0) {
          throw new ConflictError(
            `Tên đăng nhập "${existingUsers[0].username}" đã tồn tại. Vui lòng kiểm tra lại.`
          );
        }
      }

      // 1. Create classroom
      const classroom = await tx.classroom.create({
        data: {
          name: data.name,
          grade_level: data.gradeLevel,
          academic_year: data.academicYear,
          status: 'ACTIVE',
        },
      });

      // 2. Fetch all currently active subjects
      const activeSubjects = await tx.subject.findMany({
        where: { is_active: true },
        select: { id: true },
      });

      // 3. Create unassigned ClassroomSubject for each active subject
      if (activeSubjects.length > 0) {
        await tx.classroomSubject.createMany({
          data: activeSubjects.map((subject) => ({
            classroom_id: classroom.id,
            subject_id: subject.id,
            teacher_id: null,
          })),
        });
      }

      for (const student of students) {
        const user = await tx.user.create({
          data: {
            username: student.username.trim(),
            password_hash: passwordHash as string,
            full_name: student.fullName.trim(),
            contact: student.contact.trim() || null,
            role: 'STUDENT',
            status: 'ACTIVE',
            must_change_password: false,
          },
        });

        await tx.classroomEnrollment.create({
          data: {
            student_id: user.id,
            classroom_id: classroom.id,
            left_at: null,
          },
        });
      }

      return tx.classroom.findUniqueOrThrow({
        where: { id: classroom.id },
        include: {
          _count: {
            select: {
              enrollments: { where: { left_at: null } },
              classroomSubjects: true,
            },
          },
          classroomSubjects: {
            where: { teacher_id: { not: null } },
            select: { id: true },
          },
        },
      });
    });
  },

  async updateClassroom(id: string, data: UpdateClassroomInput) {
    return prisma.classroom.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.gradeLevel !== undefined && { grade_level: data.gradeLevel }),
        ...(data.academicYear !== undefined && { academic_year: data.academicYear }),
      },
      include: {
        _count: {
          select: {
            enrollments: {
              where: { left_at: null },
            },
            classroomSubjects: true,
          },
        },
      },
    });
  },

  async archiveClassroom(id: string) {
    return prisma.$transaction(async (tx) => {
      const classroom = await tx.classroom.findUnique({
        where: { id },
      });

      if (!classroom) {
        throw new NotFoundError('Không tìm thấy lớp học');
      }

      if (classroom.status === 'ARCHIVED') {
        throw new BadRequestError('Lớp học đã được lưu trữ trước đó');
      }

      const archivedAt = new Date();
      await tx.classroomEnrollment.updateMany({
        where: {
          classroom_id: id,
          left_at: null,
        },
        data: { left_at: archivedAt },
      });

      return tx.classroom.update({
        where: { id },
        data: { status: 'ARCHIVED' },
        include: {
          _count: {
            select: {
              enrollments: {
                where: { left_at: null },
              },
              classroomSubjects: true,
            },
          },
        },
      });
    });
  },
};
