import type { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '../../../shared/errors/app-error.js';
import { sendSuccess } from '../../../shared/http/response.js';
import {
  activityIdParamSchema,
  aiDraftSchema,
  classroomSubjectIdParamSchema,
  createActivitySchema,
  putQuestionsSchema,
  reopenActivitySchema,
  updateActivitySchema,
} from './activity.schemas.js';
import { activityService } from './activity.service.js';

export const activityController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { classroomSubjectId } = classroomSubjectIdParamSchema.parse(req.params);
      const activities = await activityService.listActivities(req.user.id, classroomSubjectId);
      sendSuccess(res, activities);
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { classroomSubjectId } = classroomSubjectIdParamSchema.parse(req.params);
      const data = createActivitySchema.parse(req.body);
      const activity = await activityService.createActivity(req.user.id, classroomSubjectId, data);
      sendSuccess(res, activity, undefined, 201);
    } catch (err) {
      next(err);
    }
  },

  async getDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { activityId } = activityIdParamSchema.parse(req.params);
      const activity = await activityService.getActivityDetail(req.user.id, activityId);
      sendSuccess(res, activity);
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { activityId } = activityIdParamSchema.parse(req.params);
      const data = updateActivitySchema.parse(req.body);
      const activity = await activityService.updateActivity(req.user.id, activityId, data);
      sendSuccess(res, activity);
    } catch (err) {
      next(err);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { activityId } = activityIdParamSchema.parse(req.params);
      const result = await activityService.deleteActivity(req.user.id, activityId);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  },

  async aiDraft(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { activityId } = activityIdParamSchema.parse(req.params);
      const data = aiDraftSchema.parse(req.body);
      const result = await activityService.generateAiDraft(req.user.id, activityId, data);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  },

  async putQuestions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { activityId } = activityIdParamSchema.parse(req.params);
      const data = putQuestionsSchema.parse(req.body);
      const activity = await activityService.putQuestions(req.user.id, activityId, data);
      sendSuccess(res, activity);
    } catch (err) {
      next(err);
    }
  },

  async publish(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { activityId } = activityIdParamSchema.parse(req.params);
      const activity = await activityService.publishActivity(req.user.id, activityId);
      sendSuccess(res, activity);
    } catch (err) {
      next(err);
    }
  },

  async close(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { activityId } = activityIdParamSchema.parse(req.params);
      const activity = await activityService.closeActivity(req.user.id, activityId);
      sendSuccess(res, activity);
    } catch (err) {
      next(err);
    }
  },

  async reopen(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { activityId } = activityIdParamSchema.parse(req.params);
      const data = reopenActivitySchema.parse(req.body);
      const activity = await activityService.reopenActivity(req.user.id, activityId, data);
      sendSuccess(res, activity);
    } catch (err) {
      next(err);
    }
  },

  async getSubmissions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { activityId } = activityIdParamSchema.parse(req.params);
      const submissions = await activityService.getSubmissions(req.user.id, activityId);
      sendSuccess(res, submissions);
    } catch (err) {
      next(err);
    }
  },
};
