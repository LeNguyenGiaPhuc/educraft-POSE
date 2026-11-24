import { describe, it, expect, vi, beforeEach } from 'vitest';
import { notebookCheckService } from '../../../../../../backend/src/modules/teacher/notebook-checks/notebook-check.service.js';
import { notebookCheckRepository } from '../../../../../../backend/src/modules/teacher/notebook-checks/notebook-check.repository.js';
import * as teacherSubjectPolicy from '../../../../../../backend/src/modules/teacher/access/teacher-subject.policy.js';
import {
  setNotebookAiProvider,
  type NotebookAiAnalysisProvider,
  DefaultNotebookAiAnalysisProvider,
} from '../../../../../../backend/src/modules/teacher/notebook-checks/notebook-ai-analysis.provider.js';
import { BadRequestError, ConflictError, NotFoundError } from '../../../../../../backend/src/shared/errors/app-error.js';
import type { StorageProvider } from '../../../../../../backend/src/modules/storage/storage-provider.js';
import { setNotebookCriteriaSuggestionProvider, type NotebookCriteriaSuggestionProvider } from '../../../../../../backend/src/modules/teacher/notebook-checks/notebook-criteria-suggestion.provider.js';
import { putCriteriaSchema } from '../../../../../../backend/src/modules/teacher/notebook-checks/notebook-check.schemas.js';

