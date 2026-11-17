import { Router } from 'express';
import { authenticate } from '../../../middleware/authenticate.js';
import { requireRole } from '../../../middleware/require-role.js';
import { adminDashboardController } from './dashboard.controller.js';

export const adminDashboardRouter = Router();

adminDashboardRouter.use(authenticate, requireRole('ADMIN'));
adminDashboardRouter.get('/', (req, res, next) => adminDashboardController.getSummary(req, res, next));
