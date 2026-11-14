import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../src/lib/prisma.js';
import { SessionRepository } from '../../src/modules/auth/session.repository.js';

describe('AuthSession Repository (real PostgreSQL)', () => {
  const repository = new SessionRepository();
  const username = `integration_${randomUUID()}`;
  let userId: string;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        username,
        password_hash: 'integration-test-hash',
        full_name: 'Integration Test User',
        role: 'TEACHER',
        status: 'ACTIVE',
      },
    });
    userId = user.id;
  });

  afterAll(async () => {
    if (userId) {
      await prisma.authSession.deleteMany({ where: { user_id: userId } });
      await prisma.user.delete({ where: { id: userId } });
    }
    await prisma.$disconnect();
  });

  it('creates, resolves, and revokes a persisted session', async () => {
    const tokenHash = randomUUID().replaceAll('-', '').padEnd(64, '0');
    const created = await repository.create({
      userId,
      tokenHash,
      expiresAt: new Date(Date.now() + 60_000),
    });

    expect(created.user_id).toBe(userId);
    expect((await repository.findActiveByTokenHash(tokenHash))?.user.username).toBe(username);

    await repository.revokeByTokenHash(tokenHash);
    expect(await repository.findActiveByTokenHash(tokenHash)).toBeNull();
  });

  it('does not resolve an expired session', async () => {
    const tokenHash = randomUUID().replaceAll('-', '').padEnd(64, '1');
    await repository.create({
      userId,
      tokenHash,
      expiresAt: new Date(Date.now() - 1_000),
    });

    expect(await repository.findActiveByTokenHash(tokenHash)).toBeNull();
  });

  it('enforces unique token hashes in PostgreSQL', async () => {
    const tokenHash = randomUUID().replaceAll('-', '').padEnd(64, '2');
    const expiresAt = new Date(Date.now() + 60_000);
    await repository.create({ userId, tokenHash, expiresAt });

    await expect(repository.create({ userId, tokenHash, expiresAt })).rejects.toMatchObject({
      code: 'P2002',
    } satisfies Partial<Prisma.PrismaClientKnownRequestError>);
  });
});
