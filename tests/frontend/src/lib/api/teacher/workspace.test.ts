import { afterEach, describe, expect, it, vi } from 'vitest'
import { teacherWorkspaceApi, teacherWorkspacePath } from '../../../../../../frontend/src/lib/api/teacher/workspace'
import type { TeacherClassroomSubjectContext } from '../../../../../../frontend/src/lib/api/teacher/types'

const context: TeacherClassroomSubjectContext = {
  classroomSubjectId: 'subject-link-id',
  classroomId: 'classroom-id',
  classroomName: '11A2',
  classroomStatus: 'ACTIVE',
  readOnly: false,
  academicYear: '2026-2027',
  gradeLevel: 11,
  subjectId: 'history-id',
  subjectName: 'Lịch sử',
  teacherId: 'teacher-id',
  lessonCount: 2,
  activityCount: 1,
  studentCount: 30,
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('teacher workspace API', () => {
  it('builds a deep link from classroom and classroom-subject IDs', () => {
    expect(teacherWorkspacePath('classroom-id', 'subject-link-id')).toBe(
      '/teacher/classes/classroom-id/subjects/subject-link-id'
    )
  })

  it('loads a classroom subject context with a credentialed GET request', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: context }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(teacherWorkspaceApi.getClassroomSubject('subject-link-id')).resolves.toEqual(context)

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/teacher/classroom-subjects/subject-link-id',
      expect.objectContaining({ credentials: 'include' })
    )
  })

  it('preserves a forbidden API response as ApiError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: { code: 'FORBIDDEN', message: 'Không có quyền truy cập' } }), {
        status: 403,
        headers: { 'content-type': 'application/json' },
      })
    ))

    await expect(teacherWorkspaceApi.getClassroomSubject('hidden-subject-id')).rejects.toMatchObject({
      status: 403,
      code: 'FORBIDDEN',
    })
  })

  it('loads the classroom subject roster from the backend', async () => {
    const students = [{
      id: 'student-id',
      name: 'Nguyễn Văn A',
      username: 'nguyenvana',
      contact: null,
      joinedAt: '2026-09-01T00:00:00.000Z',
      leftAt: null,
    }]
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: students }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(teacherWorkspaceApi.listClassroomSubjectStudents('subject-link-id')).resolves.toEqual(students)

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/teacher/classroom-subjects/subject-link-id/students',
      expect.objectContaining({ credentials: 'include' })
    )
  })
})
