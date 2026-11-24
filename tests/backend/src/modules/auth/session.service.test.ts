import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SessionService } from '../../../../../backend/src/modules/auth/session.service.js';
import type { SessionRepository, SessionWithUser } from '../../../../../backend/src/modules/auth/session.repository.js';
import type { UserRole, AccountStatus } from '@prisma/client';

describe('SessionService', () => {
  let mockRepo: SessionRepository;
  let service: SessionService;

  beforeEach(() => {
    mockRepo = {
      create: vi.fn(),
      findActiveByTokenHash: vi.fn(),
      updateLastSeen: vi.fn(),
      revokeByTokenHash: vi.fn(),
      revokeAllUserSessions: vi.fn(),
    } as unknown as SessionRepository;

    service = new SessionService(mockRepo);
  });

  it('generates a 64-char hex raw token and hashes it via SHA-256', () => {
    const raw = service.generateRawToken();
    expect(raw).toHaveLength(64);
    expect(raw).toMatch(/^[0-9a-f]{64}$/);

    const hash = service.hashToken(raw);
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toBe(raw);
  });

  it('creates a session with hashed token and future expiry', async () => {
    const userId = '11111111-1111-1111-1111-111111111111';
    vi.mocked(mockRepo.create).mockResolvedValue({
      id: 'session-id',
      user_id: userId,
      token_hash: 'hash',
      created_at: new Date(),
      last_seen_at: new Date(),
      expires_at: new Date(Date.now() + 10000),
      revoked_at: null,
    });

    const result = await service.createSession(userId);
    expect(result.rawToken).toHaveLength(64);
    expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(mockRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId,
        tokenHash: expect.any(String),
        expiresAt: expect.any(Date),
      })
    );
  });

  it('resolves an active session for an ACTIVE user', async () => {
    const rawToken = 'a'.repeat(64);
    const mockSession: SessionWithUser = {
      id: 'session-123',
      user_id: 'user-123',
      token_hash: service.hashToken(rawToken),
      created_at: new Date(),
      last_seen_at: new Date(),
      expires_at: new Date(Date.now() + 10000),
      revoked_at: null,
      user: {
        id: 'user-123',
        username: 'teacher_demo',
        password_hash: 'hash',
        full_name: 'Cô Nguyễn Minh Anh',
        contact: 'minhanh@test.local',
        role: 'TEACHER' as UserRole,
        status: 'ACTIVE' as AccountStatus,
        must_change_password: false,
        password_changed_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      },
    };

    vi.mocked(mockRepo.findActiveByTokenHash).mockResolvedValue(mockSession);

    const user = await service.resolveSession(rawToken);
    expect(user).not.toBeNull();
    expect(user?.id).toBe('user-123');
    expect(user?.username).toBe('teacher_demo');
    expect(user?.role).toBe('TEACHER');
    expect(user?.sessionId).toBe('session-123');
    expect(mockRepo.updateLastSeen).toHaveBeenCalledWith('session-123');
  });

  it('returns null if user status is INACTIVE even if session exists', async () => {
    const rawToken = 'b'.repeat(64);
    const mockSession: SessionWithUser = {
      id: 'session-inactive',
      user_id: 'user-inactive',
      token_hash: service.hashToken(rawToken),
      created_at: new Date(),
      last_seen_at: new Date(),
      expires_at: new Date(Date.now() + 10000),
      revoked_at: null,
      user: {
        id: 'user-inactive',
        username: 'disabled_user',
        password_hash: 'hash',
        full_name: 'Bị Khóa',
        contact: null,
        role: 'STUDENT' as UserRole,
        status: 'INACTIVE' as AccountStatus,
        must_change_password: false,
        password_changed_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      },
    };

    vi.mocked(mockRepo.findActiveByTokenHash).mockResolvedValue(mockSession);

    const user = await service.resolveSession(rawToken);
    expect(user).toBeNull();
  });

  it('returns null if session is not found or revoked/expired', async () => {
    vi.mocked(mockRepo.findActiveByTokenHash).mockResolvedValue(null);

    const user = await service.resolveSession('nonexistent-token');
    expect(user).toBeNull();
  });

  it('revokes session by raw token', async () => {
    const rawToken = 'c'.repeat(64);
    await service.revokeSession(rawToken);

    expect(mockRepo.revokeByTokenHash).toHaveBeenCalledWith(service.hashToken(rawToken));
  });

  it('revokes other sessions keeping current', async () => {
    await service.revokeOtherSessions('user-123', 'current-session-id');
    expect(mockRepo.revokeAllUserSessions).toHaveBeenCalledWith('user-123', 'current-session-id');
  });
});
