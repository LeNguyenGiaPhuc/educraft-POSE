import type { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '../../../shared/errors/app-error.js';
import { sendSuccess } from '../../../shared/http/response.js';
import {
  calendarQuerySchema,
  createCalendarEventSchema,
  updateCalendarEventSchema,
  eventIdParamSchema,
  classroomSubjectIdParamSchema,
} from './calendar.schemas.js';
import { calendarService } from './calendar.service.js';

export const calendarController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const query = calendarQuerySchema.parse(req.query);
      const events = await calendarService.listCalendarEvents(req.user.id, query);
      sendSuccess(res, events);
    } catch (err) {
      next(err);
    }
  },

  async getDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { eventId } = eventIdParamSchema.parse(req.params);
      const event = await calendarService.getCalendarEventDetail(req.user.id, eventId);
      sendSuccess(res, event);
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { classroomSubjectId } = classroomSubjectIdParamSchema.parse(req.params);
      const data = createCalendarEventSchema.parse(req.body);
      const event = await calendarService.createCalendarEvent(req.user.id, classroomSubjectId, data);
      sendSuccess(res, event, undefined, 201);
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { eventId } = eventIdParamSchema.parse(req.params);
      const data = updateCalendarEventSchema.parse(req.body);
      const event = await calendarService.updateCalendarEvent(req.user.id, eventId, data);
      sendSuccess(res, event);
    } catch (err) {
      next(err);
    }
  },

  async publish(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { eventId } = eventIdParamSchema.parse(req.params);
      const event = await calendarService.publishCalendarEvent(req.user.id, eventId);
      sendSuccess(res, event);
    } catch (err) {
      next(err);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { eventId } = eventIdParamSchema.parse(req.params);
      const result = await calendarService.deleteCalendarEvent(req.user.id, eventId);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  },
};
