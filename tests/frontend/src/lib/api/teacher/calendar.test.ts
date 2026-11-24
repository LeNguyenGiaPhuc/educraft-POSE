import { afterEach, describe, expect, it, vi } from 'vitest'
import { teacherCalendarApi } from '../../../../../../frontend/src/lib/api/teacher/calendar'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('teacherCalendarApi', () => {
  it('encodes range and classroom filters with URLSearchParams', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    await teacherCalendarApi.list({
      from: '2026-11-01T00:00:00.000Z',
      to: '2026-11-30T23:59:59.999Z',
      classroomId: 'classroom-id',
    })

    const url = String(fetchMock.mock.calls[0][0])
    expect(url).toContain('/api/v1/teacher/calendar-events?')
    expect(url).toContain('from=2026-11-01T00%3A00%3A00.000Z')
    expect(url).toContain('to=2026-11-30T23%3A59%3A59.999Z')
    expect(url).toContain('classroomId=classroom-id')
  })

  it('does not send both lesson and activity links', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: {} }), {
        status: 201,
        headers: { 'content-type': 'application/json' },
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    await teacherCalendarApi.create('classroom-subject-id', {
      title: 'Ôn tập',
      details: 'Đọc lại bài',
      eventType: 'LESSON',
      startsAt: '2026-11-20T08:00:00.000Z',
      lessonId: 'lesson-id',
      activityId: null,
    })

    expect(fetchMock.mock.calls[0][1]).toEqual(expect.objectContaining({
      body: JSON.stringify({
        title: 'Ôn tập',
        details: 'Đọc lại bài',
        eventType: 'LESSON',
        startsAt: '2026-11-20T08:00:00.000Z',
        lessonId: 'lesson-id',
        activityId: null,
      }),
    }))
  })

  it('sends the event version when updating so stale edits are rejected', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: {} }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    await teacherCalendarApi.update('event-id', {
      expectedUpdatedAt: '2026-11-18T10:00:00.000Z',
      title: 'Tiêu đề mới',
    })

    expect(fetchMock.mock.calls[0][1]).toEqual(expect.objectContaining({
      body: JSON.stringify({
        expectedUpdatedAt: '2026-11-18T10:00:00.000Z',
        title: 'Tiêu đề mới',
      }),
    }))
  })
})
