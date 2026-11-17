import { Router } from 'express';
import { authenticate } from '../../../middleware/authenticate.js';
import { requireRole } from '../../../middleware/require-role.js';
import { activityController } from './activity.controller.js';

const router = Router();

router.use(authenticate);
router.use(requireRole('TEACHER'));

// Classroom-subject scoped activities
router.get('/classroom-subjects/:classroomSubjectId/activities', activityController.list);
router.post('/classroom-subjects/:classroomSubjectId/exercise-drafts', activityController.exerciseDraft);
router.post('/classroom-subjects/:classroomSubjectId/exercise-activities/publish', activityController.publishExerciseActivity);

// Individual activity endpoints
router.get('/activities/:activityId', activityController.getDetail);
router.patch('/activities/:activityId', activityController.update);
router.put('/activities/:activityId/exercise-content', activityController.updateExerciseContent);
router.delete('/activities/:activityId', activityController.delete);
router.post('/activities/:activityId/ai-draft', activityController.aiDraft);
router.put('/activities/:activityId/questions', activityController.putQuestions);
router.post('/activities/:activityId/publish', activityController.publish);
router.post('/activities/:activityId/close', activityController.close);
router.post('/activities/:activityId/reopen', activityController.reopen);
router.get('/activities/:activityId/submissions', activityController.getSubmissions);

export { router as teacherActivityRouter };
