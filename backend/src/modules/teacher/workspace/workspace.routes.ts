import { Router } from 'express';
import { authenticate } from '../../../middleware/authenticate.js';
import { requireRole } from '../../../middleware/require-role.js';
import { workspaceController } from './workspace.controller.js';

export const teacherWorkspaceRouter = Router();

teacherWorkspaceRouter.use(authenticate, requireRole('TEACHER'));

teacherWorkspaceRouter.get('/classrooms', workspaceController.listClassrooms);
teacherWorkspaceRouter.get('/classrooms/:id', workspaceController.getClassroomDetail);
teacherWorkspaceRouter.get('/classroom-subjects/:id', workspaceController.getClassroomSubjectContext);
teacherWorkspaceRouter.get('/classroom-subjects/:id/students', workspaceController.getClassroomSubjectStudents);
