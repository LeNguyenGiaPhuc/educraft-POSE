import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../../backend/src/app.js';
import { sessionService } from '../../../../backend/src/modules/auth/session.service.js';
import { adminDashboardService } from '../../../../backend/src/modules/admin/dashboard/dashboard.service.js';
import { teacherDashboardService } from '../../../../backend/src/modules/teacher/dashboard/dashboard.service.js';

describe('Admin and Teacher dashboard API', () => {
  const app = createApp();

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('requires an authenticated admin for the admin dashboard', async () => {
    const response = await request(app).get('/api/v1/admin/dashboard');
    expect(response.status).toBe(401);
  });

  it('returns the admin dashboard summary', async () => {
    vi.spyOn(sessionService, 'resolveSession').mockResolvedValue({
      id: 'admin-1',
      username: 'admin',
      fullName: 'Admin',
      role: 'ADMIN',
      status: 'ACTIVE',
      contact: null,
      mustChangePassword: false,
      sessionId: 'session-admin',
    });
    vi.spyOn(adminDashboardService, 'getSummary').mockResolvedValue({
      accounts: { activeTeachers: 1, activeStudents: 2, inactiveAccounts: 0 },
      classrooms: { active: 1, archived: 0 },
      subjects: { active: 2, inactive: 0 },
      unassignedActiveSubjects: 1,
    });

    const response = await request(app)
      .get('/api/v1/admin/dashboard')
      .set('Cookie', ['educraft_session=mock_cookie']);

    expect(response.status).toBe(200);
    expect(response.body.data.classrooms.active).toBe(1);
  });

  it('returns the teacher dashboard summary', async () => {
    vi.spyOn(sessionService, 'resolveSession').mockResolvedValue({
      id: 'teacher-1',
      username: 'teacher',
      fullName: 'Teacher',
      role: 'TEACHER',
      status: 'ACTIVE',
      contact: null,
      mustChangePassword: false,
      sessionId: 'session-teacher',
    });
    vi.spyOn(teacherDashboardService, 'getSummary').mockResolvedValue({
      classrooms: { active: 2, archived: 1 },
      openActivities: 4,
      pendingNotebookReviews: 3,
      upcomingEvents: 5,
    });

    const response = await request(app)
      .get('/api/v1/teacher/dashboard')
      .set('Cookie', ['educraft_session=mock_cookie']);

    expect(response.status).toBe(200);
    expect(response.body.data.openActivities).toBe(4);
  });
});
