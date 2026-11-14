import type { NextFunction, Request, Response } from 'express';
import { sendSuccess } from '../../../shared/http/response.js';
import { classroomSubjectService } from './classroom-subject.service.js';
import { classroomSubjectParamsSchema, assignTeacherSchema } from './classroom-subject.schemas.js';

export const classroomSubjectController = {
  async listEligible(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { classroomId, subjectId } = classroomSubjectParamsSchema.parse(req.params);
      const teachers = await classroomSubjectService.listEligibleTeachers(classroomId, subjectId);
      sendSuccess(res, teachers);
    } catch (err) {
      next(err);
    }
  },

  async assign(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { classroomId, subjectId } = classroomSubjectParamsSchema.parse(req.params);
      const data = assignTeacherSchema.parse(req.body);
      const updated = await classroomSubjectService.assignTeacher(classroomId, subjectId, data);
      sendSuccess(res, updated);
    } catch (err) {
      next(err);
    }
  },
};
