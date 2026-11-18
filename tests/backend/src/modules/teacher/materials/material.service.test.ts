import { describe, it, expect, vi, beforeEach } from 'vitest';
import { materialService } from '../../../../../../backend/src/modules/teacher/materials/material.service.js';
import { materialRepository } from '../../../../../../backend/src/modules/teacher/materials/material.repository.js';
import { defaultStorageProvider } from '../../../../../../backend/src/modules/storage/storage-factory.js';
import { defaultAiProcessingProvider } from '../../../../../../backend/src/modules/teacher/materials/ai-processing.provider.js';
import * as teacherSubjectPolicy from '../../../../../../backend/src/modules/teacher/access/teacher-subject.policy.js';
import { ForbiddenError } from '../../../../../../backend/src/shared/errors/app-error.js';

describe('MaterialService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockPolicyCtx = {
    classroomSubjectId: 'cs-1',
    classroomId: 'cls-1',
    classroomName: '11A1',
    classroomStatus: 'ACTIVE' as const,
    academicYear: '2026-2027',
    gradeLevel: 11,
    subjectId: 'sub-history',
    subjectName: 'Lịch sử',
    teacherId: 'teacher-1',
  };

  describe('uploadMaterial', () => {
    it('saves file and creates DB records, rolling back storage if DB throws', async () => {
      vi.spyOn(materialRepository, 'findLessonWithClassroomSubject').mockResolvedValue({
        id: 'lesson-1',
        classroom_subject_id: 'cs-1',
        classroomSubject: { id: 'cs-1', teacher_id: 'teacher-1' },
      } as any);

      vi.spyOn(teacherSubjectPolicy, 'requireAssignedSubject').mockResolvedValue(mockPolicyCtx);

      vi.spyOn(defaultStorageProvider, 'put').mockResolvedValue();
      const deleteSpy = vi.spyOn(defaultStorageProvider, 'delete').mockResolvedValue();

      // Simulate DB failure
      vi.spyOn(materialRepository, 'createMaterialWithVersion').mockRejectedValue(
        new Error('DB Connection Timeout')
      );

      await expect(
        materialService.uploadMaterial({
          lessonId: 'lesson-1',
          teacherId: 'teacher-1',
          file: {
            originalname: 'bai_hoc.pdf',
            mimetype: 'application/pdf',
            size: 100,
            buffer: Buffer.from('%PDF-1.4 test'),
          },
        })
      ).rejects.toThrow('DB Connection Timeout');

      // Verify compensation: file in storage was cleaned up!
      expect(deleteSpy).toHaveBeenCalled();
    });

    it('successfully uploads material and returns DTO', async () => {
      vi.spyOn(materialRepository, 'findLessonWithClassroomSubject').mockResolvedValue({
        id: 'lesson-1',
        classroom_subject_id: 'cs-1',
        classroomSubject: { id: 'cs-1', teacher_id: 'teacher-1' },
      } as any);

      vi.spyOn(teacherSubjectPolicy, 'requireAssignedSubject').mockResolvedValue(mockPolicyCtx);
      vi.spyOn(defaultStorageProvider, 'put').mockResolvedValue();

      vi.spyOn(materialRepository, 'createMaterialWithVersion').mockResolvedValue({
        id: 'mat-1',
        lesson_id: 'lesson-1',
        file_name: 'bai_hoc.pdf',
        status: 'DRAFT',
        versions: [
          {
            id: 'ver-1',
            version_no: 1,
            byte_size: BigInt(100),
            mime_type: 'application/pdf',
            processing_status: 'PENDING',
            uploaded_at: new Date('2026-11-01'),
          },
        ],
      } as any);

      const res = await materialService.uploadMaterial({
        lessonId: 'lesson-1',
        teacherId: 'teacher-1',
        file: {
          originalname: 'bai_hoc.pdf',
          mimetype: 'application/pdf',
          size: 100,
          buffer: Buffer.from('%PDF-1.4 test'),
        },
      });

      expect(res.id).toBe('mat-1');
      expect(res.fileName).toBe('bai_hoc.pdf');
      expect(res.latestVersion.versionNo).toBe(1);
      expect(res.latestVersion.processingStatus).toBe('PENDING');
    });

    it('processes the uploaded version and persists extracted segments', async () => {
      vi.spyOn(materialRepository, 'findLessonWithClassroomSubject').mockResolvedValue({
        id: 'lesson-1',
        classroom_subject_id: 'cs-1',
        classroomSubject: { id: 'cs-1', teacher_id: 'teacher-1' },
      } as any);
      vi.spyOn(teacherSubjectPolicy, 'requireAssignedSubject').mockResolvedValue(mockPolicyCtx);
      vi.spyOn(defaultStorageProvider, 'put').mockResolvedValue();
      vi.spyOn(materialRepository, 'createMaterialWithVersion').mockResolvedValue({
        id: 'mat-1',
        lesson_id: 'lesson-1',
        file_name: 'bai_hoc.pdf',
        status: 'DRAFT',
        versions: [
          {
            id: 'ver-1',
            version_no: 1,
            byte_size: BigInt(100),
            mime_type: 'application/pdf',
            processing_status: 'PENDING',
            uploaded_at: new Date('2026-11-01'),
          },
        ],
      } as any);
      const segments = [
        {
          positionType: 'PAGE' as const,
          positionIndex: 1,
          positionLabel: 'Trang 1',
          ordinal: 1,
          content: 'Nội dung bài học',
        },
      ];
      vi.spyOn(defaultAiProcessingProvider, 'process').mockResolvedValue({
        status: 'PROCESSED',
        segments,
      });
      const updateProcessing = vi
        .spyOn(materialRepository, 'updateVersionProcessing')
        .mockResolvedValue({ processing_status: 'PROCESSED' } as any);

      const result = await materialService.uploadMaterial({
        lessonId: 'lesson-1',
        teacherId: 'teacher-1',
        file: {
          originalname: 'bai_hoc.pdf',
          mimetype: 'application/pdf',
          size: 100,
          buffer: Buffer.from('%PDF-1.4 test'),
        },
      });

      expect(defaultAiProcessingProvider.process).toHaveBeenCalledWith({
        materialVersionId: 'ver-1',
        fileName: 'bai_hoc.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('%PDF-1.4 test'),
      });
      expect(updateProcessing).toHaveBeenCalledWith('ver-1', 'PROCESSED', segments);
      expect(result.latestVersion.processingStatus).toBe('PROCESSED');
    });
  });

  describe('uploadNewVersion', () => {
    it('marks the version as failed when the processing provider throws', async () => {
      vi.spyOn(materialRepository, 'findMaterialWithLessonContext').mockResolvedValue({
        id: 'mat-1',
        status: 'DRAFT',
        lesson: { classroom_subject_id: 'cs-1' },
        versions: [],
      } as any);
      vi.spyOn(teacherSubjectPolicy, 'requireAssignedSubject').mockResolvedValue(mockPolicyCtx);
      vi.spyOn(defaultStorageProvider, 'put').mockResolvedValue();
      vi.spyOn(materialRepository, 'createNewVersion').mockResolvedValue({
        id: 'ver-2',
        material_id: 'mat-1',
        version_no: 2,
        byte_size: BigInt(120),
        mime_type: 'application/pdf',
        processing_status: 'PENDING',
        uploaded_at: new Date('2026-11-02'),
      } as any);
      vi.spyOn(defaultAiProcessingProvider, 'process').mockRejectedValue(
        new Error('Processing service unavailable')
      );
      const updateProcessing = vi
        .spyOn(materialRepository, 'updateVersionProcessing')
        .mockResolvedValue({ processing_status: 'FAILED' } as any);

      const result = await materialService.uploadNewVersion({
        materialId: 'mat-1',
        teacherId: 'teacher-1',
        file: {
          originalname: 'bai_hoc_v2.pdf',
          mimetype: 'application/pdf',
          size: 120,
          buffer: Buffer.from('%PDF-1.4 version 2'),
        },
      });

      expect(updateProcessing).toHaveBeenCalledWith('ver-2', 'FAILED');
      expect(result.processingStatus).toBe('FAILED');
    });
  });

  describe('downloadMaterial', () => {
    it('authorizes download for assigned teacher and returns buffer and metadata', async () => {
      vi.spyOn(materialRepository, 'findMaterialWithLessonContext').mockResolvedValue({
        id: 'mat-1',
        file_name: 'bai_hoc.pdf',
        lesson: {
          classroom_subject_id: 'cs-1',
        },
        activeVersion: {
          version_no: 1,
          storage_key: 'safe-key.pdf',
          mime_type: 'application/pdf',
          processing_status: 'PROCESSED',
        },
        versions: [
          {
            version_no: 1,
            storage_key: 'safe-key.pdf',
            mime_type: 'application/pdf',
          },
        ],
      } as any);

      vi.spyOn(teacherSubjectPolicy, 'requireAssignedSubject').mockResolvedValue(mockPolicyCtx);
      const testBuffer = Buffer.from('%PDF-1.4 file content');
      vi.spyOn(defaultStorageProvider, 'open').mockResolvedValue(testBuffer);

      const download = await materialService.downloadMaterial('mat-1', 'teacher-1');
      expect(download.fileName).toBe('bai_hoc.pdf');
      expect(download.mimeType).toBe('application/pdf');
      expect(download.buffer.equals(testBuffer)).toBe(true);
    });

    it('rejects download if user is not assigned to the classroomSubject', async () => {
      vi.spyOn(materialRepository, 'findMaterialWithLessonContext').mockResolvedValue({
        id: 'mat-1',
        file_name: 'bai_hoc.pdf',
        lesson: {
          classroom_subject_id: 'cs-1',
        },
        versions: [{ version_no: 1, storage_key: 'key.pdf', mime_type: 'application/pdf' }],
      } as any);

      vi.spyOn(teacherSubjectPolicy, 'requireAssignedSubject').mockRejectedValue(
        new ForbiddenError('Bạn không được phân công giảng dạy môn học này')
      );

      await expect(materialService.downloadMaterial('mat-1', 'teacher-intruder')).rejects.toThrow(
        ForbiddenError
      );
    });

    it('downloads the published active version instead of a pending replacement', async () => {
      vi.spyOn(materialRepository, 'findMaterialWithLessonContext').mockResolvedValue({
        id: 'mat-1',
        file_name: 'bai_hoc.pdf',
        lesson: { classroom_subject_id: 'cs-1' },
        activeVersion: {
          id: 'ver-1',
          storage_key: 'active-key.pdf',
          mime_type: 'application/pdf',
          processing_status: 'PROCESSED',
        },
        versions: [{
          id: 'ver-2',
          version_no: 2,
          storage_key: 'pending-key.pdf',
          mime_type: 'application/pdf',
          processing_status: 'PENDING',
        }],
      } as any);

      vi.spyOn(teacherSubjectPolicy, 'requireAssignedSubject').mockResolvedValue(mockPolicyCtx);
      const testBuffer = Buffer.from('%PDF-1.4 active version');
      const openSpy = vi.spyOn(defaultStorageProvider, 'open').mockResolvedValue(testBuffer);

      await materialService.downloadMaterial('mat-1', 'teacher-1');

      expect(openSpy).toHaveBeenCalledWith('active-key.pdf');
      expect(openSpy).not.toHaveBeenCalledWith('pending-key.pdf');
    });
  });

  describe('retryProcessing', () => {
    it('reprocesses the latest failed version from private storage', async () => {
      vi.spyOn(materialRepository, 'findMaterialWithLessonContext').mockResolvedValue({
        id: 'mat-1',
        file_name: 'lesson.pdf',
        status: 'DRAFT',
        lesson: { classroom_subject_id: 'cs-1' },
        versions: [{
          id: 'ver-1',
          version_no: 1,
          storage_key: 'lesson.pdf',
          mime_type: 'application/pdf',
          processing_status: 'FAILED',
        }],
      } as any);
      vi.spyOn(teacherSubjectPolicy, 'requireAssignedSubject').mockResolvedValue(mockPolicyCtx);
      const fileBuffer = Buffer.from('%PDF-1.4 stored');
      vi.spyOn(defaultStorageProvider, 'open').mockResolvedValue(fileBuffer);
      vi.spyOn(defaultAiProcessingProvider, 'process').mockResolvedValue({
        status: 'PROCESSED',
        segments: [{
          positionType: 'PAGE',
          positionIndex: 1,
          positionLabel: 'Page 1',
          ordinal: 1,
          content: 'Content',
        }],
      });
      const updateProcessing = vi
        .spyOn(materialRepository, 'updateVersionProcessing')
        .mockResolvedValue({ processing_status: 'PROCESSED' } as any);

      await expect(materialService.retryProcessing('mat-1', 'teacher-1')).resolves.toEqual({
        materialId: 'mat-1',
        versionId: 'ver-1',
        versionNo: 1,
        processingStatus: 'PROCESSED',
      });

      expect(defaultAiProcessingProvider.process).toHaveBeenCalledWith({
        materialVersionId: 'ver-1',
        fileName: 'lesson.pdf',
        mimeType: 'application/pdf',
        buffer: fileBuffer,
      });
      expect(updateProcessing).toHaveBeenCalledWith('ver-1', 'PROCESSED', expect.any(Array));
    });

    it('rejects retry for an already processed version', async () => {
      vi.spyOn(materialRepository, 'findMaterialWithLessonContext').mockResolvedValue({
        id: 'mat-1',
        status: 'DRAFT',
        lesson: { classroom_subject_id: 'cs-1' },
        versions: [{
          id: 'ver-1',
          version_no: 1,
          storage_key: 'lesson.pdf',
          mime_type: 'application/pdf',
          processing_status: 'PROCESSED',
        }],
      } as any);
      vi.spyOn(teacherSubjectPolicy, 'requireAssignedSubject').mockResolvedValue(mockPolicyCtx);

      await expect(materialService.retryProcessing('mat-1', 'teacher-1')).rejects.toThrow(
        'Chá»‰ cÃ³ thá»ƒ xá»­ lÃ½ láº¡i'
      );
    });
  });
});
