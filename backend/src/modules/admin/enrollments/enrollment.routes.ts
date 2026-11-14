import { Router } from 'express';
import { authenticate } from '../../../middleware/authenticate.js';
import { requireRole } from '../../../middleware/require-role.js';
import { enrollmentController } from './enrollment.controller.js';

export const adminEnrollmentRouter = Router();

adminEnrollmentRouter.use(authenticate, requireRole('ADMIN'));

adminEnrollmentRouter.get('/unassigned-students', enrollmentController.listUnassigned);
adminEnrollmentRouter.post('/students/:id/transfer', enrollmentController.transfer);
