import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import { parseRosterWorkbook } from '../../../../../../backend/src/modules/admin/imports/roster.parser.js';

async function createTestWorkbookBuffer(rows: Array<Array<string | number | object>>): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Students');
  for (const r of rows) {
    ws.addRow(r);
  }
  const arrayBuf = await wb.xlsx.writeBuffer();
  return Buffer.from(arrayBuf);
}

describe('roster.parser', () => {
  it('rejects corrupt buffer with line 0 issue', async () => {
    const corruptBuffer = Buffer.from('not an excel file');
    const result = await parseRosterWorkbook(corruptBuffer);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].line).toBe(0);
  });

  it('rejects invalid header row with line 1 issue', async () => {
    const buffer = await createTestWorkbookBuffer([
      ['Tên', 'Username', 'Email'], // wrong headers
      ['Nguyen Van A', 'nguyenvana', '0901234567'],
    ]);
    const result = await parseRosterWorkbook(buffer);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].line).toBe(1);
    expect(result.issues[0].message).toContain('Dòng tiêu đề phải có đúng 3 cột');
  });

  it('rejects workbook with only header row', async () => {
    const buffer = await createTestWorkbookBuffer([
      ['Họ và tên', 'Tên đăng nhập', 'Thông tin liên hệ'],
    ]);
    const result = await parseRosterWorkbook(buffer);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].message).toContain('File không có dòng dữ liệu nào');
  });

  it('detects missing fields in data row', async () => {
    const buffer = await createTestWorkbookBuffer([
      ['Họ và tên', 'Tên đăng nhập', 'Thông tin liên hệ'],
      ['Nguyen Van A', '', '0901234567'], // missing username
    ]);
    const result = await parseRosterWorkbook(buffer);
    expect(result.issues.some((i) => i.line === 2 && i.message.includes('Tên đăng nhập'))).toBe(true);
  });

  it('detects formula in data cells', async () => {
    const buffer = await createTestWorkbookBuffer([
      ['Họ và tên', 'Tên đăng nhập', 'Thông tin liên hệ'],
      ['=SUM(1,2)', 'nguyenvana', '0901234567'],
    ]);
    const result = await parseRosterWorkbook(buffer);
    expect(result.issues.some((i) => i.line === 2 && i.message.includes('công thức'))).toBe(true);
  });

  it('detects duplicate usernames within file', async () => {
    const buffer = await createTestWorkbookBuffer([
      ['Họ và tên', 'Tên đăng nhập', 'Thông tin liên hệ'],
      ['Nguyen Van A', 'student1', '0901234567'],
      ['Tran Van B', 'STUDENT1', '0907654321'],
    ]);
    const result = await parseRosterWorkbook(buffer);
    expect(result.issues.filter((i) => i.message.includes('trùng lặp với dòng khác'))).toHaveLength(2);
  });

  it('successfully parses valid rows', async () => {
    const buffer = await createTestWorkbookBuffer([
      ['Họ và tên', 'Tên đăng nhập', 'Thông tin liên hệ'],
      ['Nguyen Van A', 'nguyen.van.a', '0901234567'],
      ['Tran Thi B', 'tran.thi.b', 'b@example.com'],
    ]);
    const result = await parseRosterWorkbook(buffer);
    expect(result.issues).toHaveLength(0);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].fullName).toBe('Nguyen Van A');
    expect(result.rows[1].username).toBe('tran.thi.b');
  });
});
