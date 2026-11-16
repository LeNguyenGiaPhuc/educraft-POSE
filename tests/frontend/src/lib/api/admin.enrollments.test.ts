import { afterEach, describe, expect, it, vi } from 'vitest'
import { adminApi } from '../../../../../frontend/src/lib/api/admin'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('adminApi enrollment methods', () => {
  it('transfers a student to another classroom', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(adminApi.transferStudent('student-id', 'classroom-id')).resolves.toBeUndefined()

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/admin/enrollments/students/student-id/transfer',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({ targetClassroomId: 'classroom-id' }),
      })
    )
  })
})
