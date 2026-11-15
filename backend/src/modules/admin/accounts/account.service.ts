import type { UserRole, AccountStatus } from '@prisma/client';
import { prisma } from '../../../lib/prisma.js';
import { passwordService } from '../../auth/password.service.js';
import { accountRepository, type AccountRepository, type UserWithDetails } from './account.repository.js';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from '../../../shared/errors/app-error.js';
import { createPaginationMeta } from '../../../shared/pagination/pagination.util.js';
import type { PaginatedResult } from '../../../shared/pagination/pagination.dto.js';
import type {
  CreateAccountInput,
  UpdateAccountInput,
  UpdateAccountStatusInput,
  ResetAccountPasswordInput,
} from './account.schemas.js';

export interface AccountResponseDto {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  status: AccountStatus;
  contact: string | null;
  classroomId: string | null;
  classroomName: string | null;
  qualification?: string | null;
  specializedSubjectId?: string | null;
  specializedSubjectName?: string | null;
  mustChangePassword: boolean;
  passwordChangedAt: Date | null;
  createdAt: Date;
}

export class AccountService {
  constructor(private repo: AccountRepository = accountRepository) {}

  toDto(user: UserWithDetails): AccountResponseDto {
    const activeEnrollment = user.enrollments?.[0];
    return {
      id: user.id,
      username: user.username,
      fullName: user.full_name,
      role: user.role,
      status: user.status,
      contact: user.contact,
      classroomId: activeEnrollment?.classroom?.id || null,
      classroomName: activeEnrollment?.classroom?.name || null,
      qualification: user.teacherProfile?.qualification || null,
      specializedSubjectId: user.teacherProfile?.specialized_subject_id || null,
      specializedSubjectName: user.teacherProfile?.specializedSubject?.name || null,
      mustChangePassword: user.must_change_password,
      passwordChangedAt: user.password_changed_at,
      createdAt: user.created_at,
    };
  }

  async listAccounts(params: {
    page: number;
    limit: number;
    skip: number;
    take: number;
    role?: UserRole;
    status?: AccountStatus;
    search?: string;
  }): Promise<PaginatedResult<AccountResponseDto>> {
    const { users, totalItems } = await this.repo.findMany({
      skip: params.skip,
      take: params.take,
      role: params.role,
      status: params.status,
      search: params.search,
    });

    const meta = createPaginationMeta({
      page: params.page,
      limit: params.limit,
      totalItems,
    });

    return {
      data: users.map((u) => this.toDto(u)),
      meta,
    };
  }

  async getAccountById(id: string): Promise<AccountResponseDto> {
    const user = await this.repo.findById(id);
    if (!user) {
      throw new NotFoundError('Không tìm thấy tài khoản người dùng');
    }
    return this.toDto(user);
  }

  async createAccount(input: CreateAccountInput): Promise<AccountResponseDto> {
    // 1. Case-insensitive duplicate check for username
    const existing = await this.repo.findByUsernameCaseInsensitive(input.username);
    if (existing) {
      throw new ConflictError('Tên đăng nhập đã tồn tại trong hệ thống');
    }

    // 2. Hash password securely
    const passwordHash = await passwordService.hashPassword(input.password);

    // 3. Handle Teacher creation atomically
    if (input.role === 'TEACHER') {
      const subject = await prisma.subject.findUnique({
        where: { id: input.specializedSubjectId },
      });
      if (!subject) {
        throw new BadRequestError(
          'Môn học chuyên môn không tồn tại trong hệ thống',
          'INVALID_SPECIALIZED_SUBJECT'
        );
      }

      let created: UserWithDetails;
      try {
        created = await this.repo.createTeacher({
        username: input.username,
        fullName: input.fullName,
        contact: input.contact,
        passwordHash,
        qualification: input.qualification,
        specializedSubjectId: input.specializedSubjectId,
        });
      } catch (error) {
        if ((error as { code?: string }).code === 'P2002') {
          throw new ConflictError('Tên đăng nhập đã tồn tại trong hệ thống');
        }
        throw error;
      }

      return this.toDto(created);
    }

    // 4. Handle Student creation
    let created: UserWithDetails;
    try {
      created = await this.repo.createStudent({
        role: 'STUDENT',
        username: input.username,
        fullName: input.fullName,
        contact: input.contact,
        passwordHash,
      });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') {
        throw new ConflictError('Tên đăng nhập đã tồn tại trong hệ thống');
      }
      throw error;
    }

    return this.toDto(created);
  }

  async updateAccount(id: string, input: UpdateAccountInput): Promise<AccountResponseDto> {
    const user = await this.repo.findById(id);
    if (!user) {
      throw new NotFoundError('Không tìm thấy tài khoản người dùng');
    }

    if (user.role !== 'TEACHER' && (input.qualification !== undefined || input.specializedSubjectId !== undefined)) {
      throw new BadRequestError('Chỉ có thể cập nhật thông tin chuyên môn cho giáo viên');
    }

    // If changing teacher specialization, verify subject exists and no active assignment conflict
    if (input.specializedSubjectId !== undefined) {
      const subject = await prisma.subject.findUnique({
        where: { id: input.specializedSubjectId },
      });
      if (!subject) {
        throw new BadRequestError('Môn học chuyên môn không tồn tại trong hệ thống');
      }

      const oldSubjectId = user.teacherProfile?.specialized_subject_id;
      if (oldSubjectId && oldSubjectId !== input.specializedSubjectId) {
        const activeAssignment = await this.repo.findTeacherActiveAssignments(id, oldSubjectId);
        if (activeAssignment) {
          throw new ConflictError(
            'Không thể đổi môn chuyên môn vì giáo viên đang phụ trách môn này trong một hoặc nhiều lớp học đang hoạt động'
          );
        }
      }
    }

    const updated = await this.repo.updateUser(id, input);
    return this.toDto(updated);
  }

  async updateStatus(id: string, input: UpdateAccountStatusInput): Promise<AccountResponseDto> {
    const user = await this.repo.findById(id);
    if (!user) {
      throw new NotFoundError('Không tìm thấy tài khoản người dùng');
    }

    const updated = await this.repo.updateStatus(id, input.status);

    return this.toDto(updated);
  }

  async resetPassword(
    id: string,
    input: ResetAccountPasswordInput
  ): Promise<{ success: boolean; message: string }> {
    const user = await this.repo.findById(id);
    if (!user) {
      throw new NotFoundError('Không tìm thấy tài khoản người dùng');
    }

    const passwordHash = await passwordService.hashPassword(input.password);
    await this.repo.updatePassword(id, passwordHash);

    return {
      success: true,
      message: 'Đặt lại mật khẩu cho tài khoản thành công',
    };
  }
}

export const accountService = new AccountService();
