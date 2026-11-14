import type { NextFunction, Request, Response } from 'express';
import { UnauthorizedError } from '../../../shared/errors/app-error.js';
import { sendSuccess } from '../../../shared/http/response.js';
import { lessonService } from './lesson.service.js';
import {
  classroomSubjectIdParamSchema,
  createLessonSchema,
  lessonIdParamSchema,
  updateLessonSchema,
} from './lesson.schemas.js';

export const lessonController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError();
      }

      const { id: classroomSubjectId } = classroomSubjectIdParamSchema.parse(req.params);
      const lessons = await lessonService.listLessons(classroomSubjectId, req.user.id);
      sendSuccess(res, lessons);
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError();
      }

      const { id: classroomSubjectId } = classroomSubjectIdParamSchema.parse(req.params);
      const data = createLessonSchema.parse(req.body);
      const created = await lessonService.createLesson(classroomSubjectId, req.user.id, data);
      sendSuccess(res, created, undefined, 201);
    } catch (err) {
      next(err);
    }
  },

  async getDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError();
      }

      const { id: lessonId } = lessonIdParamSchema.parse(req.params);
      const detail = await lessonService.getLessonDetail(lessonId, req.user.id);
      sendSuccess(res, detail);
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError();
      }

      const { id: lessonId } = lessonIdParamSchema.parse(req.params);
      const data = updateLessonSchema.parse(req.body);
      const updated = await lessonService.updateLesson(lessonId, req.user.id, data);
      sendSuccess(res, updated);
    } catch (err) {
      next(err);
    }
  },

  async publish(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError();
      }

      const { id: lessonId } = lessonIdParamSchema.parse(req.params);
      const published = await lessonService.publishLesson(lessonId, req.user.id);
      sendSuccess(res, published);
    } catch (err) {
      next(err);
    }
  },
};
