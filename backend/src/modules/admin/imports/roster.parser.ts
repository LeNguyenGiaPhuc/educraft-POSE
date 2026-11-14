import ExcelJS from 'exceljs';
import type { StudentImportRow, ImportIssue } from './roster.types.js';

export const EXPECTED_HEADERS = ['Họ và tên', 'Tên đăng nhập', 'Thông tin liên hệ'] as const;

function extractCellValue(cell: ExcelJS.Cell): { text: string; hasFormula: boolean } {
  const val = cell.value;
  if (val === null || val === undefined) {
    return { text: '', hasFormula: false };
  }

  if (typeof val === 'object') {
    if ('formula' in val) {
      return { text: '', hasFormula: true };
    }
    if ('richText' in val && Array.isArray((val as { richText?: Array<{ text: string }> }).richText)) {
      const text = (val as { richText: Array<{ text: string }> }).richText
        .map((t) => t.text)
        .join('')
        .trim();
      return { text, hasFormula: text.startsWith('=') };
    }
  }

  const str = String(val).trim();
  return { text: str, hasFormula: str.startsWith('=') };
}

export async function parseRosterWorkbook(
  buffer: Buffer
): Promise<{ rows: StudentImportRow[]; issues: ImportIssue[] }> {
  const issues: ImportIssue[] = [];
  const rows: StudentImportRow[] = [];

  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer as any);
  } catch {
    issues.push({
      line: 0,
      message: 'Không thể đọc nội dung file .xlsx hoặc file bị hỏng.',
    });
    return { rows, issues };
  }

  const worksheet = workbook.worksheets[0];
  if (!worksheet || worksheet.rowCount === 0) {
    issues.push({ line: 1, message: 'File không có nội dung hoặc bảng tính rỗng.' });
    return { rows, issues };
  }

  // 1. Verify Header row (Row 1)
  const headerRow = worksheet.getRow(1);
  const col1 = extractCellValue(headerRow.getCell(1)).text.toLowerCase();
  const col2 = extractCellValue(headerRow.getCell(2)).text.toLowerCase();
  const col3 = extractCellValue(headerRow.getCell(3)).text.toLowerCase();

  const isHeaderValid =
    col1 === EXPECTED_HEADERS[0].toLowerCase() &&
    col2 === EXPECTED_HEADERS[1].toLowerCase() &&
    col3 === EXPECTED_HEADERS[2].toLowerCase();

  if (!isHeaderValid) {
    issues.push({
      line: 1,
      message: 'Dòng tiêu đề phải có đúng 3 cột theo thứ tự: "Họ và tên", "Tên đăng nhập", "Thông tin liên hệ".',
    });
    return { rows, issues };
  }

  // 2. Process data rows
  const rowCount = worksheet.rowCount;
  if (rowCount < 2) {
    issues.push({ line: 1, message: 'File không có dòng dữ liệu nào.' });
    return { rows, issues };
  }

  const usernameCount = new Map<string, number>();
  const parsedEntries: Array<{
    line: number;
    fullName: string;
    username: string;
    contact: string;
    hasFormula: boolean;
    isEmpty: boolean;
  }> = [];

  for (let line = 2; line <= rowCount; line++) {
    const row = worksheet.getRow(line);
    const cell1 = extractCellValue(row.getCell(1));
    const cell2 = extractCellValue(row.getCell(2));
    const cell3 = extractCellValue(row.getCell(3));

    const hasFormula = cell1.hasFormula || cell2.hasFormula || cell3.hasFormula;
    const isEmpty = !cell1.text && !cell2.text && !cell3.text;

    if (isEmpty) {
      issues.push({ line, message: 'Dòng trống không có dữ liệu.' });
      continue;
    }

    if (hasFormula) {
      issues.push({
        line,
        message: 'Dòng chứa ô có công thức (formula), hệ thống chỉ chấp nhận văn bản thuần túy.',
      });
    }

    const key = cell2.text.toLowerCase();
    if (key) {
      usernameCount.set(key, (usernameCount.get(key) ?? 0) + 1);
    }

    parsedEntries.push({
      line,
      fullName: cell1.text,
      username: cell2.text,
      contact: cell3.text,
      hasFormula,
      isEmpty: false,
    });
  }

  if (parsedEntries.length === 0 && issues.length === 0) {
    issues.push({ line: 1, message: 'File không có dòng dữ liệu nào.' });
    return { rows, issues };
  }

  for (const entry of parsedEntries) {
    const missing: string[] = [];
    if (!entry.fullName) missing.push('Họ và tên');
    if (!entry.username) missing.push('Tên đăng nhập');
    if (!entry.contact) missing.push('Thông tin liên hệ');

    if (missing.length > 0) {
      issues.push({
        line: entry.line,
        message: `Thiếu thông tin bắt buộc: ${missing.join(', ')}.`,
      });
    }

    const key = entry.username.toLowerCase();
    if (key && (usernameCount.get(key) ?? 0) > 1) {
      issues.push({
        line: entry.line,
        message: `Tên đăng nhập "${entry.username}" bị trùng lặp với dòng khác trong file.`,
      });
    }

    rows.push({
      line: entry.line,
      fullName: entry.fullName,
      username: entry.username,
      contact: entry.contact,
    });
  }

  issues.sort((a, b) => a.line - b.line);
  return { rows, issues };
}
