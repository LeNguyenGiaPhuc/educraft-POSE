import ExcelJS from 'exceljs';
import {
  getIdentityErrorMessage,
  normalizeContact,
  normalizeFullName,
  normalizeUsername,
  validateContact,
  validateFullName,
  validateUsername,
} from '../../../shared/account-identity.js';
import type {
  ImportIssue,
  NormalizationNotice,
  StudentImportRow,
} from './roster.types.js';

export const EXPECTED_HEADERS = ['Họ và tên', 'Tên đăng nhập', 'Thông tin liên hệ'] as const;
export const MAX_ROSTER_ROWS = 500;

type ExtractedCell = {
  raw: string;
  text: string;
  hasFormula: boolean;
};

type ParseResult = {
  rows: StudentImportRow[];
  issues: ImportIssue[];
  normalizationNotices: NormalizationNotice[];
  isValid: boolean;
};

function createIssue(
  line: number,
  field: ImportIssue['field'],
  code: string,
  message: string
): ImportIssue {
  return { line, field, code, message };
}

function extractCellValue(cell: ExcelJS.Cell): ExtractedCell {
  const value = cell.value;
  if (value === null || value === undefined) {
    return { raw: '', text: '', hasFormula: false };
  }

  if (typeof value === 'object') {
    if ('formula' in value) {
      return { raw: '', text: '', hasFormula: true };
    }
    if ('richText' in value && Array.isArray((value as { richText?: Array<{ text: string }> }).richText)) {
      const raw = (value as { richText: Array<{ text: string }> }).richText
        .map((item) => item.text)
        .join('');
      return { raw, text: raw.trim(), hasFormula: raw.trim().startsWith('=') };
    }
  }

  const raw = String(value);
  return { raw, text: raw.trim(), hasFormula: raw.trim().startsWith('=') };
}

function hasPopulatedValue(cell: ExtractedCell): boolean {
  return cell.hasFormula || cell.text.length > 0;
}

function getRowCells(worksheet: ExcelJS.Worksheet, line: number): ExtractedCell[] {
  const row = worksheet.getRow(line);
  const cells: ExtractedCell[] = [];
  for (let column = 1; column <= worksheet.columnCount; column += 1) {
    cells.push(extractCellValue(row.getCell(column)));
  }
  return cells;
}

function getLastPopulatedRow(worksheet: ExcelJS.Worksheet): number {
  let lastLine = 0;
  for (let line = 1; line <= worksheet.rowCount; line += 1) {
    const cells = getRowCells(worksheet, line);
    if (cells.some(hasPopulatedValue)) {
      lastLine = line;
    }
  }
  return lastLine;
}

function addMergeIssues(worksheet: ExcelJS.Worksheet, issues: ImportIssue[]): void {
  for (const merge of worksheet.model.merges ?? []) {
    const [startAddress] = merge.split(':');
    const match = startAddress.match(/^(?:[A-Z]+)(\d+)$/i);
    const line = match ? Number(match[1]) : 0;
    issues.push(
      createIssue(
        line,
        'file',
        'MERGED_CELL',
        'File không được chứa ô đã gộp trong vùng dữ liệu.'
      )
    );
  }
}

function addNormalizationNotice(
  notices: NormalizationNotice[],
  line: number,
  field: NormalizationNotice['field'],
  original: string,
  normalized: string
): void {
  if (original === normalized) return;
  notices.push({
    line,
    field,
    code: 'NORMALIZED',
    message: `Đã chuẩn hóa giá trị từ "${original}" thành "${normalized}".`,
  });
}

function validateRow(
  line: number,
  values: { fullName: string; username: string; contact: string },
  issues: ImportIssue[],
  notices: NormalizationNotice[],
  original: { fullName: string; username: string; contact: string }
): StudentImportRow {
  const fullName = normalizeFullName(values.fullName);
  const username = normalizeUsername(values.username);
  const contact = normalizeContact(values.contact);

  addNormalizationNotice(notices, line, 'fullName', original.fullName, fullName);
  addNormalizationNotice(notices, line, 'username', original.username, username);
  addNormalizationNotice(notices, line, 'contact', original.contact, contact);

  const fullNameError = validateFullName(fullName);
  if (fullNameError) {
    issues.push(createIssue(line, 'fullName', fullNameError, getIdentityErrorMessage(fullNameError)));
  }

  const usernameError = validateUsername(username);
  if (usernameError) {
    issues.push(createIssue(line, 'username', usernameError, getIdentityErrorMessage(usernameError)));
  }

  const contactError = validateContact(contact);
  if (contactError) {
    issues.push(createIssue(line, 'contact', contactError, getIdentityErrorMessage(contactError)));
  }

  const changed =
    original.fullName !== fullName || original.username !== username || original.contact !== contact;

  return {
    line,
    fullName,
    username,
    contact,
    ...(changed ? { original } : {}),
  };
}

