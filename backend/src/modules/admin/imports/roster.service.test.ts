import { describe, it, expect, vi, beforeEach } from 'vitest';
import { rosterService } from './roster.service.js';
import { prisma } from '../../../lib/prisma.js';
import { BadRequestError, NotFoundError } from '../../../shared/errors/app-error.js';
import { rosterTokenService } from './roster.token.js';
import { hashRosterRows } from './roster.types.js';
import { passwordService } from '../../auth/password.service.js';
import ExcelJS from 'exceljs';

async function createTestWorkbookBuffer(rows: Array<Array<string | number | object>>): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Students');
  for (const r of rows) {
    ws.addRow(r);
  }
  const arrayBuf = await wb.xlsx.writeBuffer();
  return Buffer.from(arrayBuf);
}

describe('RosterService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('previewRoster', () => {
    it('throws NotFoundError if classroom does not exist', async () => {
      vi.spyOn(prisma.classroom, 'findUnique').mockResolvedValue(null);

      await expect(
        rosterService.previewRoster({
          adminId: 'admin-1',
          classroomId: 'cls-nonexistent',
          fileBuffer: Buffer.from('test'),
        })
      ).rejects.toThrow(NotFoundError);
    });

    it('rejects preview if classroom is ARCHIVED', async () => {
      vi.spyOn(prisma.classroom, 'findUnique').mockResolvedValue({
        id: 'cls-archived',
        status: 'ARCHIVED',
      } as any);

      await expect(
        rosterService.previewRoster({
          adminId: 'admin-1',
          classroomId: 'cls-archived',
          fileBuffer: Buffer.from('test'),
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('returns issues and no token when usernames already exist in database', async () => {
      vi.spyOn(prisma.classroom, 'findUnique').mockResolvedValue({
        id: 'cls-1',
        status: 'ACTIVE',
      } as any);

      const buffer = await createTestWorkbookBuffer([
        ['Họ và tên', 'Tên đăng nhập', 'Thông tin liên hệ'],
        ['Nguyen Van A', 'existing.user', '0901234567'],
      ]);

      vi.spyOn(prisma.user, 'findMany').mockResolvedValue([
        { id: 'u-existing', username: 'existing.user' } as any,
      ]);

      const result = await rosterService.previewRoster({
        adminId: 'admin-1',
        classroomId: 'cls-1',
        fileBuffer: buffer,
      });

      expect(result.isValid).toBe(false);
      expect(result.validationToken).toBeNull();
      expect(result.issues.some((i) => i.message.includes('đã tồn tại trên hệ thống'))).toBe(true);
    });

    it('returns valid preview and signed validationToken when all rows are clean', async () => {
      vi.spyOn(prisma.classroom, 'findUnique').mockResolvedValue({
        id: 'cls-1',
        status: 'ACTIVE',
      } as any);

      const buffer = await createTestWorkbookBuffer([
        ['Họ và tên', 'Tên đăng nhập', 'Thông tin liên hệ'],
        ['Nguyen Van A', 'new.student.a', '0901234567'],
        ['Tran Thi B', 'new.student.b', '0907654321'],
      ]);

      vi.spyOn(prisma.user, 'findMany').mockResolvedValue([]);

      const result = await rosterService.previewRoster({
        adminId: 'admin-1',
        classroomId: 'cls-1',
        fileBuffer: buffer,
      });

      expect(result.isValid).toBe(true);
      expect(result.validationToken).toBeDefined();
      expect(result.rows).toHaveLength(2);
      expect(result.issues).toHaveLength(0);
    });
  });

  describe('commitRoster', () => {
    it('verifies token and writes all users & enrollments in single transaction', async () => {
      vi.spyOn(prisma.classroom, 'findUnique').mockResolvedValue({
        id: 'cls-1',
        status: 'ACTIVE',
      } as any);

      const validRows = [
        { line: 2, fullName: 'Nguyen Van A', username: 'student.a', contact: '0901111111' },
        { line: 3, fullName: 'Tran Thi B', username: 'student.b', contact: '0902222222' },
      ];

      const token = rosterTokenService.generateToken({
        adminId: 'admin-1',
        classroomId: 'cls-1',
        rowCount: 2,
        rowsHash: hashRosterRows(validRows),
      });

      vi.spyOn(passwordService, 'hashPassword').mockResolvedValue('hashed-password');

      const mockTx = {
        classroom: {
          findUnique: vi.fn().mockResolvedValue({ id: 'cls-1', status: 'ACTIVE' }),
        },
        user: {
          findMany: vi.fn().mockResolvedValue([]),
          create: vi.fn().mockResolvedValue({ id: 'new-user-id' }),
        },
        classroomEnrollment: {
          create: vi.fn().mockResolvedValue({ id: 'new-enr-id' }),
        },
      };

      vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
        return callback(mockTx);
      });

      const commitResult = await rosterService.commitRoster({
        adminId: 'admin-1',
        classroomId: 'cls-1',
        validationToken: token,
        defaultPassword: 'TempPassword123!',
        rows: [
          { line: 2, fullName: 'Nguyen Van A', username: 'student.a', contact: '0901111111' },
          { line: 3, fullName: 'Tran Thi B', username: 'student.b', contact: '0902222222' },
        ],
      });

      expect(commitResult.importedCount).toBe(2);
      expect(mockTx.user.create).toHaveBeenCalledTimes(2);
      expect(mockTx.classroomEnrollment.create).toHaveBeenCalledTimes(2);
    });

    it('rejects commit when row content changes after preview', async () => {
      const originalRows = [
        { line: 2, fullName: 'Nguyen Van A', username: 'student.a', contact: '0901111111' },
      ];
      // Generate token using original rows
      const token = rosterTokenService.generateToken({
        adminId: 'admin-1',
        classroomId: 'cls-1',
        rowCount: 1,
        rowsHash: hashRosterRows(originalRows),
      });

      const alteredRows = [
        { line: 2, fullName: 'Nguyen Van Tampered', username: 'student.tampered', contact: '0909999999' },
      ];

      await expect(
        rosterService.commitRoster({
          adminId: 'admin-1',
          classroomId: 'cls-1',
          validationToken: token,
          defaultPassword: 'TempPassword123!',
          rows: alteredRows,
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('rejects commit when validation token belongs to different classroom', async () => {
      const rows = [
        { line: 2, fullName: 'Nguyen Van A', username: 'student.a', contact: '0901111111' },
      ];
      const token = rosterTokenService.generateToken({
        adminId: 'admin-1',
        classroomId: 'cls-other',
        rowCount: 1,
        rowsHash: hashRosterRows(rows),
      });

      await expect(
        rosterService.commitRoster({
          adminId: 'admin-1',
          classroomId: 'cls-1',
          validationToken: token,
          defaultPassword: 'TempPassword123!',
          rows: [
            { line: 2, fullName: 'Nguyen Van A', username: 'student.a', contact: '0901111111' },
          ],
        })
      ).rejects.toThrow(BadRequestError);
    });
  });
});
