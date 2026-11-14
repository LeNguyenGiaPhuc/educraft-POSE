import type { Request, Response, NextFunction } from 'express';
import { subjectService } from './subject.service.js';
import {
  createSubjectSchema,
  updateSubjectSchema,
  updateSubjectStatusSchema,
  subjectIdSchema,
} from './subject.schemas.js';
import { sendSuccess } from '../../../shared/http/response.js';

export class SubjectController {
  async list(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const subjects = await subjectService.listSubjects();
      sendSuccess(res, subjects);
    } catch (err) {
      next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = subjectIdSchema.parse(req.params.id);
      const subject = await subjectService.getSubjectById(id);
      sendSuccess(res, subject);
    } catch (err) {
      next(err);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = createSubjectSchema.parse(req.body);
      const subject = await subjectService.createSubject(validated);
      sendSuccess(res, subject, undefined, 201);
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = subjectIdSchema.parse(req.params.id);
      const validated = updateSubjectSchema.parse(req.body);
      const subject = await subjectService.updateSubject(id, validated);
      sendSuccess(res, subject);
    } catch (err) {
      next(err);
    }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = subjectIdSchema.parse(req.params.id);
      const validated = updateSubjectStatusSchema.parse(req.body);
      const subject = await subjectService.updateStatus(id, validated);
      sendSuccess(res, subject);
    } catch (err) {
      next(err);
    }
  }
}

export const subjectController = new SubjectController();
