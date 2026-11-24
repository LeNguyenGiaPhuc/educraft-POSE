import { Router } from 'express';
import { authenticate } from '../../../middleware/authenticate.js';
import { requireRole } from '../../../middleware/require-role.js';
import { classroomController } from './classroom.controller.js';
import { enrollmentController } from '../enrollments/enrollment.controller.js';
import { adminRosterRouter } from '../imports/roster.routes.js';
import { rosterController, uploadRosterMiddleware } from '../imports/roster.controller.js';
import { classroomSubjectController } from '../classroom-subjects/classroom-subject.controller.js';

export const adminClassroomRouter = Router();

adminClassroomRouter.use(authenticate, requireRole('ADMIN'));

adminClassroomRouter.get('/', classroomController.list);
adminClassroomRouter.post('/roster/preview', uploadRosterMiddleware, rosterController.previewNewClassroom);
adminClassroomRouter.post('/roster/commit', rosterController.commitNewClassroom);
adminClassroomRouter.post('/', classroomController.create);
adminClassroomRouter.get('/:id', classroomController.getDetail);
adminClassroomRouter.patch('/:id', classroomController.update);
adminClassroomRouter.patch('/:id/archive', classroomController.archive);
adminClassroomRouter.post('/:id/students', enrollmentController.enroll);
adminClassroomRouter.use('/:id/roster', adminRosterRouter);

adminClassroomRouter.get(
  '/:classroomId/subjects/:subjectId/eligible-teachers',
  classroomSubjectController.listEligible
);
adminClassroomRouter.patch(
  '/:classroomId/subjects/:subjectId/assign',
  classroomSubjectController.assign
);
