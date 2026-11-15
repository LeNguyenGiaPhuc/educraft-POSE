import type { NextFunction, Request, Response } from 'express';
import { parsePaginationParams, createPaginationMeta } from '../../../shared/pagination/pagination.util.js';
import { sendSuccess } from '../../../shared/http/response.js';
import { enrollmentService } from './enrollment.service.js';
import {
  listUnassignedStudentsQuerySchema,
  enrollStudentSchema,
  transferStudentSchema,
  studentIdParamSchema,
  classroomIdParamSchema,
  classroomStudentParamsSchema,
} from './enrollment.schemas.js';

export const enrollmentController = {
  async listUnassigned(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      listUnassignedStudentsQuerySchema.parse(req.query);
      const pagination = parsePaginationParams(req.query);

      const { items, total } = await enrollmentService.listUnassignedStudents(pagination);
      const meta = createPaginationMeta({
        page: pagination.page,
        limit: pagination.limit,
        totalItems: total,
      });

      sendSuccess(res, items, meta);
    } catch (err) {
      next(err);
    }
  },

  async enroll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id: classroomId } = classroomIdParamSchema.parse(req.params);
      const data = enrollStudentSchema.parse(req.body);

      const result = await enrollmentService.enrollStudent(classroomId, data);
      sendSuccess(res, result, undefined, 201);
    } catch (err) {
      next(err);
    }
  },

  async transfer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id: studentId } = studentIdParamSchema.parse(req.params);
      const data = transferStudentSchema.parse(req.body);

      const result = await enrollmentService.transferStudent(studentId, data);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id: classroomId, studentId } = classroomStudentParamsSchema.parse(req.params);
      const result = await enrollmentService.removeStudent(classroomId, studentId);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  },
};
