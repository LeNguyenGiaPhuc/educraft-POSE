import { Router } from 'express';
import { authenticate } from '../../../middleware/authenticate.js';
import { requireRole } from '../../../middleware/require-role.js';
import { calendarController } from './calendar.controller.js';

const router = Router();

router.use(authenticate);
router.use(requireRole('TEACHER'));

router.get('/calendar-events', calendarController.list);
router.get('/calendar-events/:eventId', calendarController.getDetail);
router.post('/classroom-subjects/:classroomSubjectId/calendar-events', calendarController.create);
router.patch('/calendar-events/:eventId', calendarController.update);
router.post('/calendar-events/:eventId/publish', calendarController.publish);
router.delete('/calendar-events/:eventId', calendarController.remove);

export { router as teacherCalendarRouter };
