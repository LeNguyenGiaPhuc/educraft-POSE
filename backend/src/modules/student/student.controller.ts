import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { BadRequestError, UnauthorizedError } from '../../shared/errors/app-error.js';
import { sendSuccess } from '../../shared/http/response.js';
import { validateMaterialFile } from '../storage/file-validation.js';
import { studentService } from './student.service.js';

function studentId(req: Request) {
  if (req.user?.role !== 'STUDENT') throw new UnauthorizedError();
  return req.user.id;
}

async function handle<T>(res: Response, next: NextFunction, action: () => Promise<T>) {
  try { sendSuccess(res, await action()); } catch (error) { next(error); }
}

export const studentController = {
  workspace: (req: Request, res: Response, next: NextFunction) => handle(res, next, () => studentService.getWorkspace(studentId(req))),
  activities: (req: Request, res: Response, next: NextFunction) => handle(res, next, () => studentService.listActivities(studentId(req))),
  results: (req: Request, res: Response, next: NextFunction) => handle(res, next, () => studentService.listResults(studentId(req))),
  profile: (req: Request, res: Response, next: NextFunction) => handle(res, next, () => studentService.getProfile(studentId(req))),
  calendar: (req: Request, res: Response, next: NextFunction) => handle(res, next, () => studentService.getCalendar(studentId(req))),
  conversations: (req: Request, res: Response, next: NextFunction) => handle(res, next, () => studentService.listConversations(studentId(req))),
  lesson: (req: Request, res: Response, next: NextFunction) => handle(res, next, () => studentService.getLesson(studentId(req), z.string().uuid().parse(req.params.lessonId))),
  markNotification: (req: Request, res: Response, next: NextFunction) => handle(res, next, async () => {
    const input = z.object({ read: z.boolean() }).parse(req.body);
    return studentService.markNotificationRead(studentId(req), z.string().uuid().parse(req.params.notificationId), input.read);
  }),
  submitExercise: (req: Request, res: Response, next: NextFunction) => handle(res, next, async () => {
    const input = z.object({
      answers: z.array(z.object({ questionId: z.string().uuid(), answer: z.string().max(10_000) })).min(1).max(20),
    }).parse(req.body);
    return studentService.submitExercise(studentId(req), z.string().uuid().parse(req.params.activityId), input);
  }),
  saveNotebookImages: (req: Request, res: Response, next: NextFunction) => handle(res, next, async () => {
    const files = Array.isArray(req.files) ? req.files : [];
    const validFiles = files.map((file) => {
      const candidate = { originalname: file.originalname, mimetype: file.mimetype, size: file.size, buffer: file.buffer };
      const validation = validateMaterialFile(candidate);
      if (!validation.isValid || !['image/jpeg', 'image/png'].includes(file.mimetype)) throw new BadRequestError(validation.error ?? 'Chỉ chấp nhận ảnh JPEG hoặc PNG hợp lệ');
      return candidate;
    });
    const mode = z.enum(['append', 'replace']).parse(req.body.mode ?? 'replace');
    return studentService.saveNotebookImages(studentId(req), z.string().uuid().parse(req.params.activityId), validFiles, mode);
  }),
  deleteNotebookSubmission: (req: Request, res: Response, next: NextFunction) => handle(res, next, () => studentService.deleteNotebookSubmission(studentId(req), z.string().uuid().parse(req.params.submissionId))),
  notebookFile: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const file = await studentService.getNotebookFile(studentId(req), z.string().uuid().parse(req.params.submissionId), z.string().uuid().parse(req.params.fileId));
      res.setHeader('Content-Type', file.mimeType);
      res.setHeader('Cache-Control', 'private, no-store');
      res.send(file.buffer);
    } catch (error) { next(error); }
  },
  createConversation: (req: Request, res: Response, next: NextFunction) => handle(res, next, async () => {
    const input = z.object({ classroomId: z.string().uuid() }).parse(req.body);
    return studentService.createConversation(studentId(req), input.classroomId);
  }),
  sendChatTurn: (req: Request, res: Response, next: NextFunction) => handle(res, next, async () => {
    const input = z.object({ question: z.string().trim().min(1).max(2000), classroomSubjectId: z.string().uuid().optional() }).parse(req.body);
    return studentService.sendChatTurn(studentId(req), z.string().uuid().parse(req.params.conversationId), input);
  }),
  createPracticeSession: (req: Request, res: Response, next: NextFunction) => handle(res, next, async () => {
    const input = z.object({
      classroomSubjectId: z.string().uuid(),
      lessonIds: z.array(z.string().uuid()).min(1).max(20),
      exerciseType: z.enum(['QUIZ', 'WRITTEN']),
      difficulty: z.enum(['BASIC', 'INTERMEDIATE', 'ADVANCED']),
      questionCount: z.number().int().min(1).max(20),
    }).parse(req.body);
    return studentService.createPracticeSession(studentId(req), input);
  }),
  submitPracticeSession: (req: Request, res: Response, next: NextFunction) => handle(res, next, async () => {
    const input = z.object({
      answers: z.array(z.object({ questionId: z.string().uuid(), answer: z.string().max(10_000) })).min(1).max(20),
    }).parse(req.body);
    return studentService.submitPracticeSession(studentId(req), z.string().uuid().parse(req.params.sessionId), input);
  }),
};
