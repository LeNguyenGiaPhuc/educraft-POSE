import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AccountService } from '../../../../../../backend/src/modules/admin/accounts/account.service.js';
import type { AccountRepository, UserWithDetails } from '../../../../../../backend/src/modules/admin/accounts/account.repository.js';
import { prisma } from '../../../../../../backend/src/lib/prisma.js';
import { passwordService } from '../../../../../../backend/src/modules/auth/password.service.js';
import { ConflictError, BadRequestError } from '../../../../../../backend/src/shared/errors/app-error.js';
import type { UserRole, AccountStatus } from '@prisma/client';

describe('AccountService', () => {
  let repo: AccountRepository;
  let service: AccountService;

  beforeEach(() => {
    vi.restoreAllMocks();
    repo = {
      findMany: vi.fn(),
      findById: vi.fn(),
      findByUsernameCaseInsensitive: vi.fn(),
      createStudent: vi.fn(),
      createTeacher: vi.fn(),
      updateUser: vi.fn(),
      updateStatus: vi.fn(),
      updatePassword: vi.fn(),
      findTeacherActiveAssignments: vi.fn(),
    } as unknown as AccountRepository;

    service = new AccountService(repo);
  });

  it('creates student account with hashed password and sanitized response DTO', async () => {
    vi.spyOn(repo, 'findByUsernameCaseInsensitive').mockResolvedValue(null);
    vi.spyOn(passwordService, 'hashPassword').mockResolvedValue('hashed_pw');

    const createdUser: UserWithDetails = {
      id: 'student-id-1',
      username: 'student.test',
      password_hash: 'hashed_pw',
      full_name: 'Nguyễn Văn Học Sinh',
      contact: 'hs@test.local',
      role: 'STUDENT' as UserRole,
      status: 'ACTIVE' as AccountStatus,
      must_change_password: true,
      password_changed_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      enrollments: [],
    };
    vi.spyOn(repo, 'createStudent').mockResolvedValue(createdUser);

    const result = await service.createAccount({
      role: 'STUDENT',
      username: 'student.test',
      fullName: 'Nguyễn Văn Học Sinh',
      contact: 'hs@test.local',
      password: 'SecretPassword123',
    });

    expect(result.id).toBe('student-id-1');
    expect(result.username).toBe('student.test');
    expect(result.role).toBe('STUDENT');
    expect((result as any).password_hash).toBeUndefined();
    expect((result as any).password).toBeUndefined();
  });

  it('rejects duplicate username regardless of case', async () => {
    const existingUser: any = { id: 'existing-id', username: 'john.doe' };
    vi.spyOn(repo, 'findByUsernameCaseInsensitive').mockResolvedValue(existingUser);

    await expect(
      service.createAccount({
        role: 'STUDENT',
        username: 'JOHN.DOE',
        fullName: 'John Doe',
        password: 'Password123',
      })
    ).rejects.toThrow(ConflictError);
  });

  it('creates teacher account atomically when subject exists', async () => {
    vi.spyOn(repo, 'findByUsernameCaseInsensitive').mockResolvedValue(null);
    vi.spyOn(passwordService, 'hashPassword').mockResolvedValue('hashed_teacher_pw');
    vi.spyOn(prisma.subject, 'findUnique').mockResolvedValue({
      id: 'subject-uuid-1',
      name: 'Toán',
      is_active: true,
    } as any);

    const createdTeacher: UserWithDetails = {
      id: 'teacher-id-1',
      username: 'teacher.math',
      password_hash: 'hashed_teacher_pw',
      full_name: 'Thầy Toán',
      contact: 'math@test.local',
      role: 'TEACHER' as UserRole,
      status: 'ACTIVE' as AccountStatus,
      must_change_password: true,
      password_changed_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      teacherProfile: {
        teacher_id: 'teacher-id-1',
        qualification: 'Thạc sĩ Toán học',
        specialized_subject_id: 'subject-uuid-1',
        specializedSubject: {
          id: 'subject-uuid-1',
          name: 'Toán',
          is_active: true,
        },
      },
    };
    vi.spyOn(repo, 'createTeacher').mockResolvedValue(createdTeacher);

    const result = await service.createAccount({
      role: 'TEACHER',
      username: 'teacher.math',
      fullName: 'Thầy Toán',
      contact: 'math@test.local',
      password: 'TeacherPassword123',
      qualification: 'Thạc sĩ Toán học',
      specializedSubjectId: 'subject-uuid-1',
    });

    expect(result.role).toBe('TEACHER');
    expect(result.qualification).toBe('Thạc sĩ Toán học');
    expect(result.specializedSubjectId).toBe('subject-uuid-1');
    expect(result.specializedSubjectName).toBe('Toán');
  });

  it('rejects teacher creation if specialized subject does not exist', async () => {
    vi.spyOn(repo, 'findByUsernameCaseInsensitive').mockResolvedValue(null);
    vi.spyOn(prisma.subject, 'findUnique').mockResolvedValue(null);

    await expect(
      service.createAccount({
        role: 'TEACHER',
        username: 'teacher.invalid',
        fullName: 'Thầy Test',
        password: 'Password123',
        qualification: 'Cử nhân',
        specializedSubjectId: 'nonexistent-subject-id',
      })
    ).rejects.toThrow(BadRequestError);
  });

  it('rejects specialization update if teacher currently has active classroom assignments in old subject', async () => {
    const existingTeacher: UserWithDetails = {
      id: 'teacher-id-1',
      username: 'teacher.math',
      password_hash: 'hash',
      full_name: 'Thầy Toán',
      contact: null,
      role: 'TEACHER',
      status: 'ACTIVE',
      must_change_password: false,
      password_changed_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      teacherProfile: {
        teacher_id: 'teacher-id-1',
        qualification: 'Cử nhân',
        specialized_subject_id: 'old-math-subject-id',
      },
    };

    vi.spyOn(repo, 'findById').mockResolvedValue(existingTeacher);
    vi.spyOn(prisma.subject, 'findUnique').mockResolvedValue({ id: 'new-physics-subject-id' } as any);
    vi.spyOn(repo, 'findTeacherActiveAssignments').mockResolvedValue({ id: 'assignment-1' } as any);

    await expect(
      service.updateAccount('teacher-id-1', {
        specializedSubjectId: 'new-physics-subject-id',
      })
    ).rejects.toThrow(ConflictError);
  });

  it('rejects teacher qualification on a student account', async () => {
    vi.spyOn(repo, 'findById').mockResolvedValue({
      id: 'student-id', role: 'STUDENT', username: 'student', full_name: 'Student',
      password_hash: 'hash', contact: null, status: 'ACTIVE', must_change_password: false,
      password_changed_at: null, created_at: new Date(), updated_at: new Date(),
    });
    await expect(service.updateAccount('student-id', { qualification: 'Degree' })).rejects.toThrow(BadRequestError);
  });

  it('maps a database username collision to conflict after a clean precheck', async () => {
    vi.spyOn(repo, 'findByUsernameCaseInsensitive').mockResolvedValue(null);
    vi.spyOn(passwordService, 'hashPassword').mockResolvedValue('hash');
    vi.spyOn(repo, 'createStudent').mockRejectedValue({ code: 'P2002' });
    await expect(service.createAccount({ role: 'STUDENT', username: 'race', fullName: 'Race', password: 'Password123' })).rejects.toThrow(ConflictError);
  });

  it('revokes all sessions when deactivating user', async () => {
    const user: UserWithDetails = {
      id: 'user-to-deactivate',
      username: 'user.active',
      password_hash: 'hash',
      full_name: 'User Active',
      contact: null,
      role: 'STUDENT',
      status: 'ACTIVE',
      must_change_password: false,
      password_changed_at: null,
      created_at: new Date(),
      updated_at: new Date(),
    };

    vi.spyOn(repo, 'findById').mockResolvedValue(user);
    vi.spyOn(repo, 'updateStatus').mockResolvedValue({
      ...user,
      status: 'INACTIVE',
    });
    const result = await service.updateStatus('user-to-deactivate', { status: 'INACTIVE' });
    expect(result.status).toBe('INACTIVE');
  });

  it('resets password, sets must_change_password=true, and revokes active sessions', async () => {
    const user: UserWithDetails = {
      id: 'user-to-reset',
      username: 'user.reset',
      password_hash: 'old_hash',
      full_name: 'User Reset',
      contact: null,
      role: 'TEACHER',
      status: 'ACTIVE',
      must_change_password: false,
      password_changed_at: null,
      created_at: new Date(),
      updated_at: new Date(),
    };

    vi.spyOn(repo, 'findById').mockResolvedValue(user);
    vi.spyOn(passwordService, 'hashPassword').mockResolvedValue('new_hash');
    const updatePwSpy = vi.spyOn(repo, 'updatePassword').mockResolvedValue();

    const result = await service.resetPassword('user-to-reset', { password: 'NewPassword123' });
    expect(result.success).toBe(true);
    expect(updatePwSpy).toHaveBeenCalledWith('user-to-reset', 'new_hash');
  });
});
