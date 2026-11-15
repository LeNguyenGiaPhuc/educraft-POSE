import { prisma } from '../../../lib/prisma.js';
import { BadRequestError, ConflictError, NotFoundError } from '../../../shared/errors/app-error.js';
import { parseRosterWorkbook } from './roster.parser.js';
import { rosterTokenService } from './roster.token.js';
import { passwordService } from '../../auth/password.service.js';
import { hashRosterRows, type PreviewResult, type StudentImportRow } from './roster.types.js';

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

    const { rows, issues } = await parseRosterWorkbook(params.fileBuffer);

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
    // 1. Verify token
    const tokenPayload = rosterTokenService.verifyToken(params.validationToken);

    if (tokenPayload.adminId !== params.adminId) {
      throw new BadRequestError('Mã xác thực không thuộc về phiên làm việc này');
    }

    if (tokenPayload.classroomId !== params.classroomId) {
      throw new BadRequestError('Mã xác thực không khớp với lớp học được chọn');
    }

    if (tokenPayload.rowCount !== params.rows.length) {
      throw new BadRequestError('Số lượng bản ghi không khớp với mã xác thực đã tạo');
    }

    // 2. Verify exact row content hash matches preview
    const submittedRowsHash = hashRosterRows(params.rows);
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
      const usernames = params.rows.map((r) => r.username.trim().toLowerCase());
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
      for (const row of params.rows) {
        const user = await tx.user.create({
          data: {
            username: row.username.trim(),
            password_hash: passwordHash,
            full_name: row.fullName.trim(),
            contact: row.contact.trim() || null,
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
        importedCount: params.rows.length,
      };
    });
  },
};
