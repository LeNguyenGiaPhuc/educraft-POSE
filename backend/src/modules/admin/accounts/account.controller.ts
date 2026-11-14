import type { Request, Response, NextFunction } from 'express';
import { accountService } from './account.service.js';
import {
  createAccountSchema,
  updateAccountSchema,
  updateAccountStatusSchema,
  resetAccountPasswordSchema,
  accountIdSchema,
  listAccountsQuerySchema,
} from './account.schemas.js';
import { parsePaginationParams } from '../../../shared/pagination/pagination.util.js';
import { sendSuccess } from '../../../shared/http/response.js';

export class AccountController {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = listAccountsQuerySchema.parse(req.query);
      const pagination = parsePaginationParams(query);
      const { role, status } = query;

      const result = await accountService.listAccounts({
        ...pagination,
        role,
        status,
      });

      sendSuccess(res, result.data, result.meta);
    } catch (err) {
      next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = accountIdSchema.parse(req.params.id);
      const account = await accountService.getAccountById(id);
      sendSuccess(res, account);
    } catch (err) {
      next(err);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = createAccountSchema.parse(req.body);
      const account = await accountService.createAccount(validated);
      sendSuccess(res, account, undefined, 201);
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = accountIdSchema.parse(req.params.id);
      const validated = updateAccountSchema.parse(req.body);
      const account = await accountService.updateAccount(id, validated);
      sendSuccess(res, account);
    } catch (err) {
      next(err);
    }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = accountIdSchema.parse(req.params.id);
      const validated = updateAccountStatusSchema.parse(req.body);
      const account = await accountService.updateStatus(id, validated);
      sendSuccess(res, account);
    } catch (err) {
      next(err);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = accountIdSchema.parse(req.params.id);
      const validated = resetAccountPasswordSchema.parse(req.body);
      const result = await accountService.resetPassword(id, validated);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }
}

export const accountController = new AccountController();
