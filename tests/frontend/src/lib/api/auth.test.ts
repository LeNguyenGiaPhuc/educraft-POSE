import { afterEach, describe, expect, it, vi } from 'vitest'
import { authApi } from '../../../../../frontend/src/lib/api/auth'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('authApi password methods', () => {
  it('changes the current password through the auth API', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { success: true } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(authApi.changePassword('current-secret', 'new-secret')).resolves.toBeUndefined()

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/auth/password',
      expect.objectContaining({
        method: 'PATCH',
        credentials: 'include',
        body: JSON.stringify({ currentPassword: 'current-secret', newPassword: 'new-secret' }),
      })
    )
  })
})
