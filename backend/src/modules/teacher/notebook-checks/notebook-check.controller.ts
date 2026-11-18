import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { BadRequestError, NotFoundError, UnauthorizedError } from '../../../shared/errors/app-error.js';
import { sendSuccess } from '../../../shared/http/response.js';
import { defaultStorageProvider } from '../../storage/storage-factory.js';
import {
  activityIdParamSchema,
  classroomSubjectIdParamSchema,
  createNotebookCheckSchema,
  createAndPublishNotebookCheckSchema,
  createPeriodSchema,
  fileIdParamSchema,
  finalizeSubmissionSchema,
  periodIdParamSchema,
  putCriteriaSchema,
  submissionIdParamSchema,
  submissionFileIdParamSchema,
  updateNotebookCheckSchema,
} from './notebook-check.schemas.js';
import { notebookCheckService } from './notebook-check.service.js';

const storage = defaultStorageProvider;

export const uploadReferenceFileMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for reference images
  },
}).single('file');

export const uploadReferenceFilesMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 5,
  },
}).array('files', 5);

export const notebookCheckController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { classroomSubjectId } = classroomSubjectIdParamSchema.parse(req.params);
      const data = await notebookCheckService.listNotebookChecks(req.user.id, classroomSubjectId);
      sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { classroomSubjectId } = classroomSubjectIdParamSchema.parse(req.params);
      const body = createNotebookCheckSchema.parse(req.body);
      const data = await notebookCheckService.createNotebookCheck(
        req.user.id,
        classroomSubjectId,
        body
      );
      sendSuccess(res, data, undefined, 201);
    } catch (err) {
      next(err);
    }
  },

  async createAndPublish(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { classroomSubjectId } = classroomSubjectIdParamSchema.parse(req.params);
      const body = createAndPublishNotebookCheckSchema.parse(req.body);
      let criteria: Array<{ content: string }>;
      try {
        criteria = putCriteriaSchema.parse({ criteria: JSON.parse(body.criteria) }).criteria;
      } catch {
        throw new BadRequestError('Danh sÃ¡ch tiÃªu chÃ­ khÃ´ng há»£p lá»‡');
      }

      const files = Array.isArray(req.files) ? req.files : [];
      const data = await notebookCheckService.createAndPublishNotebookCheck({
        actorId: req.user.id,
        classroomSubjectId,
        input: body,
        criteria,
        files: files.map((file) => ({
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          buffer: file.buffer,
        })),
        storage,
      });
      sendSuccess(res, data, undefined, 201);
    } catch (err) {
      next(err);
    }
  },

  async suggestCriteria(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { classroomSubjectId } = classroomSubjectIdParamSchema.parse(req.params);
      const files = Array.isArray(req.files) ? req.files : [];
      const result = await notebookCheckService.suggestCriteria({
        actorId: req.user.id,
        classroomSubjectId,
        files: files.map((file) => ({
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          buffer: file.buffer,
        })),
      });
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  },

  async getDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { activityId } = activityIdParamSchema.parse(req.params);
      const data = await notebookCheckService.getNotebookCheckDetail(req.user.id, activityId);
      sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { activityId } = activityIdParamSchema.parse(req.params);
      const body = updateNotebookCheckSchema.parse(req.body);
      const data = await notebookCheckService.updateNotebookCheck(req.user.id, activityId, body);
      sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { activityId } = activityIdParamSchema.parse(req.params);
      const data = await notebookCheckService.deleteNotebookCheck(req.user.id, activityId, storage);
      sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  },

  async putCriteria(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { activityId } = activityIdParamSchema.parse(req.params);
      const body = putCriteriaSchema.parse(req.body);
      const data = await notebookCheckService.putCriteria(req.user.id, activityId, body);
      sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  },

  async uploadReferenceFile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { activityId } = activityIdParamSchema.parse(req.params);

      if (!req.file) {
        throw new BadRequestError('Vui lòng chọn file ảnh mẫu để tải lên');
      }

      const file = await notebookCheckService.uploadReferenceFile({
        actorId: req.user.id,
        activityId,
        file: {
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
          buffer: req.file.buffer,
        },
        storage,
      });

      sendSuccess(res, file, undefined, 201);
    } catch (err) {
      next(err);
    }
  },

  async deleteReferenceFile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { activityId, fileId } = fileIdParamSchema.parse(req.params);
      const data = await notebookCheckService.deleteReferenceFile(
        req.user.id,
        activityId,
        fileId,
        storage
      );
      sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  },

  async downloadReferenceFile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { activityId, fileId } = fileIdParamSchema.parse(req.params);
      const file = await notebookCheckService.downloadReferenceFile(
        req.user.id,
        activityId,
        fileId,
        storage
      );
      res.setHeader('Content-Type', file.mimeType);
      res.setHeader('Content-Disposition', 'inline');
      res.setHeader('Cache-Control', 'private, no-store');
      res.status(200).send(file.buffer);
    } catch (err) {
      next(err);
    }
  },

  async publish(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { activityId } = activityIdParamSchema.parse(req.params);
      const data = await notebookCheckService.publishNotebookCheck(req.user.id, activityId);
      sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  },

  async createPeriod(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { activityId } = activityIdParamSchema.parse(req.params);
      const body = createPeriodSchema.parse(req.body);
      const data = await notebookCheckService.createPeriod(req.user.id, activityId, body);
      sendSuccess(res, data, undefined, 201);
    } catch (err) {
      next(err);
    }
  },

  async closePeriod(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { periodId } = periodIdParamSchema.parse(req.params);
      const data = await notebookCheckService.closePeriod(req.user.id, periodId);
      sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  },

  async listPeriods(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { activityId } = activityIdParamSchema.parse(req.params);
      const data = await notebookCheckService.listPeriods(req.user.id, activityId);
      sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  },

  async listSubmissions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { periodId } = periodIdParamSchema.parse(req.params);
      const data = await notebookCheckService.listSubmissionsByPeriod(req.user.id, periodId);
      sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  },

  async getReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { submissionId } = submissionIdParamSchema.parse(req.params);
      const data = await notebookCheckService.getSubmissionReview(req.user.id, submissionId);
      sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  },

  async downloadSubmissionFile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { submissionId, fileId } = submissionFileIdParamSchema.parse(req.params);
      const file = await notebookCheckService.downloadSubmissionFile(
        req.user.id,
        submissionId,
        fileId,
        storage
      );
      res.setHeader('Content-Type', file.mimeType);
      res.setHeader('Content-Disposition', 'inline');
      res.setHeader('Cache-Control', 'private, no-store');
      res.status(200).send(file.buffer);
    } catch (err) {
      next(err);
    }
  },

  async analyze(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { submissionId } = submissionIdParamSchema.parse(req.params);
      const data = await notebookCheckService.analyzeSubmission(req.user.id, submissionId, storage);
      sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  },

  async getAnalysis(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { submissionId } = submissionIdParamSchema.parse(req.params);
      const submission = await notebookCheckService.getSubmissionReview(req.user.id, submissionId);
      sendSuccess(res, {
        submissionId: submission.id,
        processingStatus: submission.processing_status,
        aiDraft: submission.aiDraft,
      });
    } catch (err) {
      next(err);
    }
  },

  async finalize(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { submissionId } = submissionIdParamSchema.parse(req.params);
      const body = finalizeSubmissionSchema.parse(req.body);
      const data = await notebookCheckService.finalizeSubmission(req.user.id, submissionId, body);
      sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  },

  async getAssessment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { submissionId } = submissionIdParamSchema.parse(req.params);
      const submission = await notebookCheckService.getSubmissionReview(req.user.id, submissionId);
      if (!submission.assessment) {
        throw new NotFoundError('Bài nộp này chưa có kết quả đánh giá chính thức');
      }
      sendSuccess(res, submission.assessment);
    } catch (err) {
      next(err);
    }
  },
};
