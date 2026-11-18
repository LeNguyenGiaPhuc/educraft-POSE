import { afterEach, describe, expect, it, vi } from 'vitest'
import { adminApi } from '../../../../../frontend/src/lib/api/admin'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('adminApi roster methods', () => {
  it('previews a roster for a new classroom with multipart form data', async () => {
    const preview = {
      rows: [],
      issues: [],
      normalizationNotices: [],
      isValid: false,
      validationToken: null,
      totalRows: 0,
      validRows: 0,
    }
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: preview }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    const file = new File(['xlsx'], 'students.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    await expect(adminApi.previewNewClassroomRoster(file)).resolves.toEqual(preview)

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/admin/classrooms/roster/preview',
      expect.objectContaining({ method: 'POST', credentials: 'include' })
    )
    expect(request.body).toBeInstanceOf(FormData)
    expect((request.body as FormData).get('file')).toBe(file)
  })

  it('commits a validated new classroom roster', async () => {
    const result = { classroomId: 'class-id', importedCount: 2 }
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: result }), {
        status: 201,
        headers: { 'content-type': 'application/json' },
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    const input = {
      validationToken: 'token.signature',
      name: '11A1',
      gradeLevel: 11,
      academicYear: '2026-2027',
      initialStudentPassword: 'Password123',
      rows: [{ line: 2, fullName: 'Nguyen Van An', username: 'nguyen.an', contact: '0901234567' }],
    }

    await expect(adminApi.commitNewClassroomRoster(input)).resolves.toEqual(result)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/admin/classrooms/roster/commit',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify(input),
      })
    )
  })
})
