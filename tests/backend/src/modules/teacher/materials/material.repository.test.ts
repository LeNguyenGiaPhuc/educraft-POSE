import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../../../../../../backend/src/lib/prisma.js';
import { materialRepository } from '../../../../../../backend/src/modules/teacher/materials/material.repository.js';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from '../../../../../../backend/src/shared/errors/app-error.js';

describe('materialRepository processing claims', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns no claim when another processing attempt is still active', async () => {
    const updateMany = vi
      .spyOn(prisma.materialVersion, 'updateMany')
      .mockResolvedValue({ count: 0 });

    await expect(materialRepository.claimProcessingAttempt('version-1')).resolves.toBeNull();

    expect(updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        id: 'version-1',
        OR: expect.arrayContaining([
          expect.objectContaining({ processing_status: 'PROCESSING' }),
        ]),
      }),
      data: expect.objectContaining({
        processing_status: 'PROCESSING',
        processing_attempt_id: expect.any(String),
        processing_started_at: expect.any(Date),
      }),
    }));
  });

  it('does not change segments when a stale attempt finishes after claim replacement', async () => {
    const mockTx = {
      materialVersion: {
        findUnique: vi.fn().mockResolvedValue({ material_id: 'material-1' }),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      materialSegment: {
        deleteMany: vi.fn(),
        createMany: vi.fn(),
      },
      learningMaterial: {
        update: vi.fn(),
      },
    };

    vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => callback(mockTx));

    await expect(
      materialRepository.updateClaimedVersionProcessing(
        'version-1',
        'old-attempt',
        'PROCESSED',
        [],
      )
    ).rejects.toThrow(ConflictError);

    expect(mockTx.materialSegment.deleteMany).not.toHaveBeenCalled();
    expect(mockTx.learningMaterial.update).not.toHaveBeenCalled();
  });

  it('uses readable errors when promoting a missing or unprocessed version', async () => {
    const findUnique = vi.fn();
    const mockTx = {
      materialVersion: { findUnique },
      learningMaterial: { update: vi.fn() },
    };
    vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => callback(mockTx));

    findUnique.mockResolvedValueOnce(null);
    await expect(materialRepository.promoteMaterialVersion('missing')).rejects.toThrow(
      new NotFoundError('Không tìm thấy phiên bản học liệu')
    );

    findUnique.mockResolvedValueOnce({
      id: 'version-1',
      material_id: 'material-1',
      processing_status: 'PENDING',
    });
    await expect(materialRepository.promoteMaterialVersion('version-1')).rejects.toThrow(
      new BadRequestError('Chỉ có thể chọn phiên bản đã xử lý thành công')
    );
  });
});
