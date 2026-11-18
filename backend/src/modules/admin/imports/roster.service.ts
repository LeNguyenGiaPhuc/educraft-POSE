import { prisma } from '../../../lib/prisma.js';
import { BadRequestError, ConflictError, NotFoundError } from '../../../shared/errors/app-error.js';
import { parseRosterWorkbook } from './roster.parser.js';
import { rosterTokenService } from './roster.token.js';
import { passwordService } from '../../auth/password.service.js';
import { classroomRepository } from '../classrooms/classroom.repository.js';
import {
  hashRosterRows,
  type ImportIssue,
  type PreviewResult,
  type StudentImportRow,
} from './roster.types.js';
import {
  getIdentityErrorMessage,
  normalizeContact,
  normalizeFullName,
  normalizeUsername,
  validateContact,
  validateFullName,
  validatePassword,
  validateUsername,
} from '../../../shared/account-identity.js';

function normalizeCommitRows(rows: StudentImportRow[]): StudentImportRow[] {
  const issues: ImportIssue[] = [];
  const normalizedRows = rows.map((row) => {
    const normalized = {
      ...row,
      fullName: normalizeFullName(row.fullName),
      username: normalizeUsername(row.username),
      contact: normalizeContact(row.contact),
    };
    const fullNameError = validateFullName(normalized.fullName);
    if (fullNameError) {
      issues.push({
        line: row.line,
        field: 'fullName',
        code: fullNameError,
        message: getIdentityErrorMessage(fullNameError),
      });
    }
    const usernameError = validateUsername(normalized.username);
    if (usernameError) {
      issues.push({
        line: row.line,
        field: 'username',
        code: usernameError,
        message: getIdentityErrorMessage(usernameError),
      });
    }
    const contactError = validateContact(normalized.contact);
    if (contactError) {
      issues.push({
        line: row.line,
        field: 'contact',
        code: contactError,
        message: getIdentityErrorMessage(contactError),
      });
    }
    return normalized;
  });

  if (issues.length > 0) {
    throw new BadRequestError('Danh sách học sinh không hợp lệ.', 'INVALID_ROSTER', {
      roster: issues.map((issue) => `Dòng ${issue.line}, ${issue.field}: ${issue.message}`),
    });
  }
  return normalizedRows;
}

