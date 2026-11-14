import type { AuthSession, User } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';

export interface CreateSessionParams {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface SessionWithUser extends AuthSession {
  user: User;
}

export class SessionRepository {
  async create(data: CreateSessionParams): Promise<AuthSession> {
    return prisma.authSession.create({
      data: {
        user_id: data.userId,
        token_hash: data.tokenHash,
        expires_at: data.expiresAt,
      },
    });
  }

  async findActiveByTokenHash(tokenHash: string): Promise<SessionWithUser | null> {
    return prisma.authSession.findFirst({
      where: {
        token_hash: tokenHash,
        revoked_at: null,
        expires_at: {
          gt: new Date(),
        },
      },
      include: {
        user: true,
      },
    });
  }

  async updateLastSeen(sessionId: string): Promise<void> {
    try {
      await prisma.authSession.update({
        where: { id: sessionId },
        data: { last_seen_at: new Date() },
      });
    } catch {
      // Ignore if session was removed in a race condition
    }
  }

  async revokeByTokenHash(tokenHash: string): Promise<void> {
    await prisma.authSession.updateMany({
      where: {
        token_hash: tokenHash,
        revoked_at: null,
      },
      data: {
        revoked_at: new Date(),
      },
    });
  }

  async revokeAllUserSessions(userId: string, exceptSessionId?: string): Promise<void> {
    await prisma.authSession.updateMany({
      where: {
        user_id: userId,
        revoked_at: null,
        ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}),
      },
      data: {
        revoked_at: new Date(),
      },
    });
  }
}

export const sessionRepository = new SessionRepository();
