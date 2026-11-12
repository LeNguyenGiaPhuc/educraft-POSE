import test from 'node:test'
import assert from 'node:assert/strict'
import { parseWorkbookRows, validateStudentImport } from './studentImport.ts'

test('studentImport: rejects empty raw rows', () => {
  const result = parseWorkbookRows([])
  assert.equal(result.rows.length, 0)
  assert.equal(result.issues.length, 1)
  assert.match(result.issues[0].message, /rỗng/i)
})

test('studentImport: rejects invalid header row', () => {
  const badHeaders = [
    ['Username', 'Full name', 'Phone'],
    ['Họ và tên', 'Email'],
    ['Tên', 'Tên đăng nhập', 'Thông tin liên hệ'],
    ['Họ và tên', 'Tên đăng nhập', 'Thông tin liên hệ', 'Mật khẩu'],
  ]

  for (const header of badHeaders) {
    const result = parseWorkbookRows([header, ['Nguyễn Văn A', 'a.nguyen', '0912345678']])
    assert.equal(result.rows.length, 0)
    assert.equal(result.issues.length, 1)
    assert.match(result.issues[0].message, /Dòng tiêu đề phải có đúng 3 cột/)
  }
})

test('studentImport: rejects file with only header and no data rows', () => {
  const result = parseWorkbookRows([['Họ và tên', 'Tên đăng nhập', 'Thông tin liên hệ']])
  assert.equal(result.rows.length, 0)
  assert.equal(result.issues.length, 1)
  assert.match(result.issues[0].message, /không có dòng dữ liệu nào/i)
})

test('studentImport: parses valid header and rows with line numbers starting at 2', () => {
  const raw = [
    ['Họ và tên', 'Tên đăng nhập', 'Thông tin liên hệ'],
    ['Nguyễn Văn A', 'a.nguyen', '0912345678'],
    ['Trần Thị B', 'b.tran', 'b.tran@example.com'],
  ]
  const result = parseWorkbookRows(raw)
  assert.equal(result.issues.length, 0)
  assert.equal(result.rows.length, 2)
  assert.equal(result.rows[0].line, 2)
  assert.equal(result.rows[0].fullName, 'Nguyễn Văn A')
  assert.equal(result.rows[0].username, 'a.nguyen')
  assert.equal(result.rows[1].line, 3)
})

test('studentImport: detects missing fields', () => {
  const rows = [
    { line: 2, fullName: '', username: 'a.nguyen', contact: '0912345678' },
    { line: 3, fullName: 'Trần B', username: '', contact: '0912345678' },
    { line: 4, fullName: 'Lê C', username: 'c.le', contact: '' },
  ]
  const issues = validateStudentImport(rows, new Set())
  assert.equal(issues.length, 3)
  assert.match(issues[0].message, /Họ và tên/)
  assert.match(issues[1].message, /Tên đăng nhập/)
  assert.match(issues[2].message, /Thông tin liên hệ/)
})

test('studentImport: detects duplicate usernames in file', () => {
  const rows = [
    { line: 2, fullName: 'Nguyễn A1', username: 'duplicate.user', contact: '0911' },
    { line: 3, fullName: 'Nguyễn A2', username: 'DUPLICATE.USER', contact: '0922' },
    { line: 4, fullName: 'Trần B', username: 'unique.user', contact: '0933' },
  ]
  const issues = validateStudentImport(rows, new Set())
  assert.equal(issues.length, 2)
  assert.equal(issues[0].line, 2)
  assert.match(issues[0].message, /trùng lặp/)
  assert.equal(issues[1].line, 3)
  assert.match(issues[1].message, /trùng lặp/)
})

test('studentImport: rejects usernames that already exist in system', () => {
  const existing = new Set(['le.gia.phuc', 'nguyen.minh.anh'])
  const rows = [
    { line: 2, fullName: 'Lê Gia Phúc', username: 'le.gia.phuc', contact: 'phuc@example.com' },
    { line: 3, fullName: 'Học sinh Mới', username: 'new.student', contact: 'new@example.com' },
  ]
  const issues = validateStudentImport(rows, existing)
  assert.equal(issues.length, 1)
  assert.equal(issues[0].line, 2)
  assert.match(issues[0].message, /đã tồn tại trên hệ thống/)
})

test('studentImport: atomic guard - all valid passes with 0 issues', () => {
  const existing = new Set(['le.gia.phuc'])
  const rows = [
    { line: 2, fullName: 'Nguyễn Văn An', username: 'an.nguyen.2026', contact: 'an@example.com' },
    { line: 3, fullName: 'Trần Thị Bình', username: 'binh.tran.2026', contact: '0987654321' },
  ]
  const issues = validateStudentImport(rows, existing)
  assert.equal(issues.length, 0)
})
