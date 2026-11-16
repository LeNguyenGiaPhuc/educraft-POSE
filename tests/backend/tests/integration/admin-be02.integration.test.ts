import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { prisma } from '../../../../backend/src/lib/prisma.js';
import { accountService } from '../../../../backend/src/modules/admin/accounts/account.service.js';
import { accountRepository } from '../../../../backend/src/modules/admin/accounts/account.repository.js';
import { subjectService } from '../../../../backend/src/modules/admin/subjects/subject.service.js';

describe('BE-02 admin persistence (real PostgreSQL)', () => {
  const marker = randomUUID().slice(0, 8);
  const userIds: string[] = [];
  const subjectIds: string[] = [];
  const classroomIds: string[] = [];

  afterAll(async () => {
    await prisma.authSession.deleteMany({ where: { user_id: { in: userIds } } });
    await prisma.teacherProfile.deleteMany({ where: { teacher_id: { in: userIds } } });
    await prisma.classroomSubject.deleteMany({ where: { subject_id: { in: subjectIds } } });
    await prisma.classroom.deleteMany({ where: { id: { in: classroomIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.subject.deleteMany({ where: { id: { in: subjectIds } } });
    await prisma.$disconnect();
  });

  it('creates a teacher and profile together', async () => {
    const subject = await prisma.subject.create({ data: { name: `Teacher subject ${marker}` } });
    subjectIds.push(subject.id);
    const created = await accountService.createAccount({
      role: 'TEACHER', username: `teacher_${marker}`, fullName: 'Test Teacher',
      password: 'Password123', qualification: 'Degree', specializedSubjectId: subject.id,
    });
    userIds.push(created.id);
    const profile = await prisma.teacherProfile.findUnique({ where: { teacher_id: created.id } });
    expect(profile?.specialized_subject_id).toBe(subject.id);
    expect(created.role).toBe('TEACHER');
  });

  it('rolls back teacher creation if profile insertion fails', async () => {
    const username = `bad_teacher_${marker}`;
    await expect(accountRepository.createTeacher({
      username, fullName: 'Bad Teacher', passwordHash: 'hash', qualification: 'Degree',
      specializedSubjectId: randomUUID(),
    })).rejects.toThrow();
    expect(await prisma.user.findUnique({ where: { username } })).toBeNull();
  });

  it('rolls back password reset and deactivation when session revocation fails', async () => {
    const user = await prisma.user.create({ data: {
      username: `reset_${marker}`, password_hash: 'old-hash', full_name: 'Reset User', role: 'STUDENT',
    } });
    userIds.push(user.id);
    const tokenHash = `failreset${marker}`.padEnd(64, '0');
    await prisma.authSession.create({ data: {
      user_id: user.id, token_hash: tokenHash, expires_at: new Date(Date.now() + 60_000),
    } });
    await prisma.$executeRawUnsafe(`CREATE FUNCTION integration_test.fail_be02_revoke() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF OLD.token_hash LIKE 'failreset%' THEN RAISE EXCEPTION 'forced revoke failure'; END IF; RETURN NEW; END $$`);
    await prisma.$executeRawUnsafe('CREATE TRIGGER fail_be02_revoke BEFORE UPDATE ON auth_sessions FOR EACH ROW EXECUTE FUNCTION integration_test.fail_be02_revoke()');
    try {
      await expect(accountService.resetPassword(user.id, { password: 'NewPassword123' })).rejects.toThrow();
      const after = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
      const session = await prisma.authSession.findUniqueOrThrow({ where: { token_hash: tokenHash } });
      expect(after.password_hash).toBe('old-hash');
      expect(session.revoked_at).toBeNull();
      await expect(accountService.updateStatus(user.id, { status: 'INACTIVE' })).rejects.toThrow();
      expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).status).toBe('ACTIVE');
    } finally {
      await prisma.$executeRawUnsafe('DROP TRIGGER fail_be02_revoke ON auth_sessions');
      await prisma.$executeRawUnsafe('DROP FUNCTION integration_test.fail_be02_revoke()');
    }
    await accountService.resetPassword(user.id, { password: 'NewPassword123' });
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).password_hash).not.toBe('old-hash');
    expect((await prisma.authSession.findUniqueOrThrow({ where: { token_hash: tokenHash } })).revoked_at).not.toBeNull();
  });

  it('creates subject assignments for active classrooms only', async () => {
    const active = await prisma.classroom.create({ data: { name: `Active ${marker}`, grade_level: 10, academic_year: '2026-2027', status: 'ACTIVE' } });
    const archived = await prisma.classroom.create({ data: { name: `Archived ${marker}`, grade_level: 10, academic_year: '2026-2027', status: 'ARCHIVED' } });
    classroomIds.push(active.id, archived.id);
    const created = await subjectService.createSubject({ name: `Sync ${marker}` });
    subjectIds.push(created.id);
    const links = await prisma.classroomSubject.findMany({ where: { subject_id: created.id } });
    expect(links.map((link) => link.classroom_id)).toEqual([active.id]);
    expect(links[0]?.teacher_id).toBeNull();
  });

  it('enforces case insensitive username and subject names in PostgreSQL', async () => {
    const username = `unique_${marker}`;
    const user = await prisma.user.create({ data: { username, password_hash: 'hash', full_name: 'Unique User', role: 'STUDENT' } });
    userIds.push(user.id);
    await expect(prisma.user.create({ data: { username: username.toUpperCase(), password_hash: 'hash', full_name: 'Duplicate', role: 'STUDENT' } })).rejects.toMatchObject({ code: 'P2002' });

    const name = `Toán ${marker}`;
    const subject = await prisma.subject.create({ data: { name } });
    subjectIds.push(subject.id);
    await expect(prisma.subject.create({ data: { name: name.toUpperCase() } })).rejects.toMatchObject({ code: 'P2002' });
  });
});
