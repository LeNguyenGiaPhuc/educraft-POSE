import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { sessionService } from '../../src/modules/auth/session.service.js';
import { rosterService } from '../../src/modules/admin/imports/roster.service.js';
import ExcelJS from 'exceljs';

async function createTestXlsxBuffer(rows: Array<Array<string | number | object>>): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Students');
  for (const r of rows) {
    ws.addRow(r);
  }
  const arrayBuf = await wb.xlsx.writeBuffer();
  return Buffer.from(arrayBuf);
}

describe('Admin Roster Import API (E2E)', () => {
  const app = createApp();

  const mockAdminUser = {
    id: 'admin-uuid',
    username: 'admin',
    fullName: 'Quản trị viên',
    role: 'ADMIN' as const,
    status: 'ACTIVE' as const,
    contact: null,
    mustChangePassword: false,
    sessionId: 'session-admin',
  };

  const mockTeacherUser = {
    id: 'teacher-uuid',
    username: 'teacher',
    fullName: 'Giáo viên',
    role: 'TEACHER' as const,
    status: 'ACTIVE' as const,
    contact: null,
    mustChangePassword: false,
    sessionId: 'session-teacher',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects unauthenticated requests with 401', async () => {
    const res = await request(app).post(
      '/api/v1/admin/classrooms/c1111111-1111-4111-8111-111111111111/roster/preview'
    );
    expect(res.status).toBe(401);
  });

  it('rejects teacher requests with 403', async () => {
    vi.spyOn(sessionService, 'resolveSession').mockResolvedValue(mockTeacherUser);

    const res = await request(app)
      .post('/api/v1/admin/classrooms/c1111111-1111-4111-8111-111111111111/roster/preview')
      .set('Cookie', ['educraft_session=mock_cookie']);

    expect(res.status).toBe(403);
  });

  describe('Authenticated as ADMIN', () => {
    beforeEach(() => {
      vi.spyOn(sessionService, 'resolveSession').mockResolvedValue(mockAdminUser);
    });

    it('rejects preview without file', async () => {
      const res = await request(app)
        .post('/api/v1/admin/classrooms/c1111111-1111-4111-8111-111111111111/roster/preview')
        .set('Cookie', ['educraft_session=mock_cookie']);

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Vui lòng tải lên file Excel');
    });

    it('rejects non-xlsx file upload', async () => {
      const res = await request(app)
        .post('/api/v1/admin/classrooms/c1111111-1111-4111-8111-111111111111/roster/preview')
        .set('Cookie', ['educraft_session=mock_cookie'])
        .attach('file', Buffer.from('hello world'), 'students.txt');

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('chỉ chấp nhận file Excel (.xlsx)');
    });

    it('rejects upload exceeding 5MB with 413 FILE_TOO_LARGE', async () => {
      const oversizedBuffer = Buffer.alloc(5 * 1024 * 1024 + 1024, 0);

      const res = await request(app)
        .post('/api/v1/admin/classrooms/c1111111-1111-4111-8111-111111111111/roster/preview')
        .set('Cookie', ['educraft_session=mock_cookie'])
        .attach('file', oversizedBuffer, 'oversized.xlsx');

      expect(res.status).toBe(413);
      expect(res.body.error.code).toBe('FILE_TOO_LARGE');
      expect(res.body.error.requestId).toBeDefined();
    });

    it('POST /preview returns preview result with validationToken for valid excel', async () => {
      const validBuffer = await createTestXlsxBuffer([
        ['Họ và tên', 'Tên đăng nhập', 'Thông tin liên hệ'],
        ['Nguyen Van A', 'nguyenvana', '0901234567'],
      ]);

      vi.spyOn(rosterService, 'previewRoster').mockResolvedValue({
        rows: [
          { line: 2, fullName: 'Nguyen Van A', username: 'nguyenvana', contact: '0901234567' },
        ],
        issues: [],
        isValid: true,
        validationToken: 'mock-valid-token.signature',
        totalRows: 1,
        validRows: 1,
      });

      const res = await request(app)
        .post('/api/v1/admin/classrooms/c1111111-1111-4111-8111-111111111111/roster/preview')
        .set('Cookie', ['educraft_session=mock_cookie'])
        .attach('file', validBuffer, 'students.xlsx');

      expect(res.status).toBe(200);
      expect(res.body.data.isValid).toBe(true);
      expect(res.body.data.validationToken).toBe('mock-valid-token.signature');
      expect(res.body.data.rows).toHaveLength(1);
    });

    it('POST /commit rejects password shorter than 8 chars', async () => {
      const res = await request(app)
        .post('/api/v1/admin/classrooms/c1111111-1111-4111-8111-111111111111/roster/commit')
        .set('Cookie', ['educraft_session=mock_cookie'])
        .send({
          validationToken: 'token',
          defaultPassword: 'short',
          rows: [
            { line: 2, fullName: 'Nguyen Van A', username: 'nguyenvana', contact: '0901234567' },
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('POST /commit successfully creates students with 201', async () => {
      vi.spyOn(rosterService, 'commitRoster').mockResolvedValue({
        importedCount: 2,
      });

      const res = await request(app)
        .post('/api/v1/admin/classrooms/c1111111-1111-4111-8111-111111111111/roster/commit')
        .set('Cookie', ['educraft_session=mock_cookie'])
        .send({
          validationToken: 'valid.token',
          defaultPassword: 'StrongPassword123!',
          rows: [
            { line: 2, fullName: 'Nguyen Van A', username: 'student.a', contact: '0901234567' },
            { line: 3, fullName: 'Tran Thi B', username: 'student.b', contact: '0907654321' },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.importedCount).toBe(2);
      expect(res.body.data.defaultPassword).toBeUndefined();
      expect(res.body.data.password).toBeUndefined();
    });
  });
});
