import { Router } from 'express';
import { authenticate } from '../../../middleware/authenticate.js';
import { requireRole } from '../../../middleware/require-role.js';
import { resultsController } from './results.controller.js';

const router = Router();

router.use(authenticate);
router.use(requireRole('TEACHER'));

router.get(
  '/classroom-subjects/:classroomSubjectId/submissions',
  resultsController.listSubmissions
);
router.get('/exercise-submissions/:submissionId/result', resultsController.getExerciseResult);
router.get('/notebook-submissions/:submissionId/result', resultsController.getNotebookResult);
router.get(
  '/classroom-subjects/:classroomSubjectId/statistics',
  resultsController.getStatistics
);
router.get(
  '/classroom-subjects/:classroomSubjectId/students/:studentId/progress',
  resultsController.getStudentProgress
);
router.get(
  '/classroom-subjects/:classroomSubjectId/prompt-topics',
  resultsController.getPromptTopics
);

export { router as teacherResultsRouter };
