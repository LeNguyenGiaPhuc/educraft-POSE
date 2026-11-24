import { afterEach, describe, expect, it, vi } from 'vitest'
import { teacherResultsApi } from '../../../../../../frontend/src/lib/api/teacher/results'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('teacher results API', () => {
  it('loads prompt-topic summaries for a classroom subject', async () => {
    const payload = {
      classroomSubject: {
        id: 'classroom-subject-id',
        classroom: { id: 'classroom-id', name: '11A2', status: 'ACTIVE', academicYear: '2026-2027', gradeLevel: 11 },
        subject: { id: 'subject-id', name: 'Lịch sử' },
      },
      items: [],
    }
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: payload }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(teacherResultsApi.getPromptTopics('classroom-subject-id')).resolves.toEqual(payload)

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/teacher/classroom-subjects/classroom-subject-id/prompt-topics',
      expect.objectContaining({ credentials: 'include' })
    )
  })

  it('encodes the optional student and period filters', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { classroomSubject: {}, items: [] } }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })))

    await teacherResultsApi.getPromptTopics('subject/id', {
      studentId: 'student/id',
      periodStart: '2026-11-01',
      periodEnd: '2026-11-30',
    })

    expect(fetch).toHaveBeenCalledWith(
      '/api/v1/teacher/classroom-subjects/subject%2Fid/prompt-topics?studentId=student%2Fid&periodStart=2026-11-01&periodEnd=2026-11-30',
      expect.objectContaining({ credentials: 'include' })
    )
  })

  it('loads statistics with an optional activity filter', async () => {
    const result = {
      classroomSubject: {},
      studentCount: 30,
      exercise: { activityCount: 2 },
      notebook: { activityCount: 1 },
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: result }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })))

    await expect(teacherResultsApi.getStatistics('subject/id', 'activity/id')).resolves.toEqual(result)

    expect(fetch).toHaveBeenCalledWith(
      '/api/v1/teacher/classroom-subjects/subject%2Fid/statistics?activityId=activity%2Fid',
      expect.objectContaining({ credentials: 'include' })
    )
  })

  it('loads statistics with an optional notebook period filter', async () => {
    const result = { classroomSubject: {}, studentCount: 2, exercise: {}, notebook: {} }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: result }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })))

    await expect(teacherResultsApi.getStatistics('subject/id', 'activity/id', 'period/id')).resolves.toEqual(result)

    expect(fetch).toHaveBeenCalledWith(
      '/api/v1/teacher/classroom-subjects/subject%2Fid/statistics?activityId=activity%2Fid&periodId=period%2Fid',
      expect.objectContaining({ credentials: 'include' })
    )
  })

  it('loads one student progress in the selected classroom subject', async () => {
    const result = { classroomSubject: {}, student: { id: 'student-id' }, lessons: [] }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: result }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })))

    await expect(teacherResultsApi.getStudentProgress('subject/id', 'student/id')).resolves.toEqual(result)

    expect(fetch).toHaveBeenCalledWith(
      '/api/v1/teacher/classroom-subjects/subject%2Fid/students/student%2Fid/progress',
      expect.objectContaining({ credentials: 'include' })
    )
  })

  it('loads paginated submissions with filters', async () => {
    const result = {
      items: [],
      meta: {
        page: 2,
        pageSize: 10,
        totalItems: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: true,
      },
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: result.items, meta: result.meta }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })))

    await expect(teacherResultsApi.listSubmissions('subject/id', {
      activityId: 'activity/id',
      studentId: 'student/id',
      kind: 'EXERCISE',
      status: 'GRADED',
      page: 2,
      pageSize: 10,
    })).resolves.toEqual(result)

    expect(fetch).toHaveBeenCalledWith(
      '/api/v1/teacher/classroom-subjects/subject%2Fid/submissions?activityId=activity%2Fid&studentId=student%2Fid&kind=EXERCISE&status=GRADED&page=2&pageSize=10',
      expect.objectContaining({ credentials: 'include' })
    )
  })

  it('passes the selected notebook period in roster mode', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [], meta: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0, hasNextPage: false, hasPrevPage: false } }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })))

    await teacherResultsApi.listSubmissions('subject/id', {
      activityId: 'activity/id',
      periodId: 'period/id',
      kind: 'NOTEBOOK_CHECK',
    })

    expect(fetch).toHaveBeenCalledWith(
      '/api/v1/teacher/classroom-subjects/subject%2Fid/submissions?activityId=activity%2Fid&periodId=period%2Fid&kind=NOTEBOOK_CHECK',
      expect.objectContaining({ credentials: 'include' })
    )
  })

  it('loads an exercise result by submission id', async () => {
    const result = { id: 'submission-id', kind: 'EXERCISE', answers: [] }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: result }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })))

    await expect(teacherResultsApi.getExerciseResult('submission/id')).resolves.toEqual(result)

    expect(fetch).toHaveBeenCalledWith(
      '/api/v1/teacher/exercise-submissions/submission%2Fid/result',
      expect.objectContaining({ credentials: 'include' })
    )
  })

  it('loads a notebook result by submission id', async () => {
    const result = { id: 'submission-id', kind: 'NOTEBOOK_CHECK', criteria: [], assessment: null }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: result }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })))

    await expect(teacherResultsApi.getNotebookResult('submission/id')).resolves.toEqual(result)

    expect(fetch).toHaveBeenCalledWith(
      '/api/v1/teacher/notebook-submissions/submission%2Fid/result',
      expect.objectContaining({ credentials: 'include' })
    )
  })
})