export async function parseRosterWorkbook(buffer: Buffer): Promise<ParseResult> {
  const issues: ImportIssue[] = [];
  const normalizationNotices: NormalizationNotice[] = [];
  const rows: StudentImportRow[] = [];

  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer as any);
  } catch {
    issues.push(
      createIssue(0, 'file', 'INVALID_XLSX', 'Không thể đọc nội dung file .xlsx hoặc file bị hỏng.')
    );
    return { rows, issues, normalizationNotices, isValid: false };
  }

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    issues.push(createIssue(0, 'file', 'EMPTY_WORKBOOK', 'File không có worksheet nào.'));
    return { rows, issues, normalizationNotices, isValid: false };
  }

  addMergeIssues(worksheet, issues);
  const lastLine = getLastPopulatedRow(worksheet);
  if (lastLine === 0) {
    issues.push(createIssue(1, 'file', 'EMPTY_WORKBOOK', 'File không có nội dung hoặc bảng tính rỗng.'));
    return { rows, issues, normalizationNotices, isValid: false };
  }

  const headerCells = getRowCells(worksheet, 1);
  const headerTexts = headerCells.filter(hasPopulatedValue).map((cell) => cell.text.toLowerCase());
  const expectedHeaders = EXPECTED_HEADERS.map((header) => header.toLowerCase());
  if (
    headerTexts.length !== expectedHeaders.length ||
    headerTexts.some((header, index) => header !== expectedHeaders[index])
  ) {
    if (headerTexts.length > expectedHeaders.length) {
      issues.push(
        createIssue(
          1,
          'file',
          'EXTRA_COLUMN',
          'Dòng tiêu đề không được có cột phát sinh ngoài 3 cột chuẩn.'
        )
      );
    }
    issues.push(
      createIssue(
        1,
        'file',
        'INVALID_HEADER',
        'Dòng tiêu đề phải có đúng 3 cột theo thứ tự: "Họ và tên", "Tên đăng nhập", "Thông tin liên hệ".'
      )
    );
    return { rows, issues, normalizationNotices, isValid: false };
  }

  if (lastLine < 2) {
    issues.push(createIssue(1, 'file', 'NO_DATA_ROWS', 'File không có dòng dữ liệu nào.'));
    return { rows, issues, normalizationNotices, isValid: false };
  }

  const dataLineCount = lastLine - 1;
  if (dataLineCount > MAX_ROSTER_ROWS) {
    issues.push(
      createIssue(
        0,
        'file',
        'ROW_LIMIT',
        `File chỉ được chứa tối đa ${MAX_ROSTER_ROWS} học sinh.`
      )
    );
  }

  const rowLimit = Math.min(lastLine, MAX_ROSTER_ROWS + 1);
  for (let line = 2; line <= rowLimit; line += 1) {
    const cells = getRowCells(worksheet, line);
    const firstThree = cells.slice(0, 3);
    const hasAnyValue = cells.some(hasPopulatedValue);

    if (!hasAnyValue) {
      issues.push(createIssue(line, 'file', 'BLANK_ROW', 'Dòng trống không được nằm giữa danh sách dữ liệu.'));
      continue;
    }

    if (cells.slice(3).some(hasPopulatedValue)) {
      issues.push(createIssue(line, 'file', 'EXTRA_COLUMN', 'Dòng dữ liệu không được có cột phát sinh ngoài 3 cột chuẩn.'));
    }

    if (cells.some((cell) => cell.hasFormula)) {
      issues.push(
        createIssue(
          line,
          'file',
          'FORMULA_CELL',
          'Dòng dữ liệu không được chứa công thức; hãy dán giá trị văn bản thuần túy.'
        )
      );
    }

    const original = {
      fullName: firstThree[0]?.raw ?? '',
      username: firstThree[1]?.raw ?? '',
      contact: firstThree[2]?.raw ?? '',
    };
    rows.push(
      validateRow(
        line,
        {
          fullName: firstThree[0]?.text ?? '',
          username: firstThree[1]?.text ?? '',
          contact: firstThree[2]?.text ?? '',
        },
        issues,
        normalizationNotices,
        original
      )
    );
  }

  const usernameLines = new Map<string, number[]>();
  for (const row of rows) {
    const lines = usernameLines.get(row.username) ?? [];
    lines.push(row.line);
    usernameLines.set(row.username, lines);
  }
  for (const [username, lines] of usernameLines) {
    if (lines.length < 2) continue;
    for (const line of lines) {
      issues.push(
        createIssue(
          line,
          'username',
          'DUPLICATE_USERNAME',
          `Tên đăng nhập "${username}" bị trùng lặp với dòng khác trong file.`
        )
      );
    }
  }

  issues.sort((left, right) => left.line - right.line || left.field.localeCompare(right.field));
  return {
    rows,
    issues,
    normalizationNotices,
    isValid: issues.length === 0 && rows.length > 0,
  };
}
