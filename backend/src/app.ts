import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { requestIdMiddleware } from './middleware/request-id.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { sendSuccess } from './shared/http/response.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { adminAccountRouter } from './modules/admin/accounts/account.routes.js';
import { adminSubjectRouter } from './modules/admin/subjects/subject.routes.js';
import { adminClassroomRouter } from './modules/admin/classrooms/classroom.routes.js';
import { adminEnrollmentRouter } from './modules/admin/enrollments/enrollment.routes.js';
import { adminDashboardRouter } from './modules/admin/dashboard/dashboard.routes.js';
import { teacherDashboardRouter } from './modules/teacher/dashboard/dashboard.routes.js';
import { teacherWorkspaceRouter } from './modules/teacher/workspace/workspace.routes.js';
import { teacherLessonRouter } from './modules/teacher/lessons/lesson.routes.js';
import { teacherCalendarRouter } from './modules/teacher/calendar/calendar.routes.js';
import { teacherActivityRouter } from './modules/teacher/activities/activity.routes.js';
import { teacherNotebookCheckRouter } from './modules/teacher/notebook-checks/notebook-check.routes.js';
import { teacherResultsRouter } from './modules/teacher/results/results.routes.js';
import {
  DefaultNotebookAiAnalysisProvider,
  setNotebookAiProvider,
} from './modules/teacher/notebook-checks/notebook-ai-analysis.provider.js';
import { createGeminiNotebookAiProvider } from './modules/teacher/notebook-checks/gemini-notebook-ai.provider.js';
import {
  DefaultAiProcessingProvider,
  setAiProcessingProvider,
} from './modules/teacher/materials/ai-processing.provider.js';
import { createGeminiAiProcessingProvider } from './modules/teacher/materials/gemini-ai-processing.provider.js';
import { DefaultActivityAiDraftProvider, setAiDraftProvider } from './modules/teacher/activities/activity-ai-draft.provider.js';
import { createGeminiActivityAiProvider } from './modules/teacher/activities/gemini-activity-ai.provider.js';

function configureNotebookAiProvider(): void {
  if (env.AI_PROVIDER !== 'gemini') {
    setNotebookAiProvider(new DefaultNotebookAiAnalysisProvider());
    return;
  }

  setNotebookAiProvider(createGeminiNotebookAiProvider({
    apiKey: env.GEMINI_API_KEY,
    model: env.GEMINI_MODEL,
    timeoutMs: env.AI_TIMEOUT_MS,
    maxRetries: env.AI_MAX_RETRIES,
    maxReferenceImages: env.AI_MAX_REFERENCE_IMAGES,
    maxSubmissionImages: env.AI_MAX_SUBMISSION_IMAGES,
    maxTotalBytes: env.AI_MAX_TOTAL_BYTES,
  }));
}

function configureMaterialAiProvider(): void {
  if (env.AI_PROVIDER !== 'gemini') {
    setAiProcessingProvider(new DefaultAiProcessingProvider());
    return;
  }

  setAiProcessingProvider(createGeminiAiProcessingProvider({
    apiKey: env.GEMINI_API_KEY,
    model: env.GEMINI_MODEL,
    timeoutMs: env.AI_TIMEOUT_MS,
    maxRetries: env.AI_MAX_RETRIES,
  }));
}

function configureActivityAiProvider(): void {
  if (env.AI_PROVIDER !== 'gemini') {
    setAiDraftProvider(new DefaultActivityAiDraftProvider());
    return;
  }

  setAiDraftProvider(createGeminiActivityAiProvider({
    apiKey: env.GEMINI_API_KEY,
    model: env.GEMINI_MODEL,
    timeoutMs: env.AI_TIMEOUT_MS,
    maxRetries: env.AI_MAX_RETRIES,
    maxContextBytes: env.AI_MAX_TEXT_CONTEXT_BYTES,
  }));
}

export function createApp(): Express {
  configureNotebookAiProvider();
  configureMaterialAiProvider();
  configureActivityAiProvider();
  const app = express();

  // 1. Security & request identification
  app.use(helmet());
  app.use(requestIdMiddleware);

  // 2. Exact-origin credentialed CORS
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) {
          callback(null, true);
          return;
        }
        if (env.frontendOriginsList.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error(`Origin ${origin} is not allowed by CORS`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    })
  );

  // 3. Body parsers & cookies
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));
  app.use(cookieParser());

  // 4. Base health check route
  app.get('/api/v1/health', (_req, res) => {
    sendSuccess(res, {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
    });
  });

  // 5. Auth & Admin routes
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/admin/accounts', adminAccountRouter);
  app.use('/api/v1/admin/subjects', adminSubjectRouter);
  app.use('/api/v1/admin/classrooms', adminClassroomRouter);
  app.use('/api/v1/admin/enrollments', adminEnrollmentRouter);
  app.use('/api/v1/admin/dashboard', adminDashboardRouter);
  app.use('/api/v1/teacher/dashboard', teacherDashboardRouter);
  app.use('/api/v1/teacher', teacherWorkspaceRouter);
  app.use('/api/v1/teacher', teacherLessonRouter);
  app.use('/api/v1/teacher', teacherCalendarRouter);
  app.use('/api/v1/teacher', teacherActivityRouter);
  app.use('/api/v1/teacher', teacherNotebookCheckRouter);
  app.use('/api/v1/teacher', teacherResultsRouter);

  // 6. 404 & Centralized error handler
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
