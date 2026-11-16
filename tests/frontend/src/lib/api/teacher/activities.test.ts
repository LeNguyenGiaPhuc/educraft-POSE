import { afterEach, describe, expect, it, vi } from 'vitest'
import { teacherActivitiesApi } from '../../../../../../frontend/src/lib/api/teacher/activities'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function stubResponse(data: unknown) {
  vi.stubGlobal('fetch', vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ data }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  }))))
}

describe('teacher activities API', () => {
  it('loads and normalizes the activity list', async () => {
    stubResponse([{
      id: 'activity-id',
      classroom_subject_id: 'subject-id',
      title: 'Ôn tập',
      description: 'Mô tả',
      kind: 'EXERCISE',
      status: 'DRAFT',
      published_at: null,
      closes_at: null,
      created_at: '2026-11-16T00:00:00.000Z',
      exercise: {
        exercise_type: 'QUIZ',
        difficulty: 'BASIC',
        question_count: 1,
        _count: { questions: 1, submissions: 0 },
      },
    }])

    await expect(teacherActivitiesApi.list('subject/id')).resolves.toEqual([expect.objectContaining({
      id: 'activity-id',
      title: 'Ôn tập',
      kind: 'EXERCISE',
      exercise: expect.objectContaining({ exercise_type: 'QUIZ' }),
      submissionCount: 0,
      questionCount: 1,
    })])

    expect(fetch).toHaveBeenCalledWith(
      '/api/v1/teacher/classroom-subjects/subject%2Fid/activities',
      expect.objectContaining({ credentials: 'include' })
    )
  })

  it('creates an exercise activity with lesson links', async () => {
    stubResponse({ id: 'activity-id', title: 'Quiz mới' })

    await teacherActivitiesApi.create('subject/id', {
      title: 'Quiz mới',
      description: 'Mô tả',
      exerciseType: 'QUIZ',
      difficulty: 'BASIC',
      lessonIds: ['lesson/id'],
      closesAt: '2026-11-20T10:00:00.000Z',
    })

    expect(fetch).toHaveBeenCalledWith(
      '/api/v1/teacher/classroom-subjects/subject%2Fid/activities',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          title: 'Quiz mới',
          description: 'Mô tả',
          exerciseType: 'QUIZ',
          difficulty: 'BASIC',
          lessonIds: ['lesson/id'],
          closesAt: '2026-11-20T10:00:00.000Z',
        }),
      })
    )
  })

  it('updates an activity and requests an AI draft', async () => {
    stubResponse({ id: 'activity-id', title: 'Quiz đã sửa' })

    await teacherActivitiesApi.update('activity/id', {
      title: 'Quiz đã sửa',
      difficulty: 'ADVANCED',
      lessonIds: ['lesson/id'],
      closesAt: null,
    })
    await teacherActivitiesApi.aiDraft('activity/id', {
      lessonIds: ['lesson/id'],
      questionCount: 3,
      difficulty: 'ADVANCED',
    })

    expect(fetch).toHaveBeenNthCalledWith(
      1,
      '/api/v1/teacher/activities/activity%2Fid',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ title: 'Quiz đã sửa', difficulty: 'ADVANCED', lessonIds: ['lesson/id'], closesAt: null }),
      })
    )
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      '/api/v1/teacher/activities/activity%2Fid/ai-draft',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ lessonIds: ['lesson/id'], questionCount: 3, difficulty: 'ADVANCED' }),
      })
    )
  })

  it('updates questions and publishes an activity', async () => {
    stubResponse({ id: 'activity-id', title: 'Quiz đã cập nhật' })

    await teacherActivitiesApi.putQuestions('activity/id', [{
      prompt: 'Câu hỏi?',
      options: ['A', 'B'],
      answerKey: 'A',
      markingCriteria: undefined,
      explanation: 'Giải thích',
      maxPoints: 1,
      lessonId: 'lesson/id',
      citations: [],
    }])
    await teacherActivitiesApi.publish('activity/id')

    expect(fetch).toHaveBeenNthCalledWith(
      1,
      '/api/v1/teacher/activities/activity%2Fid/questions',
      expect.objectContaining({ method: 'PUT' })
    )
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      '/api/v1/teacher/activities/activity%2Fid/publish',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('calls close, reopen, and delete endpoints', async () => {
    stubResponse({ success: true })

    await teacherActivitiesApi.close('activity/id')
    await teacherActivitiesApi.reopen('activity/id', { closesAt: null })
    await teacherActivitiesApi.remove('activity/id')

    expect(fetch).toHaveBeenNthCalledWith(1, '/api/v1/teacher/activities/activity%2Fid/close', expect.objectContaining({ method: 'POST' }))
    expect(fetch).toHaveBeenNthCalledWith(2, '/api/v1/teacher/activities/activity%2Fid/reopen', expect.objectContaining({ method: 'POST' }))
    expect(fetch).toHaveBeenNthCalledWith(3, '/api/v1/teacher/activities/activity%2Fid', expect.objectContaining({ method: 'DELETE' }))
  })
})
