import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../../backend/src/app.js';
import { sessionService } from '../../../../backend/src/modules/auth/session.service.js';
import { notebookCheckService } from '../../../../backend/src/modules/teacher/notebook-checks/notebook-check.service.js';

describe('Teacher Notebook Checks API (E2E)', () => {
  const app = createApp();

  const mockTeacherUser = {
    id: 't1111111-1111-4111-8111-111111111111',
    username: 'teacher',
    fullName: 'Thầy Hóa',
    role: 'TEACHER' as const,
    status: 'ACTIVE' as const,
    contact: null,
    mustChangePassword: false,
    sessionId: 'session-teacher',
  };

  const mockStudentUser = {
    id: 's1111111-1111-4111-8111-111111111111',
    username: 'student',
    fullName: 'Học sinh',
    role: 'STUDENT' as const,
    status: 'ACTIVE' as const,
    contact: null,
    mustChangePassword: false,
    sessionId: 'session-student',
  };

  const sampleClassroomSubjectId = 'a1111111-1111-4111-8111-111111111111';
  const sampleActivityId = 'b2222222-2222-4222-8222-222222222222';
  const samplePeriodId = '33333333-3333-4333-8333-333333333333';
  const sampleSubmissionId = '44444444-4444-4444-8444-444444444444';
  const sampleFileId = '55555555-5555-4555-8555-555555555555';

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects unauthenticated requests with 401', async () => {
    const res = await request(app).get(
      `/api/v1/teacher/classroom-subjects/${sampleClassroomSubjectId}/notebook-checks`
    );
    expect(res.status).toBe(401);
  });

  it('rejects student requests with 403 Forbidden', async () => {
    vi.spyOn(sessionService, 'resolveSession').mockResolvedValue(mockStudentUser);

    const res = await request(app)
      .get(`/api/v1/teacher/classroom-subjects/${sampleClassroomSubjectId}/notebook-checks`)
      .set('Cookie', ['educraft_session=mock_cookie']);

    expect(res.status).toBe(403);
  });

  describe('Authenticated as TEACHER', () => {
    beforeEach(() => {
      vi.spyOn(sessionService, 'resolveSession').mockResolvedValue(mockTeacherUser);
    });

    it('GET /classroom-subjects/:id/notebook-checks returns list with 200', async () => {
      vi.spyOn(notebookCheckService, 'listNotebookChecks').mockResolvedValue([
        {
          id: sampleActivityId,
          title: 'Kiểm tra vở chương 1',
          kind: 'NOTEBOOK_CHECK',
          status: 'DRAFT',
          notebookCheck: {
            criteria_locked_at: null,
            _count: { referenceFiles: 1, criteria: 2, periods: 0 },
          },
        } as any,
      ]);

      const res = await request(app)
        .get(`/api/v1/teacher/classroom-subjects/${sampleClassroomSubjectId}/notebook-checks`)
        .set('Cookie', ['educraft_session=mock_cookie']);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].title).toBe('Kiểm tra vở chương 1');
    });

    it('POST /classroom-subjects/:id/notebook-checks creates activity with 201', async () => {
      vi.spyOn(notebookCheckService, 'createNotebookCheck').mockResolvedValue({
        id: sampleActivityId,
        title: 'Kiểm tra vở mới',
        kind: 'NOTEBOOK_CHECK',
        status: 'DRAFT',
      } as any);

      const res = await request(app)
        .post(`/api/v1/teacher/classroom-subjects/${sampleClassroomSubjectId}/notebook-checks`)
        .set('Cookie', ['educraft_session=mock_cookie'])
        .send({
          title: 'Kiểm tra vở mới',
          description: 'Bài 1 đến bài 3',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBe(sampleActivityId);
    });

    it('GET /notebook-checks/:id returns detail with 200', async () => {
      vi.spyOn(notebookCheckService, 'getNotebookCheckDetail').mockResolvedValue({
        id: sampleActivityId,
        title: 'Chi tiết kiểm tra vở',
        notebookCheck: {
          referenceFiles: [],
          criteria: [],
          periods: [],
        },
      } as any);

      const res = await request(app)
        .get(`/api/v1/teacher/notebook-checks/${sampleActivityId}`)
        .set('Cookie', ['educraft_session=mock_cookie']);

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Chi tiết kiểm tra vở');
    });

    it('PATCH /notebook-checks/:id updates notebook check with 200', async () => {
      vi.spyOn(notebookCheckService, 'updateNotebookCheck').mockResolvedValue({
        id: sampleActivityId,
        title: 'Tiêu đề đã đổi',
      } as any);

      const res = await request(app)
        .patch(`/api/v1/teacher/notebook-checks/${sampleActivityId}`)
        .set('Cookie', ['educraft_session=mock_cookie'])
        .send({
          title: 'Tiêu đề đã đổi',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Tiêu đề đã đổi');
    });

    it('DELETE /notebook-checks/:id deletes activity with 200', async () => {
      vi.spyOn(notebookCheckService, 'deleteNotebookCheck').mockResolvedValue({
        success: true,
      });

      const res = await request(app)
        .delete(`/api/v1/teacher/notebook-checks/${sampleActivityId}`)
        .set('Cookie', ['educraft_session=mock_cookie']);

      expect(res.status).toBe(200);
      expect(res.body.data.success).toBe(true);
    });

    it('PUT /notebook-checks/:id/criteria updates criteria with 200', async () => {
      vi.spyOn(notebookCheckService, 'putCriteria').mockResolvedValue({
        id: sampleActivityId,
        notebookCheck: {
          criteria: [{ id: 'crit-1', content: 'Ghi chép đầy đủ', order_index: 1 }],
        },
      } as any);

      const res = await request(app)
        .put(`/api/v1/teacher/notebook-checks/${sampleActivityId}/criteria`)
        .set('Cookie', ['educraft_session=mock_cookie'])
        .send({
          criteria: [{ content: 'Ghi chép đầy đủ' }],
        });

      expect(res.status).toBe(200);
      expect(res.body.data.notebookCheck.criteria).toHaveLength(1);
    });

    it('POST /notebook-checks/:id/publish publishes activity with 200', async () => {
      vi.spyOn(notebookCheckService, 'publishNotebookCheck').mockResolvedValue({
        id: sampleActivityId,
        status: 'PUBLISHED',
      } as any);

      const res = await request(app)
        .post(`/api/v1/teacher/notebook-checks/${sampleActivityId}/publish`)
        .set('Cookie', ['educraft_session=mock_cookie']);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('PUBLISHED');
    });

    it('POST /notebook-checks/:id/periods creates period with 201', async () => {
      vi.spyOn(notebookCheckService, 'createPeriod').mockResolvedValue({
        id: samplePeriodId,
        period_no: 1,
        due_at: '2026-12-01T00:00:00.000Z',
      } as any);

      const res = await request(app)
        .post(`/api/v1/teacher/notebook-checks/${sampleActivityId}/periods`)
        .set('Cookie', ['educraft_session=mock_cookie'])
        .send({
          dueAt: '2026-12-01T00:00:00.000Z',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBe(samplePeriodId);
    });

    it('POST /notebook-periods/:id/close closes period with 200', async () => {
      vi.spyOn(notebookCheckService, 'closePeriod').mockResolvedValue({
        id: samplePeriodId,
        closed_at: '2026-11-14T08:00:00.000Z',
      } as any);

      const res = await request(app)
        .post(`/api/v1/teacher/notebook-periods/${samplePeriodId}/close`)
        .set('Cookie', ['educraft_session=mock_cookie']);

      expect(res.status).toBe(200);
      expect(res.body.data.closed_at).not.toBeNull();
    });

    it('GET /notebook-checks/:id/periods returns periods list with 200', async () => {
      vi.spyOn(notebookCheckService, 'listPeriods').mockResolvedValue([
        {
          id: samplePeriodId,
          period_no: 1,
        } as any,
      ]);

      const res = await request(app)
        .get(`/api/v1/teacher/notebook-checks/${sampleActivityId}/periods`)
        .set('Cookie', ['educraft_session=mock_cookie']);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });

    it('GET /notebook-periods/:id/submissions returns submissions list with 200', async () => {
      vi.spyOn(notebookCheckService, 'listSubmissionsByPeriod').mockResolvedValue([
        {
          id: sampleSubmissionId,
          student: { full_name: 'Nguyễn Văn A' },
          status: 'CURRENT',
        } as any,
      ]);

      const res = await request(app)
        .get(`/api/v1/teacher/notebook-periods/${samplePeriodId}/submissions`)
        .set('Cookie', ['educraft_session=mock_cookie']);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });

    it('GET /notebook-submissions/:id/review returns review detail with 200', async () => {
      vi.spyOn(notebookCheckService, 'getSubmissionReview').mockResolvedValue({
        id: sampleSubmissionId,
        status: 'LOCKED',
        files: [],
      } as any);

      const res = await request(app)
        .get(`/api/v1/teacher/notebook-submissions/${sampleSubmissionId}/review`)
        .set('Cookie', ['educraft_session=mock_cookie']);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(sampleSubmissionId);
    });

    it('POST /notebook-submissions/:id/analysis triggers AI analysis with 200', async () => {
      vi.spyOn(notebookCheckService, 'analyzeSubmission').mockResolvedValue({
        status: 'READY',
        ocrText: 'Bài 1: Ghi chép',
      });

      const res = await request(app)
        .post(`/api/v1/teacher/notebook-submissions/${sampleSubmissionId}/analysis`)
        .set('Cookie', ['educraft_session=mock_cookie']);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('READY');
    });

    it('POST /notebook-submissions/:id/finalize finalizes submission with 200', async () => {
      vi.spyOn(notebookCheckService, 'finalizeSubmission').mockResolvedValue({
        id: 'ass-1',
        submission_id: sampleSubmissionId,
        teacher_comment: 'Tốt',
        results: [],
      } as any);

      const res = await request(app)
        .post(`/api/v1/teacher/notebook-submissions/${sampleSubmissionId}/finalize`)
        .set('Cookie', ['educraft_session=mock_cookie'])
        .send({
          results: [
            {
              criterionId: 'c1111111-1111-4111-8111-111111111111',
              status: 'RECORDED',
              note: 'Đủ bài',
            },
          ],
          teacherComment: 'Tốt',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe('ass-1');
    });

    it('DELETE /notebook-checks/:activityId/reference-files/:fileId deletes file with 200', async () => {
      vi.spyOn(notebookCheckService, 'deleteReferenceFile').mockResolvedValue({
        success: true,
      });

      const res = await request(app)
        .delete(`/api/v1/teacher/notebook-checks/${sampleActivityId}/reference-files/${sampleFileId}`)
        .set('Cookie', ['educraft_session=mock_cookie']);

      expect(res.status).toBe(200);
      expect(res.body.data.success).toBe(true);
    });

    it('GET /notebook-checks/:activityId/reference-files/:fileId/download streams a private file', async () => {
      vi.spyOn(notebookCheckService, 'downloadReferenceFile').mockResolvedValue({
        buffer: Buffer.from('reference-image'),
        mimeType: 'image/jpeg',
      });

      const res = await request(app)
        .get(
          `/api/v1/teacher/notebook-checks/${sampleActivityId}/reference-files/${sampleFileId}/download`
        )
        .set('Cookie', ['educraft_session=mock_cookie']);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('image/jpeg');
      expect(res.headers['cache-control']).toBe('private, no-store');
      expect(res.body.toString()).toBe('reference-image');
    });

    it('GET /notebook-submissions/:submissionId/files/:fileId/download streams a private file', async () => {
      vi.spyOn(notebookCheckService, 'downloadSubmissionFile').mockResolvedValue({
        buffer: Buffer.from('submission-image'),
        mimeType: 'image/png',
      });

      const res = await request(app)
        .get(
          `/api/v1/teacher/notebook-submissions/${sampleSubmissionId}/files/${sampleFileId}/download`
        )
        .set('Cookie', ['educraft_session=mock_cookie']);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('image/png');
      expect(res.body.toString()).toBe('submission-image');
    });
  });
});
