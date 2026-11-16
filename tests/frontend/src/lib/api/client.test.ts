import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiDownload } from '../../../../../frontend/src/lib/api/client'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('apiDownload', () => {
  it('sends credentials and returns a safe decoded filename for binary data', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(new Blob(['file-content'], { type: 'application/pdf' }), {
        status: 200,
        headers: {
          'content-type': 'application/pdf',
          'content-disposition': 'attachment; filename="lesson%20notes.pdf"',
        },
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await apiDownload('/teacher/materials/material-id/download')

    expect(result.fileName).toBe('lesson notes.pdf')
    expect(await result.blob.text()).toBe('file-content')
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/teacher/materials/material-id/download',
      expect.objectContaining({ credentials: 'include' })
    )
  })

  it('parses the normal API error envelope for failed downloads', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: { code: 'FORBIDDEN', message: 'Không có quyền' } }), {
        status: 403,
        headers: { 'content-type': 'application/json' },
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(apiDownload('/teacher/materials/material-id/download')).rejects.toMatchObject<ApiError>({
      status: 403,
      code: 'FORBIDDEN',
      message: 'Không có quyền',
    })
  })
})