describe('NotebookCheckService', () => {
  const mockStorage: StorageProvider = {
    put: vi.fn().mockResolvedValue(undefined),
    open: vi.fn().mockResolvedValue(Buffer.from('test-content')),
    delete: vi.fn().mockResolvedValue(undefined),
    exists: vi.fn().mockResolvedValue(true),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    setNotebookAiProvider(new DefaultNotebookAiAnalysisProvider());
    setNotebookCriteriaSuggestionProvider({
      suggestCriteria: vi.fn().mockResolvedValue({ status: 'UNAVAILABLE', criteria: [] }),
    });
  });

  it('requests stateless criteria suggestions after checking the assigned subject', async () => {
    vi.spyOn(teacherSubjectPolicy, 'requireAssignedSubject').mockResolvedValue({ classroomStatus: 'ACTIVE' } as any);
    const provider: NotebookCriteriaSuggestionProvider = {
      suggestCriteria: vi.fn().mockResolvedValue({
        status: 'READY',
        criteria: [{ content: 'Ghi đủ các mốc chính' }],
      }),
    };
    setNotebookCriteriaSuggestionProvider(provider);
    const storageSpy = vi.spyOn(mockStorage, 'put');

    const result = await notebookCheckService.suggestCriteria({
      actorId: 'tea-1',
      classroomSubjectId: 'cs-1',
      files: [{ originalname: 'sample.jpg', mimetype: 'image/jpeg', size: 4, buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0]) }],
    });

    expect(result.status).toBe('READY');
    expect(provider.suggestCriteria).toHaveBeenCalled();
    expect(storageSpy).not.toHaveBeenCalled();
  });

  it('limits manually entered criteria to 500 characters', () => {
    expect(() => putCriteriaSchema.parse({ criteria: [{ content: 'a'.repeat(501) }] })).toThrow();
  });

  describe('CRUD & Criteria', () => {
    it('listNotebookChecks calls policy and returns repository result', async () => {
      vi.spyOn(teacherSubjectPolicy, 'requireAssignedSubject').mockResolvedValue({} as any);
      vi.spyOn(notebookCheckRepository, 'listNotebookChecks').mockResolvedValue([
        { id: 'act-1', title: 'Kiểm tra vở chương 1' } as any,
      ]);

      const res = await notebookCheckService.listNotebookChecks('tea-1', 'cs-1');
      expect(res).toHaveLength(1);
      expect(teacherSubjectPolicy.requireAssignedSubject).toHaveBeenCalledWith('tea-1', 'cs-1');
    });

    it('getNotebookCheckDetail throws NotFoundError if not found', async () => {
      vi.spyOn(notebookCheckRepository, 'findNotebookCheckById').mockResolvedValue(null);

      await expect(
        notebookCheckService.getNotebookCheckDetail('tea-1', 'act-missing')
      ).rejects.toThrow(NotFoundError);
    });

    it('createNotebookCheck delegates to repository atomically', async () => {
      vi.spyOn(notebookCheckRepository, 'createNotebookCheckAtomically').mockResolvedValue({
        id: 'act-1',
        title: 'Kiểm tra vở',
      } as any);

      const res = await notebookCheckService.createNotebookCheck('tea-1', 'cs-1', {
        title: 'Kiểm tra vở',
        description: 'Vở ghi bài 1-3',
      });
      expect(res?.id).toBe('act-1');
      expect(notebookCheckRepository.createNotebookCheckAtomically).toHaveBeenCalled();
    });

    it('creates and publishes a complete notebook check in one repository call', async () => {
      const createAndPublish = vi
        .spyOn(notebookCheckRepository, 'createAndPublishNotebookCheckAtomically')
        .mockResolvedValue({
          id: 'act-1',
          notebookCheck: { referenceFiles: [], criteria: [], periods: [] },
        } as any);
      const validJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);

      const result = await notebookCheckService.createAndPublishNotebookCheck({
        actorId: 'tea-1',
        classroomSubjectId: 'cs-1',
        input: {
          title: 'Kiá»ƒm tra vá»Ÿ',
          description: 'BÃ i 1',
          dueAt: '2026-12-01T00:00:00.000Z',
          criteria: JSON.stringify([{ content: 'Ghi Ä‘áº§y Ä‘á»§' }]),
        },
        criteria: [{ content: 'Ghi Ä‘áº§y Ä‘á»§' }],
        files: [{ originalname: 'mau.jpg', mimetype: 'image/jpeg', size: validJpeg.length, buffer: validJpeg }],
        storage: mockStorage,
      });

      expect(result?.id).toBe('act-1');
      expect(createAndPublish).toHaveBeenCalledWith(
        'tea-1',
        'cs-1',
        expect.objectContaining({
          title: 'Kiá»ƒm tra vá»Ÿ',
          dueAt: expect.any(Date),
          criteria: [{ content: 'Ghi Ä‘áº§y Ä‘á»§' }],
          files: [expect.objectContaining({ mimeType: 'image/jpeg' })],
        })
      );
      expect(mockStorage.put).toHaveBeenCalledTimes(1);
    });

    it('cleans every stored reference file when database finalization fails', async () => {
      vi.spyOn(notebookCheckRepository, 'createAndPublishNotebookCheckAtomically').mockRejectedValue(
        new Error('database failure')
      );
      const deleteSpy = vi.spyOn(mockStorage, 'delete');
      const validJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);

      await expect(
        notebookCheckService.createAndPublishNotebookCheck({
          actorId: 'tea-1',
          classroomSubjectId: 'cs-1',
          input: {
            title: 'Kiá»ƒm tra vá»Ÿ',
            description: '',
            dueAt: '2026-12-01T00:00:00.000Z',
            criteria: JSON.stringify([{ content: 'Ghi Ä‘áº§y Ä‘á»§' }]),
          },
          criteria: [{ content: 'Ghi Ä‘áº§y Ä‘á»§' }],
          files: [
            { originalname: 'mau-1.jpg', mimetype: 'image/jpeg', size: validJpeg.length, buffer: validJpeg },
            { originalname: 'mau-2.jpg', mimetype: 'image/jpeg', size: validJpeg.length, buffer: validJpeg },
          ],
          storage: mockStorage,
        })
      ).rejects.toThrow('database failure');

      expect(deleteSpy).toHaveBeenCalledTimes(2);
    });

    it('rejects notebook creation without a reference image', async () => {
      await expect(
        notebookCheckService.createAndPublishNotebookCheck({
          actorId: 'tea-1',
          classroomSubjectId: 'cs-1',
          input: {
            title: 'Kiá»ƒm tra vá»Ÿ',
            description: '',
            dueAt: '2026-12-01T00:00:00.000Z',
            criteria: JSON.stringify([{ content: 'Ghi Ä‘áº§y Ä‘á»§' }]),
          },
          criteria: [{ content: 'Ghi Ä‘áº§y Ä‘á»§' }],
          files: [],
          storage: mockStorage,
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('putCriteria rejects if criteria are already locked', async () => {
      vi.spyOn(notebookCheckRepository, 'findNotebookCheckById').mockResolvedValue({
        id: 'act-1',
        classroom_subject_id: 'cs-1',
        notebookCheck: {
          criteria_locked_at: new Date('2026-11-14T00:00:00Z'),
        },
      } as any);
      vi.spyOn(teacherSubjectPolicy, 'requireAssignedSubject').mockResolvedValue({} as any);

      await expect(
        notebookCheckService.putCriteria('tea-1', 'act-1', {
          criteria: [{ content: 'Ghi chép đầy đủ' }],
        })
      ).rejects.toThrow(ConflictError);
    });

    it('putCriteria updates criteria when unlocked', async () => {
      vi.spyOn(notebookCheckRepository, 'findNotebookCheckById').mockResolvedValue({
        id: 'act-1',
        classroom_subject_id: 'cs-1',
        notebookCheck: {
          criteria_locked_at: null,
        },
      } as any);
      vi.spyOn(teacherSubjectPolicy, 'requireAssignedSubject').mockResolvedValue({} as any);
      vi.spyOn(notebookCheckRepository, 'putCriteriaAtomically').mockResolvedValue({
        id: 'act-1',
        notebookCheck: {
          criteria: [{ id: 'crit-1', content: 'Ghi chép đầy đủ', order_index: 1 }],
        },
      } as any);

      const res = await notebookCheckService.putCriteria('tea-1', 'act-1', {
        criteria: [{ content: 'Ghi chép đầy đủ' }],
      });
      expect(res?.notebookCheck?.criteria).toHaveLength(1);
    });
  });

  describe('Reference Files', () => {
    it('uploadReferenceFile rejects invalid MIME types (e.g. PDF)', async () => {
      vi.spyOn(notebookCheckRepository, 'findNotebookCheckById').mockResolvedValue({
        id: 'act-1',
        classroom_subject_id: 'cs-1',
        notebookCheck: { criteria_locked_at: null, referenceFiles: [] },
      } as any);
      vi.spyOn(teacherSubjectPolicy, 'requireAssignedSubject').mockResolvedValue({} as any);

      await expect(
        notebookCheckService.uploadReferenceFile({
          actorId: 'tea-1',
          activityId: 'act-1',
          file: {
            originalname: 'document.pdf',
            mimetype: 'application/pdf',
            size: 1024,
            buffer: Buffer.from('%PDF-1.4 sample'),
          },
          storage: mockStorage,
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('uploadReferenceFile rejects files with fake MIME signatures', async () => {
      vi.spyOn(notebookCheckRepository, 'findNotebookCheckById').mockResolvedValue({
        id: 'act-1',
        classroom_subject_id: 'cs-1',
        notebookCheck: { criteria_locked_at: null, referenceFiles: [] },
      } as any);
      vi.spyOn(teacherSubjectPolicy, 'requireAssignedSubject').mockResolvedValue({} as any);

      await expect(
        notebookCheckService.uploadReferenceFile({
          actorId: 'tea-1',
          activityId: 'act-1',
          file: {
            originalname: 'photo.jpg',
            mimetype: 'image/jpeg',
            size: 1024,
            buffer: Buffer.from('FAKE NOT JPEG'),
          },
          storage: mockStorage,
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('uploadReferenceFile rejects when criteria already locked', async () => {
      vi.spyOn(notebookCheckRepository, 'findNotebookCheckById').mockResolvedValue({
        id: 'act-1',
        classroom_subject_id: 'cs-1',
        notebookCheck: {
          criteria_locked_at: new Date(),
          referenceFiles: [],
        },
      } as any);
      vi.spyOn(teacherSubjectPolicy, 'requireAssignedSubject').mockResolvedValue({} as any);

      // JPEG magic: 0xFF, 0xD8, 0xFF
      const validJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);

      await expect(
        notebookCheckService.uploadReferenceFile({
          actorId: 'tea-1',
          activityId: 'act-1',
          file: {
            originalname: 'photo.jpg',
            mimetype: 'image/jpeg',
            size: 6,
            buffer: validJpeg,
          },
          storage: mockStorage,
        })
      ).rejects.toThrow(ConflictError);
    });

    it('uploadReferenceFile saves file and record successfully for valid JPEG', async () => {
      vi.spyOn(notebookCheckRepository, 'findNotebookCheckById').mockResolvedValue({
        id: 'act-1',
        classroom_subject_id: 'cs-1',
        notebookCheck: {
          criteria_locked_at: null,
          referenceFiles: [],
        },
      } as any);
      vi.spyOn(teacherSubjectPolicy, 'requireAssignedSubject').mockResolvedValue({} as any);
      vi.spyOn(notebookCheckRepository, 'addReferenceFileAtomically').mockResolvedValue({
        id: 'ref-1',
        sort_order: 1,
      } as any);

      const validJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);

      const res = await notebookCheckService.uploadReferenceFile({
        actorId: 'tea-1',
        activityId: 'act-1',
        file: {
          originalname: 'sample.jpg',
          mimetype: 'image/jpeg',
          size: validJpeg.length,
          buffer: validJpeg,
        },
        storage: mockStorage,
      });

      expect(res.id).toBe('ref-1');
      expect(mockStorage.put).toHaveBeenCalled();
    });
  });

  describe('Publish Prerequisites', () => {
    it('publishNotebookCheck rejects if missing reference files', async () => {
      vi.spyOn(notebookCheckRepository, 'findNotebookCheckById').mockResolvedValue({
        id: 'act-1',
        classroom_subject_id: 'cs-1',
        notebookCheck: {
          referenceFiles: [], // 0 files
          criteria: [{ id: 'crit-1' }],
        },
      } as any);
      vi.spyOn(teacherSubjectPolicy, 'requireAssignedSubject').mockResolvedValue({} as any);

      await expect(
        notebookCheckService.publishNotebookCheck('tea-1', 'act-1')
      ).rejects.toThrow(BadRequestError);
    });

    it('publishNotebookCheck rejects if missing criteria', async () => {
      vi.spyOn(notebookCheckRepository, 'findNotebookCheckById').mockResolvedValue({
        id: 'act-1',
        classroom_subject_id: 'cs-1',
        notebookCheck: {
          referenceFiles: [{ id: 'ref-1' }],
          criteria: [], // 0 criteria
        },
      } as any);
      vi.spyOn(teacherSubjectPolicy, 'requireAssignedSubject').mockResolvedValue({} as any);

      await expect(
        notebookCheckService.publishNotebookCheck('tea-1', 'act-1')
      ).rejects.toThrow(BadRequestError);
    });

    it('publishNotebookCheck publishes when requirements are met', async () => {
      vi.spyOn(notebookCheckRepository, 'findNotebookCheckById').mockResolvedValue({
        id: 'act-1',
        classroom_subject_id: 'cs-1',
        notebookCheck: {
          referenceFiles: [{ id: 'ref-1' }],
          criteria: [{ id: 'crit-1' }],
        },
      } as any);
      vi.spyOn(teacherSubjectPolicy, 'requireAssignedSubject').mockResolvedValue({} as any);
      vi.spyOn(notebookCheckRepository, 'publishNotebookCheckAtomically').mockResolvedValue({
        id: 'act-1',
        status: 'PUBLISHED',
      } as any);

      const res = await notebookCheckService.publishNotebookCheck('tea-1', 'act-1');
      expect(res?.status).toBe('PUBLISHED');
    });
  });

  describe('Period Lifecycle', () => {
    it('createPeriod rejects past due date', async () => {
      vi.spyOn(notebookCheckRepository, 'findNotebookCheckById').mockResolvedValue({
        id: 'act-1',
        classroom_subject_id: 'cs-1',
      } as any);
      vi.spyOn(teacherSubjectPolicy, 'requireAssignedSubject').mockResolvedValue({} as any);

      await expect(
        notebookCheckService.createPeriod('tea-1', 'act-1', {
          dueAt: new Date(Date.now() - 3600_000).toISOString(),
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('createPeriod rejects if an open period already exists', async () => {
      vi.spyOn(notebookCheckRepository, 'findNotebookCheckById').mockResolvedValue({
        id: 'act-1',
        classroom_subject_id: 'cs-1',
      } as any);
      vi.spyOn(teacherSubjectPolicy, 'requireAssignedSubject').mockResolvedValue({} as any);
      vi.spyOn(notebookCheckRepository, 'findOpenPeriod').mockResolvedValue({
        id: 'period-open',
        period_no: 1,
      } as any);

      await expect(
        notebookCheckService.createPeriod('tea-1', 'act-1', {
          dueAt: new Date(Date.now() + 86400_000).toISOString(),
        })
      ).rejects.toThrow(ConflictError);
    });

    it('closePeriod closes period and locks current submissions', async () => {
      vi.spyOn(notebookCheckRepository, 'findPeriodById').mockResolvedValue({
        id: 'p-1',
        activity_id: 'act-1',
        closed_at: null,
        activity: {
          activity: {
            classroom_subject_id: 'cs-1',
          },
        },
      } as any);
      vi.spyOn(teacherSubjectPolicy, 'requireAssignedSubject').mockResolvedValue({} as any);
      vi.spyOn(notebookCheckRepository, 'closePeriodAtomically').mockResolvedValue({
        id: 'p-1',
        closed_at: new Date(),
      } as any);

      const res = await notebookCheckService.closePeriod('tea-1', 'p-1');
      expect(res.closed_at).not.toBeNull();
      expect(notebookCheckRepository.closePeriodAtomically).toHaveBeenCalledWith('tea-1', 'p-1');
    });
  });

  describe('Provisional AI Analysis', () => {
    it('analyzeSubmission returns UNAVAILABLE from default provider safely', async () => {
      vi.spyOn(notebookCheckRepository, 'findSubmissionForReview').mockResolvedValue({
        id: 'sub-1',
        status: 'LOCKED',
        period: {
          activity: {
            activity: { classroom_subject_id: 'cs-1' },
            criteria: [{ id: 'crit-1', content: 'Ghi đủ bài', order_index: 1 }],
          },
        },
        files: [{ storage_key: 'file1.jpg' }],
      } as any);
      vi.spyOn(teacherSubjectPolicy, 'requireAssignedSubject').mockResolvedValue({} as any);
      vi.spyOn(notebookCheckRepository, 'startSubmissionAnalysis').mockResolvedValue();
      vi.spyOn(notebookCheckRepository, 'markSubmissionAnalysisFailed').mockResolvedValue();

      const res = await notebookCheckService.analyzeSubmission('tea-1', 'sub-1', mockStorage);
      expect(res.status).toBe('UNAVAILABLE');
    });

    it('analyzeSubmission stores draft when provider returns READY', async () => {
      vi.spyOn(notebookCheckRepository, 'findSubmissionForReview').mockResolvedValue({
        id: 'sub-1',
        status: 'LOCKED',
        period: {
          activity: {
            activity: { classroom_subject_id: 'cs-1' },
            criteria: [{ id: 'crit-1', content: 'Ghi đủ bài', order_index: 1 }],
          },
        },
        files: [{ storage_key: 'file1.jpg' }],
      } as any);
      vi.spyOn(teacherSubjectPolicy, 'requireAssignedSubject').mockResolvedValue({} as any);
      vi.spyOn(notebookCheckRepository, 'startSubmissionAnalysis').mockResolvedValue();
      vi.spyOn(notebookCheckRepository, 'saveAiDraftAtomically').mockResolvedValue({
        submission_id: 'sub-1',
        ocr_text: 'Bài 1: Khởi nghĩa Lam Sơn',
      } as any);

      const mockProvider: NotebookAiAnalysisProvider = {
        async analyzeSubmission() {
          return {
            status: 'READY',
            ocrText: 'Bài 1: Khởi nghĩa Lam Sơn',
            suggestions: [
              {
                criterionId: 'crit-1',
                status: 'RECORDED',
                note: 'Đầy đủ nội dung',
              },
            ],
          };
        },
      };
      setNotebookAiProvider(mockProvider);

      const res = await notebookCheckService.analyzeSubmission('tea-1', 'sub-1', mockStorage);
      expect(res.status).toBe('READY');
      expect(res.ocrText).toBe('Bài 1: Khởi nghĩa Lam Sơn');
    });

    it('analyzeSubmission passes reference and submission images to the provider', async () => {
      vi.spyOn(notebookCheckRepository, 'findSubmissionForReview').mockResolvedValue({
        id: 'sub-1',
        status: 'LOCKED',
        period: {
          activity: {
            activity: { classroom_subject_id: 'cs-1' },
            referenceFiles: [{ storage_key: 'reference.jpg', mime_type: 'image/jpeg' }],
            criteria: [{ id: 'crit-1', content: 'Ghi đủ bài', order_index: 1 }],
          },
        },
        files: [{ storage_key: 'submission.jpg', mime_type: 'image/jpeg' }],
      } as any);
      vi.spyOn(teacherSubjectPolicy, 'requireAssignedSubject').mockResolvedValue({} as any);
      vi.spyOn(notebookCheckRepository, 'startSubmissionAnalysis').mockResolvedValue();
      vi.spyOn(notebookCheckRepository, 'saveAiDraftAtomically').mockResolvedValue({ submission_id: 'sub-1' } as any);

      let received: any;
      setNotebookAiProvider({
        async analyzeSubmission(input) {
          received = input;
          return { status: 'READY', ocrText: 'Đọc được', suggestions: [] };
        },
      });

      await notebookCheckService.analyzeSubmission('tea-1', 'sub-1', mockStorage);

      expect(received.referenceFiles).toHaveLength(1);
      expect(received.submissionFiles).toHaveLength(1);
      expect(received.criteria).toHaveLength(1);
      expect(mockStorage.open).toHaveBeenCalledWith('reference.jpg');
      expect(mockStorage.open).toHaveBeenCalledWith('submission.jpg');
    });

    it('analyzeSubmission marks FAILED when the provider throws', async () => {
      vi.spyOn(notebookCheckRepository, 'findSubmissionForReview').mockResolvedValue({
        id: 'sub-1',
        status: 'LOCKED',
        period: {
          activity: {
            activity: { classroom_subject_id: 'cs-1' },
            criteria: [{ id: 'crit-1', content: 'Ghi đủ bài', order_index: 1 }],
          },
        },
        files: [{ storage_key: 'file1.jpg', mime_type: 'image/jpeg' }],
      } as any);
      vi.spyOn(teacherSubjectPolicy, 'requireAssignedSubject').mockResolvedValue({} as any);
      vi.spyOn(notebookCheckRepository, 'startSubmissionAnalysis').mockResolvedValue();
      const markFailed = vi
        .spyOn(notebookCheckRepository, 'markSubmissionAnalysisFailed')
        .mockResolvedValue();
      setNotebookAiProvider({
        async analyzeSubmission() {
          throw new Error('provider unavailable');
        },
      });

      const result = await notebookCheckService.analyzeSubmission('tea-1', 'sub-1', mockStorage);

      expect(result.status).toBe('FAILED');
      expect(markFailed).toHaveBeenCalled();
    });

    it('analyzeSubmission does not let an older retry overwrite a newer result', async () => {
      vi.spyOn(notebookCheckRepository, 'findSubmissionForReview').mockResolvedValue({
        id: 'sub-1',
        status: 'LOCKED',
        period: {
          activity: {
            activity: { classroom_subject_id: 'cs-1' },
            criteria: [{ id: 'crit-1', content: 'Ghi đủ bài', order_index: 1 }],
          },
        },
        files: [{ storage_key: 'file1.jpg', mime_type: 'image/jpeg' }],
      } as any);
      vi.spyOn(teacherSubjectPolicy, 'requireAssignedSubject').mockResolvedValue({} as any);

      const attemptIds: string[] = [];
      vi.spyOn(notebookCheckRepository, 'startSubmissionAnalysis').mockImplementation(
        async (_actorId, _submissionId, attemptId) => {
          attemptIds.push(attemptId);
        }
      );
      vi.spyOn(notebookCheckRepository, 'markSubmissionAnalysisFailed').mockResolvedValue();
      vi.spyOn(notebookCheckRepository, 'saveAiDraftAtomically').mockImplementation(
        async (_actorId, _submissionId, attemptId) => {
          if (attemptId === attemptIds[1]) {
            return { submission_id: 'sub-1' } as any;
          }
          return null;
        }
      );

      let resolveFirst!: (value: any) => void;
      let resolveSecond!: (value: any) => void;
      const firstResult = new Promise((resolve) => {
        resolveFirst = resolve;
      });
      const secondResult = new Promise((resolve) => {
        resolveSecond = resolve;
      });
      let providerCall = 0;
      setNotebookAiProvider({
        async analyzeSubmission() {
          providerCall += 1;
          return (providerCall === 1 ? firstResult : secondResult) as Promise<any>;
        },
      });

      const firstRequest = notebookCheckService.analyzeSubmission('tea-1', 'sub-1', mockStorage);
      const secondRequest = notebookCheckService.analyzeSubmission('tea-1', 'sub-1', mockStorage);

      resolveSecond({ status: 'READY', ocrText: 'Kết quả mới', suggestions: [] });
      const secondResponse = await secondRequest;
      resolveFirst({ status: 'READY', ocrText: 'Kết quả cũ', suggestions: [] });
      const firstResponse = await firstRequest;

      expect(secondResponse.status).toBe('READY');
      expect(firstResponse.status).toBe('FAILED');
      expect(attemptIds).toHaveLength(2);
    });

    it('getSubmissionReview removes private storage keys from file metadata', async () => {
      vi.spyOn(notebookCheckRepository, 'findSubmissionForReview').mockResolvedValue({
        id: 'sub-1',
        status: 'LOCKED',
        period: {
          activity: {
            activity: { classroom_subject_id: 'cs-1' },
          },
        },
        files: [
          {
            id: 'file-1',
            storage_key: 'private/sub-1.jpg',
            mime_type: 'image/jpeg',
            byte_size: BigInt(10),
            sort_order: 1,
          },
        ],
      } as any);
      vi.spyOn(teacherSubjectPolicy, 'requireAssignedSubject').mockResolvedValue({} as any);

      const result = await notebookCheckService.getSubmissionReview('tea-1', 'sub-1');

      expect(result.files[0]).not.toHaveProperty('storage_key');
      expect(result.files[0].byte_size).toBe(10);
    });

    it('downloadReferenceFile authorizes the teacher before opening private storage', async () => {
      vi.spyOn(notebookCheckRepository, 'findReferenceFileForDownload').mockResolvedValue({
        storage_key: 'private/reference.jpg',
        mime_type: 'image/jpeg',
        activity: { activity: { classroom_subject_id: 'cs-1' } },
      } as any);
      vi.spyOn(teacherSubjectPolicy, 'requireAssignedSubject').mockResolvedValue({} as any);

      const result = await notebookCheckService.downloadReferenceFile(
        'tea-1',
        'act-1',
        'file-1',
        mockStorage
      );

      expect(result.mimeType).toBe('image/jpeg');
      expect(mockStorage.open).toHaveBeenCalledWith('private/reference.jpg');
    });
  });

  describe('Review & Finalization', () => {
    it('finalizeSubmission rejects submission that is still CURRENT (not LOCKED)', async () => {
      vi.spyOn(notebookCheckRepository, 'findSubmissionForReview').mockResolvedValue({
        id: 'sub-1',
        status: 'CURRENT', // not locked
        period: {
          activity: {
            activity: { classroom_subject_id: 'cs-1' },
            criteria: [{ id: 'crit-1' }],
          },
        },
      } as any);
      vi.spyOn(teacherSubjectPolicy, 'requireAssignedSubject').mockResolvedValue({} as any);

      await expect(
        notebookCheckService.finalizeSubmission('tea-1', 'sub-1', {
          results: [{ criterionId: 'crit-1', status: 'RECORDED' }],
        })
      ).rejects.toThrow(ConflictError);
    });

    it('finalizeSubmission rejects if criteria count or IDs do not match activity criteria', async () => {
      vi.spyOn(notebookCheckRepository, 'findSubmissionForReview').mockResolvedValue({
        id: 'sub-1',
        status: 'LOCKED',
        period: {
          activity: {
            activity: { classroom_subject_id: 'cs-1' },
            criteria: [{ id: 'crit-1' }, { id: 'crit-2' }], // 2 criteria
          },
        },
      } as any);
      vi.spyOn(teacherSubjectPolicy, 'requireAssignedSubject').mockResolvedValue({} as any);

      // Payload only has 1 criterion
      await expect(
        notebookCheckService.finalizeSubmission('tea-1', 'sub-1', {
          results: [{ criterionId: 'crit-1', status: 'RECORDED' }],
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('finalizeSubmission rejects duplicate criterion IDs', async () => {
      vi.spyOn(notebookCheckRepository, 'findSubmissionForReview').mockResolvedValue({
        id: 'sub-1',
        status: 'LOCKED',
        period: {
          activity: {
            activity: { classroom_subject_id: 'cs-1' },
            criteria: [{ id: 'crit-1' }, { id: 'crit-2' }],
          },
        },
      } as any);
      vi.spyOn(teacherSubjectPolicy, 'requireAssignedSubject').mockResolvedValue({} as any);

      await expect(
        notebookCheckService.finalizeSubmission('tea-1', 'sub-1', {
          results: [
            { criterionId: 'crit-1', status: 'RECORDED' },
            { criterionId: 'crit-1', status: 'RECORDED' },
          ],
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('finalizeSubmission finalizes atomically when valid', async () => {
      vi.spyOn(notebookCheckRepository, 'findSubmissionForReview').mockResolvedValue({
        id: 'sub-1',
        status: 'LOCKED',
        assessment: null,
        period: {
          activity: {
            activity: { classroom_subject_id: 'cs-1' },
            criteria: [{ id: 'crit-1' }],
          },
        },
      } as any);
      vi.spyOn(teacherSubjectPolicy, 'requireAssignedSubject').mockResolvedValue({} as any);
      vi.spyOn(notebookCheckRepository, 'finalizeSubmissionAtomically').mockResolvedValue({
        id: 'ass-1',
        submission_id: 'sub-1',
        results: [{ criterion_id: 'crit-1', status: 'RECORDED' }],
      } as any);

      const res = await notebookCheckService.finalizeSubmission('tea-1', 'sub-1', {
        results: [{ criterionId: 'crit-1', status: 'RECORDED', note: 'Tốt' }],
        teacherComment: 'Làm tốt lắm',
      });
      expect(res?.id).toBe('ass-1');
      expect(notebookCheckRepository.finalizeSubmissionAtomically).toHaveBeenCalled();
    });

    it('finalizeSubmission idempotent retry returns existing assessment for same payload', async () => {
      vi.spyOn(notebookCheckRepository, 'findSubmissionForReview').mockResolvedValue({
        id: 'sub-1',
        status: 'FINALIZED',
        period: {
          activity: {
            activity: { classroom_subject_id: 'cs-1' },
            criteria: [{ id: 'crit-1' }],
          },
        },
        assessment: {
          id: 'ass-1',
          teacher_comment: 'Làm tốt lắm',
          results: [{ criterion_id: 'crit-1', status: 'RECORDED', note: 'Tốt' }],
        },
      } as any);
      vi.spyOn(teacherSubjectPolicy, 'requireAssignedSubject').mockResolvedValue({} as any);

      const res = await notebookCheckService.finalizeSubmission('tea-1', 'sub-1', {
        results: [{ criterionId: 'crit-1', status: 'RECORDED', note: 'Tốt' }],
        teacherComment: 'Làm tốt lắm',
      });
      expect(res?.id).toBe('ass-1');
    });

    it('finalizeSubmission rejects different payload on already finalized submission with ConflictError', async () => {
      vi.spyOn(notebookCheckRepository, 'findSubmissionForReview').mockResolvedValue({
        id: 'sub-1',
        status: 'FINALIZED',
        period: {
          activity: {
            activity: { classroom_subject_id: 'cs-1' },
            criteria: [{ id: 'crit-1' }],
          },
        },
        assessment: {
          id: 'ass-1',
          teacher_comment: 'Làm tốt lắm',
          results: [{ criterion_id: 'crit-1', status: 'RECORDED', note: 'Tốt' }],
        },
      } as any);
      vi.spyOn(teacherSubjectPolicy, 'requireAssignedSubject').mockResolvedValue({} as any);

      await expect(
        notebookCheckService.finalizeSubmission('tea-1', 'sub-1', {
          results: [{ criterionId: 'crit-1', status: 'NEEDS_SUPPLEMENTATION', note: 'Thiếu' }],
          teacherComment: 'Khác',
        })
      ).rejects.toThrow(ConflictError);
    });
  });
});
