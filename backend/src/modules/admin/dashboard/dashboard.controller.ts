import type { NextFunction, Request, Response } from 'express';
import { sendSuccess } from '../../../shared/http/response.js';
import { adminDashboardService } from './dashboard.service.js';

export const adminDashboardController = {
  async getSummary(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const summary = await adminDashboardService.getSummary();
      sendSuccess(res, summary);
    } catch (err) {
      next(err);
    }
  },
};
