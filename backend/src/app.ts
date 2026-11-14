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
import { teacherWorkspaceRouter } from './modules/teacher/workspace/workspace.routes.js';
import { teacherLessonRouter } from './modules/teacher/lessons/lesson.routes.js';
import { teacherCalendarRouter } from './modules/teacher/calendar/calendar.routes.js';
import { teacherActivityRouter } from './modules/teacher/activities/activity.routes.js';
import { teacherNotebookCheckRouter } from './modules/teacher/notebook-checks/notebook-check.routes.js';

export function createApp(): Express {
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
  app.use('/api/v1/teacher', teacherWorkspaceRouter);
  app.use('/api/v1/teacher', teacherLessonRouter);
  app.use('/api/v1/teacher', teacherCalendarRouter);
  app.use('/api/v1/teacher', teacherActivityRouter);
  app.use('/api/v1/teacher', teacherNotebookCheckRouter);

  // 6. 404 & Centralized error handler
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
