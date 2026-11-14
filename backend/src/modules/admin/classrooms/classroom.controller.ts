import type { NextFunction, Request, Response } from 'express';
import { parsePaginationParams, createPaginationMeta } from '../../../shared/pagination/pagination.util.js';
import { sendSuccess } from '../../../shared/http/response.js';
import { classroomService } from './classroom.service.js';
import {
  listClassroomsQuerySchema,
  createClassroomSchema,
  updateClassroomSchema,
  classroomIdParamSchema,
} from './classroom.schemas.js';

export const classroomController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = listClassroomsQuerySchema.parse(req.query);
      const pagination = parsePaginationParams(req.query);

      const gradeLevel =
        query.gradeLevel !== undefined && !Number.isNaN(Number(query.gradeLevel))
          ? Number(query.gradeLevel)
          : undefined;

      const { items, total } = await classroomService.listClassrooms({
        ...pagination,
        status: query.status,
        gradeLevel,
        academicYear: query.academicYear,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      });

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

  async getDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = classroomIdParamSchema.parse(req.params);
      const detail = await classroomService.getClassroomDetail(id);
      sendSuccess(res, detail);
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = createClassroomSchema.parse(req.body);
      const created = await classroomService.createClassroom(data);
      sendSuccess(res, created, undefined, 201);
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = classroomIdParamSchema.parse(req.params);
      const data = updateClassroomSchema.parse(req.body);
      const updated = await classroomService.updateClassroom(id, data);
      sendSuccess(res, updated);
    } catch (err) {
      next(err);
    }
  },

  async archive(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = classroomIdParamSchema.parse(req.params);
      const archived = await classroomService.archiveClassroom(id);
      sendSuccess(res, archived);
    } catch (err) {
      next(err);
    }
  },
};
