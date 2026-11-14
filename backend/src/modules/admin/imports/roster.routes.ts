import { Router } from 'express';
import { authenticate } from '../../../middleware/authenticate.js';
import { requireRole } from '../../../middleware/require-role.js';
import { rosterController, uploadRosterMiddleware } from './roster.controller.js';

export const adminRosterRouter = Router({ mergeParams: true });

adminRosterRouter.use(authenticate, requireRole('ADMIN'));

adminRosterRouter.post('/preview', uploadRosterMiddleware, rosterController.preview);
adminRosterRouter.post('/commit', rosterController.commit);