export const rosterService = {
  async previewRoster(params: {
    adminId: string;
    classroomId: string;
    fileBuffer: Buffer;
  }): Promise<PreviewResult> {
    const classroom = await prisma.classroom.findUnique({
      where: { id: params.classroomId },
    });

    if (!classroom) {
      throw new NotFoundError('Không tìm thấy lớp học');
    }

    if (classroom.status === 'ARCHIVED') {
      throw new BadRequestError('Không thể nhập học sinh vào lớp học đã lưu trữ');
    }

    const parsed = await parseRosterWorkbook(params.fileBuffer);
    const { rows, issues, normalizationNotices } = parsed;

    // Check database username conflicts for all parsed usernames
    const uniqueUsernames = Array.from(
      new Set(rows.map((r) => r.username.trim().toLowerCase()).filter(Boolean))
    );

    if (uniqueUsernames.length > 0) {
      const existingUsers = await prisma.user.findMany({
        where: {
          username: {
            in: uniqueUsernames,
            mode: 'insensitive',
          },
        },
        select: { username: true },
      });

      const existingSet = new Set(existingUsers.map((u) => u.username.toLowerCase()));

      for (const row of rows) {
        if (existingSet.has(row.username.toLowerCase())) {
          issues.push({
            line: row.line,
            field: 'username',
            code: 'USERNAME_EXISTS',
            message: `Tên đăng nhập "${row.username}" đã tồn tại trên hệ thống. Excel chỉ tạo tài khoản mới.`,
          });
        }
      }
    }

    issues.sort((a, b) => a.line - b.line);

    const isValid = issues.length === 0 && rows.length > 0;
    let validationToken: string | null = null;

    if (isValid) {
      const rowsHash = hashRosterRows(rows);
      validationToken = rosterTokenService.generateToken({
        adminId: params.adminId,
        classroomId: params.classroomId,
        rowCount: rows.length,
        rowsHash,
      });
    }

    return {
      rows,
      issues,
      normalizationNotices,
      isValid,
      validationToken,
      totalRows: rows.length,
      validRows: isValid ? rows.length : 0,
    };
  },

  async previewNewRoster(params: {
    adminId: string;
    fileBuffer: Buffer;
  }): Promise<PreviewResult> {
    const parsed = await parseRosterWorkbook(params.fileBuffer);
    const { rows, issues, normalizationNotices } = parsed;
    const uniqueUsernames = Array.from(new Set(rows.map((row) => row.username).filter(Boolean)));

    if (uniqueUsernames.length > 0) {
      const existingUsers = await prisma.user.findMany({
        where: {
          username: {
            in: uniqueUsernames,
            mode: 'insensitive',
          },
        },
        select: { username: true },
      });
      const existingSet = new Set(existingUsers.map((user) => user.username.toLowerCase()));
      for (const row of rows) {
        if (existingSet.has(row.username)) {
          issues.push({
            line: row.line,
            field: 'username',
            code: 'USERNAME_EXISTS',
            message: `Tên đăng nhập "${row.username}" đã tồn tại trên hệ thống. Excel chỉ tạo tài khoản mới.`,
          });
        }
      }
    }

    issues.sort((left, right) => left.line - right.line || left.field.localeCompare(right.field));
    const isValid = parsed.isValid && issues.length === 0 && rows.length > 0;
    const validationToken = isValid
      ? rosterTokenService.generateToken({
          adminId: params.adminId,
          operation: 'NEW_CLASSROOM',
          rowCount: rows.length,
          rowsHash: hashRosterRows(rows),
        })
      : null;

    return {
      rows,
      issues,
      normalizationNotices,
      isValid,
      validationToken,
      totalRows: rows.length,
      validRows: isValid ? rows.length : 0,
    };
  },

  async commitRoster(params: {
    adminId: string;
    classroomId: string;
    validationToken: string;
    defaultPassword: string;
    rows: StudentImportRow[];
  }): Promise<{ importedCount: number }> {
    const normalizedRows = normalizeCommitRows(params.rows);
    const passwordError = validatePassword(params.defaultPassword);
    if (passwordError) {
      throw new BadRequestError(getIdentityErrorMessage(passwordError), passwordError);
    }

    // 1. Verify token
    const tokenPayload = rosterTokenService.verifyToken(params.validationToken);

    if (tokenPayload.adminId !== params.adminId) {
      throw new BadRequestError('Mã xác thực không thuộc về phiên làm việc này');
    }

    if (tokenPayload.operation !== 'EXISTING_CLASSROOM') {
      throw new BadRequestError('Mã xác thực không dành cho lớp học hiện tại');
    }

    if (tokenPayload.classroomId !== params.classroomId) {
      throw new BadRequestError('Mã xác thực không khớp với lớp học được chọn');
    }

    if (tokenPayload.rowCount !== normalizedRows.length) {
      throw new BadRequestError('Số lượng bản ghi không khớp với mã xác thực đã tạo');
    }

    // 2. Verify exact row content hash matches preview
    const submittedRowsHash = hashRosterRows(normalizedRows);
    if (submittedRowsHash !== tokenPayload.rowsHash) {
      throw new BadRequestError('Nội dung danh sách học sinh đã bị thay đổi so với bản xem trước');
    }

    // 3. Hash temporary password with Argon2id
    const passwordHash = await passwordService.hashPassword(params.defaultPassword);

    // 3. Atomic transaction
    return prisma.$transaction(async (tx) => {
      // Re-verify classroom is active
      const classroom = await tx.classroom.findUnique({
        where: { id: params.classroomId },
      });

      if (!classroom) {
        throw new NotFoundError('Không tìm thấy lớp học');
      }

      if (classroom.status === 'ARCHIVED') {
        throw new BadRequestError('Không thể nhập học sinh vào lớp học đã lưu trữ');
      }

      // Re-check for any username conflicts right before write
      const usernames = normalizedRows.map((r) => r.username);
      const conflicts = await tx.user.findMany({
        where: {
          username: {
            in: usernames,
            mode: 'insensitive',
          },
        },
        select: { username: true },
      });

      if (conflicts.length > 0) {
        throw new ConflictError(
          `Tên đăng nhập "${conflicts[0].username}" đã tồn tại. Vui lòng kiểm tra lại.`
        );
      }

      // Create all users and enrollments
      for (const row of normalizedRows) {
        const user = await tx.user.create({
          data: {
            username: row.username,
            password_hash: passwordHash,
            full_name: row.fullName,
            contact: row.contact,
            role: 'STUDENT',
            status: 'ACTIVE',
            must_change_password: false,
          },
        });

        await tx.classroomEnrollment.create({
          data: {
            student_id: user.id,
            classroom_id: params.classroomId,
            left_at: null,
          },
        });
      }

      return {
        importedCount: normalizedRows.length,
      };
    });
  },

  async commitNewClassroom(params: {
    adminId: string;
    validationToken: string;
    name: string;
    gradeLevel: number;
    academicYear: string;
    initialStudentPassword: string;
    rows: StudentImportRow[];
  }): Promise<{ classroomId: string; importedCount: number }> {
    const normalizedRows = normalizeCommitRows(params.rows);
    const passwordError = validatePassword(params.initialStudentPassword);
    if (passwordError) {
      throw new BadRequestError(getIdentityErrorMessage(passwordError), passwordError);
    }

    const tokenPayload = rosterTokenService.verifyToken(params.validationToken);
    if (tokenPayload.adminId !== params.adminId) {
      throw new BadRequestError('Mã xác thực không thuộc về phiên làm việc này');
    }
    if (tokenPayload.operation !== 'NEW_CLASSROOM') {
      throw new BadRequestError('Mã xác thực không dành cho tạo lớp học mới');
    }
    if (tokenPayload.classroomId) {
      throw new BadRequestError('Mã xác thực không khớp với thao tác tạo lớp học mới');
    }
    if (tokenPayload.rowCount !== normalizedRows.length) {
      throw new BadRequestError('Số lượng bản ghi không khớp với mã xác thực đã tạo');
    }
    if (hashRosterRows(normalizedRows) !== tokenPayload.rowsHash) {
      throw new BadRequestError('Nội dung danh sách học sinh đã bị thay đổi so với bản xem trước');
    }

    try {
      const created = await classroomRepository.createClassroomWithSubjects({
        name: params.name.trim(),
        gradeLevel: params.gradeLevel,
        academicYear: params.academicYear.trim(),
        initialStudentPassword: params.initialStudentPassword,
        students: normalizedRows,
      });
      return {
        classroomId: created.id,
        importedCount: normalizedRows.length,
      };
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') {
        throw new ConflictError('Lớp học hoặc tài khoản trong danh sách đã tồn tại. Vui lòng kiểm tra lại.');
      }
      throw error;
    }
  },
};
