import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SubjectService } from '../../../../../../backend/src/modules/admin/subjects/subject.service.js';
import type { SubjectRepository, SubjectWithCounts } from '../../../../../../backend/src/modules/admin/subjects/subject.repository.js';
import { ConflictError, NotFoundError } from '../../../../../../backend/src/shared/errors/app-error.js';

describe('SubjectService', () => {
  let repo: SubjectRepository;
  let service: SubjectService;

  beforeEach(() => {
    vi.restoreAllMocks();
    repo = {
      findMany: vi.fn(),
      findById: vi.fn(),
      findByNameCaseInsensitive: vi.fn(),
      createSubjectWithActiveClasses: vi.fn(),
      updateName: vi.fn(),
      updateStatus: vi.fn(),
    } as unknown as SubjectRepository;

    service = new SubjectService(repo);
  });

  it('lists subjects with mapped counts', async () => {
    const mockSubjects: SubjectWithCounts[] = [
      {
        id: 'sub-1',
        name: 'Lịch sử',
        is_active: true,
        _count: {
          teacherProfiles: 2,
          classroomSubjects: 3,
        },
      },
    ];

    vi.spyOn(repo, 'findMany').mockResolvedValue(mockSubjects);

    const result = await service.listSubjects();
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: 'sub-1',
      name: 'Lịch sử',
      isActive: true,
      teacherCount: 2,
      classroomCount: 3,
    });
  });

  it('creates subject and synchronizes active classrooms', async () => {
    vi.spyOn(repo, 'findByNameCaseInsensitive').mockResolvedValue(null);

    const created: SubjectWithCounts = {
      id: 'sub-new',
      name: 'Địa lí',
      is_active: true,
      _count: {
        teacherProfiles: 0,
        classroomSubjects: 2, // 2 active classrooms synced
      },
    };
    vi.spyOn(repo, 'createSubjectWithActiveClasses').mockResolvedValue(created);

    const result = await service.createSubject({ name: 'Địa lí' });
    expect(result.id).toBe('sub-new');
    expect(result.name).toBe('Địa lí');
    expect(result.classroomCount).toBe(2);
    expect(repo.createSubjectWithActiveClasses).toHaveBeenCalledWith('Địa lí');
  });

  it('rejects duplicate subject name case-insensitively', async () => {
    vi.spyOn(repo, 'findByNameCaseInsensitive').mockResolvedValue({
      id: 'sub-exist',
      name: 'Toán',
      is_active: true,
    });

    await expect(service.createSubject({ name: 'toán' })).rejects.toThrow(ConflictError);
  });

  it('maps a database subject collision to conflict after a clean precheck', async () => {
    vi.spyOn(repo, 'findByNameCaseInsensitive').mockResolvedValue(null);
    vi.spyOn(repo, 'createSubjectWithActiveClasses').mockRejectedValue({ code: 'P2002' });
    await expect(service.createSubject({ name: 'Toán' })).rejects.toThrow(ConflictError);
  });

  it('updates subject name and checks for duplicates', async () => {
    vi.spyOn(repo, 'findById').mockResolvedValue({
      id: 'sub-1',
      name: 'Lịch sử',
      is_active: true,
    });
    vi.spyOn(repo, 'findByNameCaseInsensitive').mockResolvedValue(null);
    vi.spyOn(repo, 'updateName').mockResolvedValue({
      id: 'sub-1',
      name: 'Lịch sử thế giới',
      is_active: true,
    });

    const result = await service.updateSubject('sub-1', { name: 'Lịch sử thế giới' });
    expect(result.name).toBe('Lịch sử thế giới');
    expect(repo.updateName).toHaveBeenCalledWith('sub-1', 'Lịch sử thế giới');
  });

  it('rejects renaming to an existing subject name', async () => {
    vi.spyOn(repo, 'findById').mockResolvedValue({
      id: 'sub-1',
      name: 'Lịch sử',
      is_active: true,
    });
    vi.spyOn(repo, 'findByNameCaseInsensitive').mockResolvedValue({
      id: 'sub-2',
      name: 'Toán',
      is_active: true,
    });

    await expect(service.updateSubject('sub-1', { name: 'Toán' })).rejects.toThrow(ConflictError);
  });

  it('updates subject status', async () => {
    vi.spyOn(repo, 'findById').mockResolvedValue({
      id: 'sub-1',
      name: 'Lịch sử',
      is_active: true,
    });
    vi.spyOn(repo, 'updateStatus').mockResolvedValue({
      id: 'sub-1',
      name: 'Lịch sử',
      is_active: false,
    });

    const result = await service.updateStatus('sub-1', { isActive: false });
    expect(result.isActive).toBe(false);
    expect(repo.updateStatus).toHaveBeenCalledWith('sub-1', false);
  });

  it('reactivates a subject through the repository sync flow', async () => {
    vi.spyOn(repo, 'findById').mockResolvedValue({
      id: 'sub-1',
      name: 'Lịch sử',
      is_active: false,
    });
    vi.spyOn(repo, 'updateStatus').mockResolvedValue({
      id: 'sub-1',
      name: 'Lịch sử',
      is_active: true,
    });

    const result = await service.updateStatus('sub-1', { isActive: true });
    expect(result.isActive).toBe(true);
    expect(repo.updateStatus).toHaveBeenCalledWith('sub-1', true);
  });

  it('throws NotFoundError for non-existent subject', async () => {
    vi.spyOn(repo, 'findById').mockResolvedValue(null);
    await expect(service.getSubjectById('nonexistent')).rejects.toThrow(NotFoundError);
  });
});
