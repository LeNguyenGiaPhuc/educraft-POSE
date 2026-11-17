import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../../backend/src/app.js';
import { sessionService } from '../../../../backend/src/modules/auth/session.service.js';
import { lessonService } from '../../../../backend/src/modules/teacher/lessons/lesson.service.js';
import { materialService } from '../../../../backend/src/modules/teacher/materials/material.service.js';

describe('Teacher Lessons & Materials API (E2E)', () => {
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

  const validClassroomSubjectId = 'b2222222-2222-4222-8222-222222222222';
  const validLessonId = 'c3333333-3333-4333-8333-333333333333';
  const validMaterialId = 'd4444444-4444-4444-8444-444444444444';

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects unauthenticated requests with 401', async () => {
    const res = await request(app).get(
      `/api/v1/teacher/classroom-subjects/${validClassroomSubjectId}/lessons`
    );
    expect(res.status).toBe(401);
  });

  describe('Authenticated as TEACHER', () => {
    beforeEach(() => {
      vi.spyOn(sessionService, 'resolveSession').mockResolvedValue(mockTeacherUser);
    });

    it('GET /classroom-subjects/:id/lessons returns lessons list', async () => {
      vi.spyOn(lessonService, 'listLessons').mockResolvedValue([
        {
          id: validLessonId,
          classroomSubjectId: validClassroomSubjectId,
          title: 'Cách mạng tháng Tám 1945',
          status: 'PUBLISHED',
          publishedAt: '2026-11-01T00:00:00.000Z',
          createdAt: '2026-11-01T00:00:00.000Z',
          updatedAt: '2026-11-01T00:00:00.000Z',
          materials: [
            {
              id: validMaterialId,
              name: 'Bai-1.pdf',
              version: 1,
              processing: 'PROCESSED',
              sourcePosition: 'Trang 1-10',
            },
          ],
        },
      ]);

      const res = await request(app)
        .get(`/api/v1/teacher/classroom-subjects/${validClassroomSubjectId}/lessons`)
        .set('Cookie', ['educraft_session=mock_cookie']);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].title).toBe('Cách mạng tháng Tám 1945');
    });

    it('POST /classroom-subjects/:id/lessons creates draft lesson with 201', async () => {
      vi.spyOn(lessonService, 'createLesson').mockResolvedValue({
        id: validLessonId,
        classroomSubjectId: validClassroomSubjectId,
        title: 'Bài học mới',
        status: 'DRAFT',
        publishedAt: null,
        createdAt: '2026-11-02T00:00:00.000Z',
        updatedAt: '2026-11-02T00:00:00.000Z',
      });

      const res = await request(app)
        .post(`/api/v1/teacher/classroom-subjects/${validClassroomSubjectId}/lessons`)
        .set('Cookie', ['educraft_session=mock_cookie'])
        .send({ title: 'Bài học mới' });

      expect(res.status).toBe(201);
      expect(res.body.data.title).toBe('Bài học mới');
      expect(res.body.data.status).toBe('DRAFT');
    });

    it('GET /lessons/:id returns lesson detail', async () => {
      vi.spyOn(lessonService, 'getLessonDetail').mockResolvedValue({
        id: validLessonId,
        classroomSubjectId: validClassroomSubjectId,
        title: 'Cách mạng tháng Tám 1945',
        status: 'DRAFT',
        publishedAt: null,
        createdAt: '2026-11-01T00:00:00.000Z',
        updatedAt: '2026-11-01T00:00:00.000Z',
        classroom: { id: 'cls-1', name: '11A1', status: 'ACTIVE' },
        subject: { id: 'sub-1', name: 'Lịch sử' },
        createdBy: { id: mockTeacherUser.id, full_name: 'Cô Lịch Sử', username: 'teacher' },
        materials: [],
      });

      const res = await request(app)
        .get(`/api/v1/teacher/lessons/${validLessonId}`)
        .set('Cookie', ['educraft_session=mock_cookie']);

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Cách mạng tháng Tám 1945');
      expect(res.body.data.classroom.name).toBe('11A1');
    });

    it('PATCH /lessons/:id updates lesson title with 200', async () => {
      vi.spyOn(lessonService, 'updateLesson').mockResolvedValue({
        id: validLessonId,
        classroomSubjectId: validClassroomSubjectId,
        title: 'Tên bài học đã đổi',
        status: 'DRAFT',
        publishedAt: null,
        createdAt: '2026-11-01T00:00:00.000Z',
        updatedAt: '2026-11-02T00:00:00.000Z',
      });

      const res = await request(app)
        .patch(`/api/v1/teacher/lessons/${validLessonId}`)
        .set('Cookie', ['educraft_session=mock_cookie'])
        .send({ title: 'Tên bài học đã đổi' });

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Tên bài học đã đổi');
    });

    it('POST /lessons/:id/publish publishes lesson with 200', async () => {
      vi.spyOn(lessonService, 'publishLesson').mockResolvedValue({
        id: validLessonId,
        classroomSubjectId: validClassroomSubjectId,
        title: 'Bài học đã xuất bản',
        status: 'PUBLISHED',
        publishedAt: '2026-11-02T00:00:00.000Z',
      });

      const res = await request(app)
        .post(`/api/v1/teacher/lessons/${validLessonId}/publish`)
        .set('Cookie', ['educraft_session=mock_cookie']);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('PUBLISHED');
    });

    it('POST /lessons/:id/materials uploads material with 201', async () => {
      const pdfBuffer = Buffer.from('%PDF-1.4 test document content');

      vi.spyOn(materialService, 'uploadMaterial').mockResolvedValue({
        id: validMaterialId,
        lessonId: validLessonId,
        fileName: 'tailieu.pdf',
        status: 'DRAFT',
        latestVersion: {
          id: 'ver-1',
          versionNo: 1,
          byteSize: pdfBuffer.length.toString(),
          mimeType: 'application/pdf',
          processingStatus: 'PENDING',
          uploadedAt: '2026-11-02T00:00:00.000Z',
        },
      });

      const res = await request(app)
        .post(`/api/v1/teacher/lessons/${validLessonId}/materials`)
        .set('Cookie', ['educraft_session=mock_cookie'])
        .attach('file', pdfBuffer, 'tailieu.pdf');

      expect(res.status).toBe(201);
      expect(res.body.data.fileName).toBe('tailieu.pdf');
      expect(res.body.data.latestVersion.versionNo).toBe(1);
    });

    it('POST /materials/:id/versions uploads new version with 201', async () => {
      const pdfBuffer = Buffer.from('%PDF-1.4 version 2 content');

      vi.spyOn(materialService, 'uploadNewVersion').mockResolvedValue({
        id: 'ver-2',
        materialId: validMaterialId,
        versionNo: 2,
        byteSize: pdfBuffer.length.toString(),
        mimeType: 'application/pdf',
        processingStatus: 'PENDING',
        uploadedAt: '2026-11-02T00:00:00.000Z',
      });

      const res = await request(app)
        .post(`/api/v1/teacher/materials/${validMaterialId}/versions`)
        .set('Cookie', ['educraft_session=mock_cookie'])
        .attach('file', pdfBuffer, 'tailieu_v2.pdf');

      expect(res.status).toBe(201);
      expect(res.body.data.versionNo).toBe(2);
    });

    it('POST /materials/:id/process retries material processing', async () => {
      vi.spyOn(materialService, 'retryProcessing').mockResolvedValue({
        materialId: validMaterialId,
        versionId: 'ver-1',
        versionNo: 1,
        processingStatus: 'PROCESSED',
      });

      const res = await request(app)
        .post(`/api/v1/teacher/materials/${validMaterialId}/process`)
        .set('Cookie', ['educraft_session=mock_cookie']);

      expect(res.status).toBe(200);
      expect(res.body.data.processingStatus).toBe('PROCESSED');
    });

    it('DELETE /materials/:id archives material with 200', async () => {
      vi.spyOn(materialService, 'archiveMaterial').mockResolvedValue({
        id: validMaterialId,
        status: 'ARCHIVED',
      });

      const res = await request(app)
        .delete(`/api/v1/teacher/materials/${validMaterialId}`)
        .set('Cookie', ['educraft_session=mock_cookie']);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('ARCHIVED');
    });

    it('GET /materials/:id/download downloads material with 200 and headers', async () => {
      const pdfBuffer = Buffer.from('%PDF-1.4 sample file');

      vi.spyOn(materialService, 'downloadMaterial').mockResolvedValue({
        buffer: pdfBuffer,
        fileName: 'tailieu.pdf',
        mimeType: 'application/pdf',
      });

      const res = await request(app)
        .get(`/api/v1/teacher/materials/${validMaterialId}/download`)
        .set('Cookie', ['educraft_session=mock_cookie']);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/pdf');
      expect(res.headers['content-disposition']).toContain('tailieu.pdf');
      expect(res.body.equals(pdfBuffer)).toBe(true);
    });
  });
});
