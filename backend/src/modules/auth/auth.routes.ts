import { Router } from 'express';
import { authController } from './auth.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { loginLimiter } from './auth.limiter.js';

export const authRouter = Router();

authRouter.post('/login', loginLimiter, (req, res, next) => authController.login(req, res, next));
authRouter.post('/logout', (req, res, next) => authController.logout(req, res, next));
authRouter.get('/me', authenticate, (req, res) => authController.me(req, res));
authRouter.patch('/password', authenticate, (req, res, next) => authController.changePassword(req, res, next));
