import type { Prisma, UserRole, AccountStatus, User, TeacherProfile, Subject, Classroom, ClassroomEnrollment } from '@prisma/client';
import { prisma } from '../../../lib/prisma.js';

export interface UserWithDetails extends User {
  teacherProfile?: (TeacherProfile & { specializedSubject?: Subject | null }) | null;
  enrollments?: (ClassroomEnrollment & { classroom: Classroom })[];
}

export interface ListAccountsParams {
  skip: number;
  take: number;
  role?: UserRole;
  status?: AccountStatus;
  search?: string;
}

export class AccountRepository {
  async findMany(params: ListAccountsParams): Promise<{ users: UserWithDetails[]; totalItems: number }> {
    const where: Prisma.UserWhereInput = {};

    if (params.role) {
      where.role = params.role;
    }

    if (params.status) {
      where.status = params.status;
    }

    if (params.search) {
      const term = params.search.trim();
      where.OR = [
        { username: { contains: term, mode: 'insensitive' } },
        { full_name: { contains: term, mode: 'insensitive' } },
        { contact: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [users, totalItems] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { created_at: 'desc' },
        include: {
          teacherProfile: {
            include: {
              specializedSubject: true,
            },
          },
          enrollments: {
            where: { left_at: null },
            include: {
              classroom: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return { users, totalItems };
  }

  async findById(id: string): Promise<UserWithDetails | null> {
    return prisma.user.findUnique({
      where: { id },
      include: {
        teacherProfile: {
          include: {
            specializedSubject: true,
          },
        },
        enrollments: {
          where: { left_at: null },
          include: {
            classroom: true,
          },
        },
      },
    });
  }

  async findByUsernameCaseInsensitive(username: string, excludeId?: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: {
        username: {
          equals: username.trim(),
          mode: 'insensitive',
        },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
  }

  async createStudent(data: {
    role: Extract<UserRole, 'STUDENT'>;
    username: string;
    fullName: string;
    contact?: string | null;
    passwordHash: string;
  }): Promise<UserWithDetails> {
    return prisma.user.create({
      data: {
        role: data.role,
        username: data.username.trim(),
        full_name: data.fullName.trim(),
        contact: data.contact?.trim() || null,
        password_hash: data.passwordHash,
        status: 'ACTIVE',
        must_change_password: false,
      },
      include: {
        enrollments: {
          where: { left_at: null },
          include: { classroom: true },
        },
      },
    });
  }

  async createTeacher(data: {
    username: string;
    fullName: string;
    contact?: string | null;
    passwordHash: string;
    qualification: string;
    specializedSubjectId: string;
  }): Promise<UserWithDetails> {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          role: 'TEACHER',
          username: data.username.trim(),
          full_name: data.fullName.trim(),
          contact: data.contact?.trim() || null,
          password_hash: data.passwordHash,
          status: 'ACTIVE',
          must_change_password: false,
        },
      });

      await tx.teacherProfile.create({
        data: {
          teacher_id: user.id,
          qualification: data.qualification.trim(),
          specialized_subject_id: data.specializedSubjectId,
        },
      });

      return tx.user.findUniqueOrThrow({
        where: { id: user.id },
        include: {
          teacherProfile: {
            include: { specializedSubject: true },
          },
        },
      });
    });
  }

  async updateUser(
    id: string,
    data: {
      fullName?: string;
      contact?: string | null;
      qualification?: string;
      specializedSubjectId?: string;
    }
  ): Promise<UserWithDetails> {
    return prisma.$transaction(async (tx) => {
      const userData: Prisma.UserUpdateInput = {};
      if (data.fullName !== undefined) userData.full_name = data.fullName.trim();
      if (data.contact !== undefined) userData.contact = data.contact?.trim() || null;

      if (Object.keys(userData).length > 0) {
        await tx.user.update({
          where: { id },
          data: userData,
        });
      }

      if (data.qualification !== undefined || data.specializedSubjectId !== undefined) {
        const profileData: Prisma.TeacherProfileUpdateWithoutTeacherInput = {};
        if (data.qualification !== undefined) profileData.qualification = data.qualification.trim();
        if (data.specializedSubjectId !== undefined) {
          profileData.specializedSubject = { connect: { id: data.specializedSubjectId } };
        }

        await tx.teacherProfile.update({
          where: { teacher_id: id },
          data: profileData,
        });
      }

      return tx.user.findUniqueOrThrow({
        where: { id },
        include: {
          teacherProfile: {
            include: { specializedSubject: true },
          },
          enrollments: {
            where: { left_at: null },
            include: { classroom: true },
          },
        },
      });
    });
  }

  async updateStatus(id: string, status: AccountStatus): Promise<UserWithDetails> {
    return prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id },
        data: { status },
        include: {
          teacherProfile: { include: { specializedSubject: true } },
          enrollments: { where: { left_at: null }, include: { classroom: true } },
        },
      });
      if (status === 'INACTIVE') {
        await tx.authSession.updateMany({
          where: { user_id: id, revoked_at: null },
          data: { revoked_at: new Date() },
        });
      }
      return updated;
    });
  }

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const changedAt = new Date();
      await tx.user.update({
        where: { id },
        data: {
          password_hash: passwordHash,
          must_change_password: false,
          password_changed_at: changedAt,
        },
      });
      await tx.authSession.updateMany({
        where: { user_id: id, revoked_at: null },
        data: { revoked_at: changedAt },
      });
    });
  }

  async findTeacherActiveAssignments(teacherId: string, subjectId: string) {
    return prisma.classroomSubject.findFirst({
      where: {
        teacher_id: teacherId,
        subject_id: subjectId,
        classroom: {
          status: 'ACTIVE',
        },
      },
    });
  }
}

export const accountRepository = new AccountRepository();
