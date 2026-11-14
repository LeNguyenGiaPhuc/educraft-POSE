import { Router } from 'express';
import { subjectController } from './subject.controller.js';
import { authenticate } from '../../../middleware/authenticate.js';
import { requireRole } from '../../../middleware/require-role.js';

export const adminSubjectRouter = Router();

// Invariant: All admin subject catalog routes require authentication and ADMIN role
adminSubjectRouter.use(authenticate, requireRole('ADMIN'));

adminSubjectRouter.get('/', (req, res, next) => subjectController.list(req, res, next));
adminSubjectRouter.post('/', (req, res, next) => subjectController.create(req, res, next));
adminSubjectRouter.get('/:id', (req, res, next) => subjectController.getById(req, res, next));
adminSubjectRouter.patch('/:id', (req, res, next) => subjectController.update(req, res, next));
adminSubjectRouter.patch('/:id/status', (req, res, next) => subjectController.updateStatus(req, res, next));
