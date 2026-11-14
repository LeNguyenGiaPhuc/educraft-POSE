import crypto from 'node:crypto';
import type { UserRole, AccountStatus } from '@prisma/client';
import { env } from '../../config/env.js';
import { sessionRepository, type SessionRepository } from './session.repository.js';

export interface AuthenticatedUser {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  status: AccountStatus;
  contact: string | null;
  mustChangePassword: boolean;
  sessionId: string;
}

export class SessionService {
  constructor(private repo: SessionRepository = sessionRepository) {}

  generateRawToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  hashToken(rawToken: string): string {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
  }

  async createSession(userId: string): Promise<{ rawToken: string; expiresAt: Date }> {
    const rawToken = this.generateRawToken();
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + env.sessionMaxAgeMs);

    await this.repo.create({
      userId,
      tokenHash,
      expiresAt,
    });

    return { rawToken, expiresAt };
  }

  async resolveSession(rawToken: string): Promise<AuthenticatedUser | null> {
    if (!rawToken || typeof rawToken !== 'string') {
      return null;
    }

    const tokenHash = this.hashToken(rawToken);
    const session = await this.repo.findActiveByTokenHash(tokenHash);

    if (!session) {
      return null;
    }

    // Invariant: User must be ACTIVE
    if (session.user.status !== 'ACTIVE') {
      return null;
    }

    // Update last_seen_at asynchronously
    void this.repo.updateLastSeen(session.id);

    return {
      id: session.user.id,
      username: session.user.username,
      fullName: session.user.full_name,
      role: session.user.role,
      status: session.user.status,
      contact: session.user.contact,
      mustChangePassword: session.user.must_change_password,
      sessionId: session.id,
    };
  }

  async revokeSession(rawToken: string): Promise<void> {
    if (!rawToken || typeof rawToken !== 'string') {
      return;
    }
    const tokenHash = this.hashToken(rawToken);
    await this.repo.revokeByTokenHash(tokenHash);
  }

  async revokeOtherSessions(userId: string, keepSessionId?: string): Promise<void> {
    await this.repo.revokeAllUserSessions(userId, keepSessionId);
  }

  async revokeAllUserSessions(userId: string): Promise<void> {
    await this.repo.revokeAllUserSessions(userId);
  }
}

export const sessionService = new SessionService();
