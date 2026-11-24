import type { NextFunction, Request, Response } from 'express';
import { UnauthorizedError } from '../../../shared/errors/app-error.js';
import { sendSuccess } from '../../../shared/http/response.js';
import {
  classroomSubjectIdParamSchema,
  exerciseSubmissionIdParamSchema,
  notebookSubmissionIdParamSchema,
  promptTopicsQuerySchema,
  statisticsQuerySchema,
  studentProgressParamSchema,
  submissionQuerySchema,
} from './results.schemas.js';
import { resultsService } from './results.service.js';

export const resultsController = {
  async listSubmissions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { classroomSubjectId } = classroomSubjectIdParamSchema.parse(req.params);
      const query = submissionQuerySchema.parse(req.query);
      const result = await resultsService.listSubmissions(
        req.user.id,
        classroomSubjectId,
        query
      );

      sendSuccess(res, result.items, {
        page: query.page,
        pageSize: query.pageSize,
        totalItems: result.total,
        totalPages: result.total > 0 ? Math.ceil(result.total / query.pageSize) : 0,
        hasNextPage: query.page * query.pageSize < result.total,
        hasPrevPage: query.page > 1 && result.total > 0,
      });
    } catch (err) {
      next(err);
    }
  },

  async getExerciseResult(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { submissionId } = exerciseSubmissionIdParamSchema.parse(req.params);
      const result = await resultsService.getExerciseResult(req.user.id, submissionId);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  },

  async getNotebookResult(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { submissionId } = notebookSubmissionIdParamSchema.parse(req.params);
      const result = await resultsService.getNotebookResult(req.user.id, submissionId);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  },

  async getStatistics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { classroomSubjectId } = classroomSubjectIdParamSchema.parse(req.params);
      const query = statisticsQuerySchema.parse(req.query);
      const result = await resultsService.getStatistics(
        req.user.id,
        classroomSubjectId,
        query
      );
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  },

  async getStudentProgress(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { classroomSubjectId, studentId } = studentProgressParamSchema.parse(req.params);
      const result = await resultsService.getStudentProgress(
        req.user.id,
        classroomSubjectId,
        studentId
      );
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  },

  async getPromptTopics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { classroomSubjectId } = classroomSubjectIdParamSchema.parse(req.params);
      const query = promptTopicsQuerySchema.parse(req.query);
      const result = await resultsService.getPromptTopics(
        req.user.id,
        classroomSubjectId,
        query
      );
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  },
};
