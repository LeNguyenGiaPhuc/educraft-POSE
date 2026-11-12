import readXlsxFile from 'read-excel-file/browser'
import writeXlsxFile, { type Row } from 'write-excel-file/browser'

export type StudentImportRow = {
  line: number
  fullName: string
  username: string
  contact: string
}

export type ImportIssue = {
  line: number
  message: string
}

export type StudentImportIssue = ImportIssue

export type ImportCheck = {
  rows: StudentImportRow[]
  issues: ImportIssue[]
  valid: boolean
}

export const EXPECTED_HEADERS = ['Họ và tên', 'Tên đăng nhập', 'Thông tin liên hệ'] as const

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

export function parseWorkbookRows(rawRows: unknown[][]): { rows: StudentImportRow[]; issues: ImportIssue[] } {
  const issues: ImportIssue[] = []
  const rows: StudentImportRow[] = []

  if (!rawRows || rawRows.length === 0) {
    issues.push({ line: 1, message: 'File không có nội dung hoặc bảng tính rỗng.' })
    return { rows, issues }
  }

  const headerRow = rawRows[0] ?? []
  const headerCols = headerRow.map(cleanCell)

  // Verify header has exactly the 3 expected columns in exact order
  const isHeaderValid =
    headerCols.length === 3 &&
    headerCols[0].toLowerCase() === EXPECTED_HEADERS[0].toLowerCase() &&
    headerCols[1].toLowerCase() === EXPECTED_HEADERS[1].toLowerCase() &&
    headerCols[2].toLowerCase() === EXPECTED_HEADERS[2].toLowerCase()

  if (!isHeaderValid) {
    issues.push({
      line: 1,
      message: 'Dòng tiêu đề phải có đúng 3 cột theo thứ tự: "Họ và tên", "Tên đăng nhập", "Thông tin liên hệ".',
    })
    return { rows, issues }
  }

  const dataRows = rawRows.slice(1)
  if (dataRows.length === 0) {
    issues.push({ line: 1, message: 'File không có dòng dữ liệu nào.' })
    return { rows, issues }
  }

  dataRows.forEach((row, idx) => {
    const line = idx + 2 // Row 1 is header, so first data line is 2
    const fullName = cleanCell(row?.[0])
    const username = cleanCell(row?.[1])
    const contact = cleanCell(row?.[2])

    // Skip entirely empty row
    if (!fullName && !username && !contact) {
      issues.push({ line, message: 'Dòng trống không có dữ liệu.' })
      return
    }

    rows.push({ line, fullName, username, contact })
  })

  return { rows, issues }
}

export async function readStudentWorkbook(file: File): Promise<{ rows: StudentImportRow[]; issues: ImportIssue[] }> {
  if (!file) {
    return { rows: [], issues: [{ line: 0, message: 'Chưa chọn file.' }] }
  }

  if (!file.name.toLowerCase().endsWith('.xlsx')) {
    return {
      rows: [],
      issues: [{ line: 0, message: 'Định dạng file không hợp lệ. Hệ thống chỉ chấp nhận file Excel (.xlsx).' }],
    }
  }

  try {
    const rawRows = (await readXlsxFile(file)) as unknown as unknown[][]
    return parseWorkbookRows(rawRows)
  } catch {
    return {
      rows: [],
      issues: [{ line: 0, message: 'Không thể đọc nội dung file .xlsx hoặc file bị hỏng.' }],
    }
  }
}

export function validateStudentImport(
  rows: StudentImportRow[],
  existingUsernames: ReadonlySet<string>
): ImportIssue[] {
  const issues: ImportIssue[] = []
  const usernameCount = new Map<string, number>()

  for (const row of rows) {
    const key = row.username.toLowerCase().trim()
    if (key) {
      usernameCount.set(key, (usernameCount.get(key) ?? 0) + 1)
    }
  }

  for (const row of rows) {
    const missing: string[] = []
    if (!row.fullName.trim()) missing.push('Họ và tên')
    if (!row.username.trim()) missing.push('Tên đăng nhập')
    if (!row.contact.trim()) missing.push('Thông tin liên hệ')

    if (missing.length > 0) {
      issues.push({
        line: row.line,
        message: `Thiếu thông tin bắt buộc: ${missing.join(', ')}.`,
      })
    }

    const key = row.username.toLowerCase().trim()
    if (key) {
      if ((usernameCount.get(key) ?? 0) > 1) {
        issues.push({
          line: row.line,
          message: `Tên đăng nhập "${row.username}" bị trùng lặp với dòng khác trong file.`,
        })
      }

      if (existingUsernames.has(key)) {
        issues.push({
          line: row.line,
          message: `Tên đăng nhập "${row.username}" đã tồn tại trên hệ thống. Excel chỉ tạo tài khoản mới.`,
        })
      }
    }
  }

  return issues.sort((a, b) => a.line - b.line)
}
