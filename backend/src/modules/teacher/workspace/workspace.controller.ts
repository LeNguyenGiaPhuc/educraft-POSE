import type { NextFunction, Request, Response } from 'express';
import { UnauthorizedError } from '../../../shared/errors/app-error.js';
import { sendSuccess } from '../../../shared/http/response.js';
import { workspaceService } from './workspace.service.js';
import {
  classroomIdParamSchema,
  classroomSubjectIdParamSchema,
} from './workspace.schemas.js';

export const workspaceController = {
  async listClassrooms(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError();
      }

      const classrooms = await workspaceService.listAssignedClassrooms(req.user.id);
      sendSuccess(res, classrooms);
    } catch (err) {
      next(err);
    }
  },

  async getClassroomDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError();
      }

      const { id } = classroomIdParamSchema.parse(req.params);
      const detail = await workspaceService.getAssignedClassroomDetail(id, req.user.id);
      sendSuccess(res, detail);
    } catch (err) {
      next(err);
    }
  },

  async getClassroomSubjectContext(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError();
      }

      const { id } = classroomSubjectIdParamSchema.parse(req.params);
      const context = await workspaceService.getClassroomSubjectContext(id, req.user.id);
      sendSuccess(res, context);
    } catch (err) {
      next(err);
    }
  },

  async getClassroomSubjectStudents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError();
      }

      const { id } = classroomSubjectIdParamSchema.parse(req.params);
      const students = await workspaceService.getClassroomSubjectStudents(id, req.user.id);
      sendSuccess(res, students);
    } catch (err) {
      next(err);
    }
  },
};
