import readXlsxFile from 'read-excel-file/browser'
import writeXlsxFile, { type Row } from 'write-excel-file/browser'
import {
  normalizeContact,
  normalizeFullName,
  normalizeUsername,
  validateContact,
  validateFullName,
  validateUsername,
} from '../../../lib/accountIdentity.ts'

export type StudentImportRow = {
  line: number
  fullName: string
  username: string
  contact: string
  original?: {
    fullName: string
    username: string
    contact: string
  }
}

export type ImportIssue = {
  line: number
  field?: 'file' | 'fullName' | 'username' | 'contact'
  code?: string
  message: string
}

export type StudentImportIssue = ImportIssue

export type ImportCheck = {
  rows: StudentImportRow[]
  issues: ImportIssue[]
  normalizationNotices?: ImportIssue[]
  valid: boolean
}

export const EXPECTED_HEADERS = ['Họ và tên', 'Tên đăng nhập', 'Thông tin liên hệ'] as const
const MAX_ROSTER_ROWS = 500

export async function downloadStudentTemplateXlsx(): Promise<void> {
  const data: Row[] = [
    [
      { value: 'Họ và tên', fontWeight: 'bold' },
      { value: 'Tên đăng nhập', fontWeight: 'bold' },
      { value: 'Thông tin liên hệ', fontWeight: 'bold' },
    ],
    [
      { value: 'Nguyễn Văn An' },
      { value: 'nguyen.van.an' },
      { value: 'an.nguyen@example.com' },
    ],
    [
      { value: 'Trần Thị Bích' },
      { value: 'tran.thi.bich' },
      { value: '0912345678' },
    ],
    [
      { value: 'Lê Hoàng Nam' },
      { value: 'le.hoang.nam' },
      { value: 'nam.le@example.edu.vn' },
    ],
  ]

  const output = writeXlsxFile(data)
  await output.toFile('mau_danh_sach_hoc_sinh.xlsx')
}

function cleanCell(cell: unknown): string {
  if (cell === null || cell === undefined) return ''
  return String(cell).trim()
}

function addIssue(
  issues: ImportIssue[],
  line: number,
  field: ImportIssue['field'],
  code: string,
  message: string,
) {
  issues.push({ line, field, code, message })
}

export function parseWorkbookRows(rawRows: unknown[][]): {
  rows: StudentImportRow[]
  issues: ImportIssue[]
  normalizationNotices: ImportIssue[]
} {
  const issues: ImportIssue[] = []
  const normalizationNotices: ImportIssue[] = []
  const rows: StudentImportRow[] = []

  if (!rawRows || rawRows.length === 0) {
    addIssue(issues, 1, 'file', 'EMPTY_WORKBOOK', 'File không có nội dung hoặc bảng tính rỗng.')
    return { rows, issues, normalizationNotices }
  }

  const headerRow = rawRows[0] ?? []
  const headerCols = headerRow.map(cleanCell)
  const expectedHeaders = EXPECTED_HEADERS.map((header) => header.toLowerCase())
  const isHeaderValid =
    headerCols.length === expectedHeaders.length &&
    headerCols.every((header, index) => header.toLowerCase() === expectedHeaders[index])

  if (!isHeaderValid) {
    addIssue(issues, 1, 'file', 'INVALID_HEADER', 'Dòng tiêu đề phải có đúng 3 cột theo thứ tự: "Họ và tên", "Tên đăng nhập", "Thông tin liên hệ".')
    return { rows, issues, normalizationNotices }
  }

  const dataRows = rawRows.slice(1)
  if (dataRows.length === 0) {
    addIssue(issues, 1, 'file', 'NO_DATA_ROWS', 'File không có dòng dữ liệu nào.')
    return { rows, issues, normalizationNotices }
  }
  if (dataRows.length > MAX_ROSTER_ROWS) {
    addIssue(issues, 0, 'file', 'ROW_LIMIT', `File chỉ được chứa tối đa ${MAX_ROSTER_ROWS} học sinh.`)
  }

  for (const [index, row] of dataRows.slice(0, MAX_ROSTER_ROWS).entries()) {
    const line = index + 2
    const fullName = cleanCell(row?.[0])
    const username = cleanCell(row?.[1])
    const contact = cleanCell(row?.[2])

    if (row && row.length > 3 && row.slice(3).some((cell) => cleanCell(cell))) {
      addIssue(issues, line, 'file', 'EXTRA_COLUMN', 'Dòng dữ liệu không được có cột phát sinh ngoài 3 cột chuẩn.')
    }
    if (!fullName && !username && !contact) {
      addIssue(issues, line, 'file', 'BLANK_ROW', 'Dòng trống không được nằm giữa danh sách dữ liệu.')
      continue
    }

    const normalizedRow: StudentImportRow = {
      line,
      fullName: normalizeFullName(fullName),
      username: normalizeUsername(username),
      contact: normalizeContact(contact),
    }
    const changed = fullName !== normalizedRow.fullName || username !== normalizedRow.username || contact !== normalizedRow.contact
    if (changed) {
      normalizedRow.original = { fullName, username, contact }
      if (fullName !== normalizedRow.fullName) addIssue(normalizationNotices, line, 'fullName', 'NORMALIZED', `Đã chuẩn hóa họ và tên thành "${normalizedRow.fullName}".`)
      if (username !== normalizedRow.username) addIssue(normalizationNotices, line, 'username', 'NORMALIZED', `Đã chuẩn hóa tên đăng nhập thành "${normalizedRow.username}".`)
      if (contact !== normalizedRow.contact) addIssue(normalizationNotices, line, 'contact', 'NORMALIZED', `Đã chuẩn hóa thông tin liên hệ thành "${normalizedRow.contact}".`)
    }
    rows.push(normalizedRow)
  }

  const usernameCounts = new Map<string, number>()
  for (const row of rows) {
    usernameCounts.set(row.username, (usernameCounts.get(row.username) ?? 0) + 1)
  }
  for (const row of rows) {
    const fullNameError = validateFullName(row.fullName)
    const usernameError = validateUsername(row.username)
    const contactError = validateContact(row.contact)
    if (fullNameError) addIssue(issues, row.line, 'fullName', 'INVALID_FULL_NAME', fullNameError)
    if (usernameError) addIssue(issues, row.line, 'username', 'INVALID_USERNAME', usernameError)
    if (contactError) addIssue(issues, row.line, 'contact', 'INVALID_CONTACT', contactError)
    if ((usernameCounts.get(row.username) ?? 0) > 1) {
      addIssue(issues, row.line, 'username', 'DUPLICATE_USERNAME', `Tên đăng nhập "${row.username}" bị trùng lặp với dòng khác trong file.`)
    }
  }

  issues.sort((left, right) => left.line - right.line)
  return { rows, issues, normalizationNotices }
}

