import { afterEach, describe, expect, it, vi } from 'vitest'
import { adminApi, type AdminSubject } from '../../../../../frontend/src/lib/api/admin'

const updatedSubject: AdminSubject = {
  id: 'subject-id',
  name: 'Lịch sử',
  isActive: true,
  teacherCount: 2,
  classroomCount: 3,
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('adminApi subject methods', () => {
  it('updates a subject name through the admin API', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: updatedSubject }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(adminApi.updateSubject('subject-id', 'Lịch sử')).resolves.toEqual(updatedSubject)

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/admin/subjects/subject-id',
      expect.objectContaining({
        method: 'PATCH',
        credentials: 'include',
        body: JSON.stringify({ name: 'Lịch sử' }),
      })
    )
  })
})
