import { Router } from 'express';
import { accountController } from './account.controller.js';
import { authenticate } from '../../../middleware/authenticate.js';
import { requireRole } from '../../../middleware/require-role.js';

export const adminAccountRouter = Router();

// Invariant: All admin account routes require authentication and ADMIN role
adminAccountRouter.use(authenticate, requireRole('ADMIN'));

adminAccountRouter.get('/', (req, res, next) => accountController.list(req, res, next));
adminAccountRouter.post('/', (req, res, next) => accountController.create(req, res, next));
adminAccountRouter.get('/:id', (req, res, next) => accountController.getById(req, res, next));
adminAccountRouter.patch('/:id', (req, res, next) => accountController.update(req, res, next));
adminAccountRouter.patch('/:id/status', (req, res, next) => accountController.updateStatus(req, res, next));
adminAccountRouter.patch('/:id/password', (req, res, next) => accountController.resetPassword(req, res, next));