export async function readStudentWorkbook(file: File): Promise<{ rows: StudentImportRow[]; issues: ImportIssue[]; normalizationNotices?: ImportIssue[] }> {
  if (!file) {
    return { rows: [], issues: [{ line: 0, field: 'file', code: 'FILE_REQUIRED', message: 'Chưa chọn file.' }] }
  }

  if (!file.name.toLowerCase().endsWith('.xlsx') || file.size > 5 * 1024 * 1024) {
    return {
      rows: [],
      issues: [{ line: 0, field: 'file', code: 'INVALID_FILE', message: file.size > 5 * 1024 * 1024 ? 'File Excel không được vượt quá 5 MB.' : 'Định dạng file không hợp lệ. Hệ thống chỉ chấp nhận file Excel (.xlsx).' }],
    }
  }

  try {
    const rawRows = (await readXlsxFile(file)) as unknown as unknown[][]
    return parseWorkbookRows(rawRows)
  } catch {
    return {
      rows: [],
      issues: [{ line: 0, field: 'file', code: 'INVALID_XLSX', message: 'Không thể đọc nội dung file .xlsx hoặc file bị hỏng.' }],
    }
  }
}

export function validateStudentImport(
  rows: StudentImportRow[],
  existingUsernames: ReadonlySet<string>,
): ImportIssue[] {
  const issues: ImportIssue[] = []
  const usernameCount = new Map<string, number>()

  for (const row of rows) {
    const key = normalizeUsername(row.username)
    usernameCount.set(key, (usernameCount.get(key) ?? 0) + 1)
  }

  for (const row of rows) {
    const normalizedUsername = normalizeUsername(row.username)
    const fullNameError = validateFullName(row.fullName)
    const usernameError = validateUsername(row.username)
    const contactError = validateContact(row.contact)
    if (fullNameError) addIssue(issues, row.line, 'fullName', 'INVALID_FULL_NAME', fullNameError)
    if (usernameError) addIssue(issues, row.line, 'username', 'INVALID_USERNAME', usernameError)
    if (contactError) addIssue(issues, row.line, 'contact', 'INVALID_CONTACT', contactError)
    if ((usernameCount.get(normalizedUsername) ?? 0) > 1) {
      addIssue(issues, row.line, 'username', 'DUPLICATE_USERNAME', `Tên đăng nhập "${normalizedUsername}" bị trùng lặp với dòng khác trong file.`)
    }
    if (existingUsernames.has(normalizedUsername)) {
      addIssue(issues, row.line, 'username', 'USERNAME_EXISTS', `Tên đăng nhập "${normalizedUsername}" đã tồn tại trên hệ thống. Excel chỉ tạo tài khoản mới.`)
    }
  }

  return issues.sort((left, right) => left.line - right.line)
}
