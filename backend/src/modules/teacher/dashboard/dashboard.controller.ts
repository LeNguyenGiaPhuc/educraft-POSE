import type { NextFunction, Request, Response } from 'express';
import { UnauthorizedError } from '../../../shared/errors/app-error.js';
import { sendSuccess } from '../../../shared/http/response.js';
import { teacherDashboardService } from './dashboard.service.js';

export const teacherDashboardController = {
  async getSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const summary = await teacherDashboardService.getSummary(req.user.id);
      sendSuccess(res, summary);
    } catch (err) {
      next(err);
    }
  },
};
