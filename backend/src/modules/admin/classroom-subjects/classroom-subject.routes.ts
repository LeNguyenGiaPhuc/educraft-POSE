import { Router } from 'express';
import { authenticate } from '../../../middleware/authenticate.js';
import { requireRole } from '../../../middleware/require-role.js';
import { classroomSubjectController } from './classroom-subject.controller.js';

export const adminClassroomSubjectRouter = Router({ mergeParams: true });

adminClassroomSubjectRouter.use(authenticate, requireRole('ADMIN'));

adminClassroomSubjectRouter.get(
  '/:classroomId/subjects/:subjectId/eligible-teachers',
  classroomSubjectController.listEligible
);
adminClassroomSubjectRouter.patch(
  '/:classroomId/subjects/:subjectId/assign',
  classroomSubjectController.assign
);
