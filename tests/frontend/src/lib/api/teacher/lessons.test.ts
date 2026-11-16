import { afterEach, describe, expect, it, vi } from 'vitest'
import { teacherLessonsApi } from '../../../../../../frontend/src/lib/api/teacher/lessons'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('teacherLessonsApi', () => {
  it('creates lessons with JSON and uploads material as FormData', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { id: 'lesson-id', title: 'Bài học' } }), { status: 201, headers: { 'content-type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { id: 'material-id' } }), { status: 201, headers: { 'content-type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)

    await teacherLessonsApi.create('classroom-subject-id', 'Bài học')
    await teacherLessonsApi.uploadMaterial('lesson-id', new File(['content'], 'notes.pdf', { type: 'application/pdf' }))

    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/teacher/classroom-subjects/classroom-subject-id/lessons')
    expect(fetchMock.mock.calls[0][1]).toEqual(expect.objectContaining({
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({ title: 'Bài học' }),
    }))

    const uploadOptions = fetchMock.mock.calls[1][1] as RequestInit
    expect(uploadOptions.method).toBe('POST')
    expect(uploadOptions.credentials).toBe('include')
    expect(uploadOptions.body).toBeInstanceOf(FormData)
    expect((uploadOptions.body as FormData).get('file')).toBeInstanceOf(File)
    expect(new Headers(uploadOptions.headers).has('Content-Type')).toBe(false)
  })
})
