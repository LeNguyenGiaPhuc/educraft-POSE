import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { sessionService } from '../../src/modules/auth/session.service.js';
import { workspaceService } from '../../src/modules/teacher/workspace/workspace.service.js';

describe('Teacher Workspace API (E2E)', () => {
  const app = createApp();

  const mockTeacherUser = {
    id: 'teacher-uuid',
    username: 'teacher',
    fullName: 'Cô Lịch Sử',
    role: 'TEACHER' as const,
    status: 'ACTIVE' as const,
    contact: '0901234567',
    mustChangePassword: false,
    sessionId: 'session-teacher',
  };

  const mockStudentUser = {
    id: 'student-uuid',
    username: 'student',
    fullName: 'Học sinh',
    role: 'STUDENT' as const,
    status: 'ACTIVE' as const,
    contact: null,
    mustChangePassword: false,
    sessionId: 'session-student',
  };

  const validClassroomId = 'a1111111-1111-4111-8111-111111111111';
  const validClassroomSubjectId = 'b2222222-2222-4222-8222-222222222222';

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects unauthenticated requests with 401', async () => {
    const res = await request(app).get('/api/v1/teacher/classrooms');
    expect(res.status).toBe(401);
  });

  it('rejects student requests with 403 Forbidden', async () => {
    vi.spyOn(sessionService, 'resolveSession').mockResolvedValue(mockStudentUser);

    const res = await request(app)
      .get('/api/v1/teacher/classrooms')
      .set('Cookie', ['educraft_session=mock_cookie']);

    expect(res.status).toBe(403);
  });

  describe('Authenticated as TEACHER', () => {
    beforeEach(() => {
      vi.spyOn(sessionService, 'resolveSession').mockResolvedValue(mockTeacherUser);
    });

    it('GET /api/v1/teacher/classrooms returns assigned classrooms', async () => {
      vi.spyOn(workspaceService, 'listAssignedClassrooms').mockResolvedValue([
        {
          id: validClassroomId,
          name: '11A1',
          academicYear: '2026-2027',
          gradeLevel: 11,
          status: 'ACTIVE',
          studentCount: 30,
          subjects: [
            {
              id: validClassroomSubjectId,
              classroomId: validClassroomId,
              name: 'Lịch sử',
              subjectId: 'sub-history',
              teacherId: mockTeacherUser.id,
            },
          ],
        },
      ]);

      const res = await request(app)
        .get('/api/v1/teacher/classrooms')
        .set('Cookie', ['educraft_session=mock_cookie']);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('11A1');
      expect(res.body.data[0].subjects).toHaveLength(1);
    });

    it('GET /api/v1/teacher/classrooms/:id returns classroom detail', async () => {
      vi.spyOn(workspaceService, 'getAssignedClassroomDetail').mockResolvedValue({
        id: validClassroomId,
        name: '11A1',
        academicYear: '2026-2027',
        gradeLevel: 11,
        status: 'ACTIVE',
        students: [{ id: 'stu-1', name: 'Nguyễn Văn A', username: 'nguyenvana', contact: '0901234567' }],
        subjects: [
          {
            id: validClassroomSubjectId,
            classroomId: validClassroomId,
            name: 'Lịch sử',
            subjectId: 'sub-history',
            teacherId: mockTeacherUser.id,
          },
        ],
      });

      const res = await request(app)
        .get(`/api/v1/teacher/classrooms/${validClassroomId}`)
        .set('Cookie', ['educraft_session=mock_cookie']);

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('11A1');
      expect(res.body.data.students).toHaveLength(1);
    });

    it('GET /api/v1/teacher/classroom-subjects/:id returns workspace context', async () => {
      vi.spyOn(workspaceService, 'getClassroomSubjectContext').mockResolvedValue({
        classroomSubjectId: validClassroomSubjectId,
        classroomId: validClassroomId,
        classroomName: '11A1',
        classroomStatus: 'ACTIVE',
        academicYear: '2026-2027',
        gradeLevel: 11,
        subjectId: 'sub-history',
        subjectName: 'Lịch sử',
        teacherId: mockTeacherUser.id,
        lessonCount: 4,
        activityCount: 2,
        studentCount: 30,
      });

      const res = await request(app)
        .get(`/api/v1/teacher/classroom-subjects/${validClassroomSubjectId}`)
        .set('Cookie', ['educraft_session=mock_cookie']);

      expect(res.status).toBe(200);
      expect(res.body.data.classroomName).toBe('11A1');
      expect(res.body.data.lessonCount).toBe(4);
    });

    it('GET /api/v1/teacher/classroom-subjects/:id/students returns students list', async () => {
      vi.spyOn(workspaceService, 'getClassroomSubjectStudents').mockResolvedValue([
        {
          id: 'stu-1',
          name: 'Nguyễn Văn A',
          username: 'nguyenvana',
          contact: '0901234567',
          joinedAt: '2026-09-01T00:00:00.000Z',
        },
      ]);

      const res = await request(app)
        .get(`/api/v1/teacher/classroom-subjects/${validClassroomSubjectId}/students`)
        .set('Cookie', ['educraft_session=mock_cookie']);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('Nguyễn Văn A');
    });
  });
});
