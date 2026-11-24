import { afterEach, describe, expect, it, vi } from 'vitest'
import { teacherNotebookChecksApi } from '../../../../../../frontend/src/lib/api/teacher/notebookChecks'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function stubJson(data: unknown) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ data }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })))
}

describe('teacher notebook checks API', () => {
  it('loads and normalizes notebook check details', async () => {
    stubJson({
      id: 'activity-id',
      classroom_subject_id: 'subject-id',
      title: 'Kiểm tra vở',
      description: 'Bài 1',
      status: 'DRAFT',
      created_at: '2026-11-17T00:00:00.000Z',
      notebookCheck: {
        criteria_locked_at: null,
        referenceFiles: [{ id: 'file-id', mime_type: 'image/jpeg', byte_size: '12', sort_order: 1 }],
        criteria: [{ id: 'criterion-id', content: 'Ghi đủ ý', order_index: 1 }],
        periods: [{ id: 'period-id', period_no: 1, opened_at: '2026-11-17T00:00:00.000Z', due_at: '2026-11-20T00:00:00.000Z', closed_at: null, _count: { submissions: 2 } }],
      },
    })

    await expect(teacherNotebookChecksApi.getDetail('activity/id')).resolves.toEqual(expect.objectContaining({
      id: 'activity-id',
      classroomSubjectId: 'subject-id',
      referenceFiles: [expect.objectContaining({ mimeType: 'image/jpeg', byteSize: 12 })],
      criteria: [expect.objectContaining({ content: 'Ghi đủ ý', orderIndex: 1 })],
      periods: [expect.objectContaining({ periodNo: 1, submissionCount: 2 })],
    }))

    expect(fetch).toHaveBeenCalledWith(
      '/api/v1/teacher/notebook-checks/activity%2Fid',
      expect.objectContaining({ credentials: 'include' })
    )
  })

  it('creates, updates criteria, publishes and creates a period', async () => {
    stubJson({ id: 'activity-id', status: 'DRAFT', notebookCheck: { criteria: [], referenceFiles: [], periods: [] } })

    await teacherNotebookChecksApi.create('subject/id', {
      title: 'Kiểm tra vở',
      description: 'Bài 1',
      closesAt: null,
    })
    await teacherNotebookChecksApi.update('activity/id', { title: 'Tên mới' })
    await teacherNotebookChecksApi.putCriteria('activity/id', [{ content: 'Ghi đủ ý' }])
    await teacherNotebookChecksApi.publish('activity/id')
    await teacherNotebookChecksApi.createPeriod('activity/id', '2026-11-20T00:00:00.000Z')

    expect(fetch).toHaveBeenNthCalledWith(1, '/api/v1/teacher/classroom-subjects/subject%2Fid/notebook-checks', expect.objectContaining({ method: 'POST' }))
    expect(fetch).toHaveBeenNthCalledWith(2, '/api/v1/teacher/notebook-checks/activity%2Fid', expect.objectContaining({ method: 'PATCH' }))
    expect(fetch).toHaveBeenNthCalledWith(3, '/api/v1/teacher/notebook-checks/activity%2Fid/criteria', expect.objectContaining({ method: 'PUT' }))
    expect(fetch).toHaveBeenNthCalledWith(4, '/api/v1/teacher/notebook-checks/activity%2Fid/publish', expect.objectContaining({ method: 'POST' }))
    expect(fetch).toHaveBeenNthCalledWith(5, '/api/v1/teacher/notebook-checks/activity%2Fid/periods', expect.objectContaining({ method: 'POST' }))
  })

  it('creates and publishes a notebook check as one multipart request', async () => {
    stubJson({
      id: 'activity-id',
      classroom_subject_id: 'subject-id',
      title: 'Kiểm tra vở',
      description: 'Bài 1',
      status: 'PUBLISHED',
      created_at: '2026-11-17T00:00:00.000Z',
      notebookCheck: {
        criteria: [],
        referenceFiles: [],
        periods: [],
      },
    })

    const file = new File(['image'], 'reference.png', { type: 'image/png' })
    await teacherNotebookChecksApi.createAndPublish('subject/id', {
      title: 'Kiểm tra vở',
      description: 'Bài 1',
      dueAt: '2026-11-20T00:00:00.000Z',
      criteria: [{ content: 'Ghi đủ ý' }],
      files: [file],
    })

    const request = vi.mocked(fetch).mock.calls[0]
    expect(request[0]).toBe('/api/v1/teacher/classroom-subjects/subject%2Fid/notebook-checks/publish')
    expect(request[1]).toEqual(expect.objectContaining({ method: 'POST', body: expect.any(FormData) }))
    const body = (request[1] as RequestInit).body as FormData
    expect(body.get('title')).toBe('Kiểm tra vở')
    expect(body.get('dueAt')).toBe('2026-11-20T00:00:00.000Z')
    expect(body.get('criteria')).toBe(JSON.stringify([{ content: 'Ghi đủ ý' }]))
    expect(body.get('files')).toBe(file)
  })

  it('requests stateless criteria suggestions as multipart form data', async () => {
    stubJson({ status: 'READY', criteria: [{ content: 'Ghi đủ các mốc chính' }] })
    const file = new File(['image'], 'reference.png', { type: 'image/png' })

    await expect(teacherNotebookChecksApi.suggestCriteria('subject/id', [file])).resolves.toEqual({
      status: 'READY',
      criteria: [{ content: 'Ghi đủ các mốc chính' }],
    })

    const request = vi.mocked(fetch).mock.calls[0]
    expect(request[0]).toBe('/api/v1/teacher/classroom-subjects/subject%2Fid/notebook-checks/criteria-suggestions')
    expect(request[1]).toEqual(expect.objectContaining({ method: 'POST', body: expect.any(FormData) }))
    expect(((request[1] as RequestInit).body as FormData).get('files')).toBe(file)
  })

  it('uploads a reference file as multipart form data and downloads it privately', async () => {
    stubJson({ id: 'file-id', mime_type: 'image/png', byte_size: 10, sort_order: 1 })
    const file = new File(['image'], 'reference.png', { type: 'image/png' })

    await teacherNotebookChecksApi.uploadReferenceFile('activity/id', file)
    expect(fetch).toHaveBeenNthCalledWith(1, '/api/v1/teacher/notebook-checks/activity%2Fid/reference-files', expect.objectContaining({
      method: 'POST',
      body: expect.any(FormData),
    }))

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('image', {
      status: 200,
      headers: { 'content-type': 'image/png' },
    })))
    const result = await teacherNotebookChecksApi.downloadReferenceFile('activity/id', 'file/id')
    expect(result.blob).toBeInstanceOf(Blob)
    expect(fetch).toHaveBeenCalledWith('/api/v1/teacher/notebook-checks/activity%2Fid/reference-files/file%2Fid/download', expect.objectContaining({ credentials: 'include' }))
  })

  it('loads review, analysis and finalizes every criterion', async () => {
    stubJson({
      id: 'submission-id',
      status: 'LOCKED',
      processing_status: 'PROCESSED',
      student: { full_name: 'Nguyễn Văn A', username: 'nguyenvana' },
      period: {
        id: 'period-id',
        period_no: 1,
        activity: { activity: {}, criteria: [{ id: 'criterion-id', content: 'Ghi đủ ý', order_index: 1 }] },
      },
      files: [],
      aiDraft: { ocr_text: 'Nội dung', suggestions: [], generated_at: '2026-11-17T00:00:00.000Z' },
    })

    const review = await teacherNotebookChecksApi.getReview('submission/id')
    expect(review.studentName).toBe('Nguyễn Văn A')
    expect(review.criteria).toHaveLength(1)

    await teacherNotebookChecksApi.getAnalysis('submission/id')
    await teacherNotebookChecksApi.finalize('submission/id', {
      results: [{ criterionId: 'criterion-id', status: 'RECORDED', note: 'Đủ ý' }],
      teacherComment: 'Tốt',
    })

    expect(fetch).toHaveBeenNthCalledWith(2, '/api/v1/teacher/notebook-submissions/submission%2Fid/analysis', expect.objectContaining({ credentials: 'include' }))
    expect(fetch).toHaveBeenNthCalledWith(3, '/api/v1/teacher/notebook-submissions/submission%2Fid/finalize', expect.objectContaining({ method: 'POST' }))
  })
})
