import { Router } from 'express';
import { authenticate } from '../../../middleware/authenticate.js';
import { requireRole } from '../../../middleware/require-role.js';
import { lessonController } from './lesson.controller.js';
import { materialController, uploadMaterialMiddleware } from '../materials/material.controller.js';

export const teacherLessonRouter = Router();

teacherLessonRouter.use(authenticate, requireRole('TEACHER'));

teacherLessonRouter.get('/classroom-subjects/:id/lessons', lessonController.list);
teacherLessonRouter.post('/classroom-subjects/:id/lessons', lessonController.create);

teacherLessonRouter.get('/lessons/:id', lessonController.getDetail);
teacherLessonRouter.patch('/lessons/:id', lessonController.update);
teacherLessonRouter.post('/lessons/:id/publish', lessonController.publish);

teacherLessonRouter.post(
  '/lessons/:id/materials',
  uploadMaterialMiddleware,
  materialController.upload
);
teacherLessonRouter.post(
  '/materials/:id/versions',
  uploadMaterialMiddleware,
  materialController.newVersion
);
teacherLessonRouter.delete('/materials/:id', materialController.archive);
teacherLessonRouter.post('/materials/:id/process', materialController.retryProcessing);
teacherLessonRouter.get('/materials/:id/download', materialController.download);
