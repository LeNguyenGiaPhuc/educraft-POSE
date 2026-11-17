import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { BadRequestError, UnauthorizedError } from '../../../shared/errors/app-error.js';
import { sendSuccess } from '../../../shared/http/response.js';
import { materialService } from './material.service.js';
import { lessonIdParamSchema, materialIdParamSchema } from './material.schemas.js';

export const uploadMaterialMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB limit
  },
}).single('file');

export const materialController = {
  async upload(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError();
      }

      const { id: lessonId } = lessonIdParamSchema.parse(req.params);

      if (!req.file) {
        throw new BadRequestError('Vui lòng chọn file học liệu để tải lên');
      }

      const created = await materialService.uploadMaterial({
        lessonId,
        teacherId: req.user.id,
        file: {
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
          buffer: req.file.buffer,
        },
      });

      sendSuccess(res, created, undefined, 201);
    } catch (err) {
      next(err);
    }
  },

  async newVersion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError();
      }

      const { id: materialId } = materialIdParamSchema.parse(req.params);

      if (!req.file) {
        throw new BadRequestError('Vui lòng chọn file để tải lên phiên bản mới');
      }

      const version = await materialService.uploadNewVersion({
        materialId,
        teacherId: req.user.id,
        file: {
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
          buffer: req.file.buffer,
        },
      });

      sendSuccess(res, version, undefined, 201);
    } catch (err) {
      next(err);
    }
  },

  async archive(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError();
      }

      const { id: materialId } = materialIdParamSchema.parse(req.params);
      const result = await materialService.archiveMaterial(materialId, req.user.id);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  },

  async retryProcessing(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError();
      }

      const { id: materialId } = materialIdParamSchema.parse(req.params);
      const result = await materialService.retryProcessing(materialId, req.user.id);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  },

  async download(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError();
      }

      const { id: materialId } = materialIdParamSchema.parse(req.params);
      const download = await materialService.downloadMaterial(materialId, req.user.id);

      res.setHeader('Content-Type', download.mimeType);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(download.fileName)}"`
      );
      res.status(200).send(download.buffer);
    } catch (err) {
      next(err);
    }
  },
};
