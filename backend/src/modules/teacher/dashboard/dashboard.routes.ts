import { Router } from 'express';
import { authenticate } from '../../../middleware/authenticate.js';
import { requireRole } from '../../../middleware/require-role.js';
import { teacherDashboardController } from './dashboard.controller.js';

export const teacherDashboardRouter = Router();

teacherDashboardRouter.use(authenticate, requireRole('TEACHER'));
teacherDashboardRouter.get('/', (req, res, next) => teacherDashboardController.getSummary(req, res, next));
