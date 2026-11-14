import { Router } from 'express';
import { authenticate } from '../../../middleware/authenticate.js';
import { requireRole } from '../../../middleware/require-role.js';
import {
  notebookCheckController,
  uploadReferenceFileMiddleware,
} from './notebook-check.controller.js';

const router = Router();

router.use(authenticate);
router.use(requireRole('TEACHER'));

// Classroom-subject scoped notebook checks
router.get(
  '/classroom-subjects/:classroomSubjectId/notebook-checks',
  notebookCheckController.list
);
router.post(
  '/classroom-subjects/:classroomSubjectId/notebook-checks',
  notebookCheckController.create
);

// Individual notebook check endpoints
router.get('/notebook-checks/:activityId', notebookCheckController.getDetail);
router.patch('/notebook-checks/:activityId', notebookCheckController.update);
router.delete('/notebook-checks/:activityId', notebookCheckController.delete);
router.post(
  '/notebook-checks/:activityId/reference-files',
  uploadReferenceFileMiddleware,
  notebookCheckController.uploadReferenceFile
);
router.delete(
  '/notebook-checks/:activityId/reference-files/:fileId',
  notebookCheckController.deleteReferenceFile
);
router.get(
  '/notebook-checks/:activityId/reference-files/:fileId/download',
  notebookCheckController.downloadReferenceFile
);
router.put('/notebook-checks/:activityId/criteria', notebookCheckController.putCriteria);
router.post('/notebook-checks/:activityId/publish', notebookCheckController.publish);

// Periods and review queue
router.post('/notebook-checks/:activityId/periods', notebookCheckController.createPeriod);
router.post('/notebook-periods/:periodId/close', notebookCheckController.closePeriod);
router.get('/notebook-checks/:activityId/periods', notebookCheckController.listPeriods);
router.get(
  '/notebook-periods/:periodId/submissions',
  notebookCheckController.listSubmissions
);
router.get(
  '/notebook-submissions/:submissionId/review',
  notebookCheckController.getReview
);
router.get(
  '/notebook-submissions/:submissionId/files/:fileId/download',
  notebookCheckController.downloadSubmissionFile
);

// Provisional AI analysis
router.post(
  '/notebook-submissions/:submissionId/analysis',
  notebookCheckController.analyze
);
router.post(
  '/notebook-submissions/:submissionId/analysis/retry',
  notebookCheckController.analyze
);
router.get(
  '/notebook-submissions/:submissionId/analysis',
  notebookCheckController.getAnalysis
);

// Finalization
router.post(
  '/notebook-submissions/:submissionId/finalize',
  notebookCheckController.finalize
);
router.get(
  '/notebook-submissions/:submissionId/assessment',
  notebookCheckController.getAssessment
);

export { router as teacherNotebookCheckRouter };
