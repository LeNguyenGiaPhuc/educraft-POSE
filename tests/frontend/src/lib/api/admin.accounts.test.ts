import { afterEach, describe, expect, it, vi } from 'vitest'
import { adminApi } from '../../../../../frontend/src/lib/api/admin'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('adminApi account methods', () => {
  it('resets an account password through the admin API', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { success: true, message: 'Password updated' } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(adminApi.resetAccountPassword('account-id', 'secret1')).resolves.toEqual({
      success: true,
      message: 'Password updated',
    })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/admin/accounts/account-id/password',
      expect.objectContaining({
        method: 'PATCH',
        credentials: 'include',
        body: JSON.stringify({ password: 'secret1' }),
      })
    )
  })
})
