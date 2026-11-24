import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { BadRequestError, UnauthorizedError } from '../../../shared/errors/app-error.js';
import { sendSuccess } from '../../../shared/http/response.js';
import { rosterService } from './roster.service.js';
import {
  classroomIdParamSchema,
  commitNewClassroomRosterSchema,
  commitRosterSchema,
} from './roster.schemas.js';

export const uploadRosterMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
}).single('file');

export const rosterController = {
  async previewNewClassroom(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        throw new BadRequestError('Vui lòng tải lên file Excel (.xlsx)');
      }
      if (!req.file.originalname.toLowerCase().endsWith('.xlsx')) {
        throw new BadRequestError(
          'Định dạng file không hợp lệ. Hệ thống chỉ chấp nhận file Excel (.xlsx)'
        );
      }
      if (!req.user) {
        throw new UnauthorizedError();
      }

      const result = await rosterService.previewNewRoster({
        adminId: req.user.id,
        fileBuffer: req.file.buffer,
      });
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  },

  async preview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id: classroomId } = classroomIdParamSchema.parse(req.params);

      if (!req.file) {
        throw new BadRequestError('Vui lòng tải lên file Excel (.xlsx)');
      }

      if (!req.file.originalname.toLowerCase().endsWith('.xlsx')) {
        throw new BadRequestError('Định dạng file không hợp lệ. Hệ thống chỉ chấp nhận file Excel (.xlsx)');
      }

      if (!req.user) {
        throw new UnauthorizedError();
      }

      const adminId = req.user.id;
      const result = await rosterService.previewRoster({
        adminId,
        classroomId,
        fileBuffer: req.file.buffer,
      });

      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  },

  async commit(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id: classroomId } = classroomIdParamSchema.parse(req.params);
      const data = commitRosterSchema.parse(req.body);

      if (!req.user) {
        throw new UnauthorizedError();
      }

      const adminId = req.user.id;
      const result = await rosterService.commitRoster({
        adminId,
        classroomId,
        validationToken: data.validationToken,
        defaultPassword: data.defaultPassword,
        rows: data.rows,
      });

      sendSuccess(res, result, undefined, 201);
    } catch (err) {
      next(err);
    }
  },

  async commitNewClassroom(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = commitNewClassroomRosterSchema.parse(req.body);
      if (!req.user) {
        throw new UnauthorizedError();
      }

      const result = await rosterService.commitNewClassroom({
        adminId: req.user.id,
        ...data,
      });
      sendSuccess(res, result, undefined, 201);
    } catch (err) {
      next(err);
    }
  },
};
