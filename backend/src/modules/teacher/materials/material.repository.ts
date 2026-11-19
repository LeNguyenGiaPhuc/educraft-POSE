import { randomUUID } from 'node:crypto';
import { prisma } from '../../../lib/prisma.js';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from '../../../shared/errors/app-error.js';
import { requireAssignedSubjectForMutation } from '../access/teacher-subject.policy.js';
import type { ProcessedSegment } from './ai-processing.provider.js';

const PROCESSING_CLAIM_TIMEOUT_MS = 10 * 60 * 1000;

export const materialRepository = {
  async findLessonWithClassroomSubject(lessonId: string) {
    return prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        classroomSubject: true,
      },
    });
  },

  async findMaterialWithLessonContext(materialId: string) {
    return prisma.learningMaterial.findUnique({
      where: { id: materialId },
      include: {
        lesson: {
          include: {
            classroomSubject: true,
          },
        },
        activeVersion: true,
        versions: {
          orderBy: { version_no: 'desc' },
        },
      },
    });
  },

  async createMaterialWithVersion(params: {
    lessonId: string;
    fileName: string;
    teacherId: string;
    storageKey: string;
    mimeType: string;
    byteSize: bigint;
  }) {
    return prisma.$transaction(async (tx) => {
      const lesson = await tx.lesson.findUnique({
        where: { id: params.lessonId },
        select: { classroom_subject_id: true },
      });
      if (!lesson) {
        throw new NotFoundError('Không tìm thấy bài học');
      }
      await requireAssignedSubjectForMutation(
        tx,
        params.teacherId,
        lesson.classroom_subject_id
      );

      const material = await tx.learningMaterial.create({
        data: {
          lesson_id: params.lessonId,
          file_name: params.fileName,
          status: 'DRAFT',
          created_by_id: params.teacherId,
        },
      });

      const version = await tx.materialVersion.create({
        data: {
          material_id: material.id,
          version_no: 1,
          storage_key: params.storageKey,
          mime_type: params.mimeType,
          byte_size: params.byteSize,
          processing_status: 'PENDING',
        },
      });

      return {
        ...material,
        versions: [version],
      };
    });
  },

  async createNewVersion(params: {
    materialId: string;
    teacherId: string;
    storageKey: string;
    mimeType: string;
    byteSize: bigint;
  }) {
    return prisma.$transaction(async (tx) => {
      const material = await tx.learningMaterial.findUnique({
        where: { id: params.materialId },
        select: {
          status: true,
          lesson: { select: { classroom_subject_id: true } },
        },
      });
      if (!material) {
        throw new NotFoundError('Không tìm thấy học liệu');
      }
      if (material.status === 'ARCHIVED') {
        throw new BadRequestError('Không thể thêm phiên bản cho học liệu đã lưu trữ');
      }
      await requireAssignedSubjectForMutation(
        tx,
        params.teacherId,
        material.lesson.classroom_subject_id
      );

      const latest = await tx.materialVersion.findFirst({
        where: { material_id: params.materialId },
        orderBy: { version_no: 'desc' },
        select: { version_no: true },
      });

      const nextVersionNo = (latest?.version_no ?? 0) + 1;

      return tx.materialVersion.create({
        data: {
          material_id: params.materialId,
          version_no: nextVersionNo,
          storage_key: params.storageKey,
          mime_type: params.mimeType,
          byte_size: params.byteSize,
          processing_status: 'PENDING',
        },
      });
    });
  },

  async archiveMaterial(materialId: string, teacherId: string) {
    return prisma.$transaction(async (tx) => {
      const material = await tx.learningMaterial.findUnique({
        where: { id: materialId },
        select: { lesson: { select: { classroom_subject_id: true } } },
      });
      if (!material) {
        throw new NotFoundError('Không tìm thấy học liệu');
      }
      await requireAssignedSubjectForMutation(
        tx,
        teacherId,
        material.lesson.classroom_subject_id
      );
      return tx.learningMaterial.update({
        where: { id: materialId },
        data: { status: 'ARCHIVED' },
      });
    });
  },

  async claimProcessingAttempt(versionId: string): Promise<string | null> {
    const attemptId = randomUUID();
    const now = new Date();
    const staleBefore = new Date(now.getTime() - PROCESSING_CLAIM_TIMEOUT_MS);
    const claimed = await prisma.materialVersion.updateMany({
      where: {
        id: versionId,
        OR: [
          { processing_status: { in: ['PENDING', 'FAILED'] } },
          {
            processing_status: 'PROCESSING',
            processing_started_at: { lt: staleBefore },
          },
        ],
      },
      data: {
        processing_status: 'PROCESSING',
        processing_attempt_id: attemptId,
        processing_started_at: now,
      },
    });

    return claimed.count === 1 ? attemptId : null;
  },

  async updateVersionProcessing(
    versionId: string,
    status: 'PROCESSED' | 'FAILED' | 'PENDING',
    segments?: ProcessedSegment[]
  ) {
    return prisma.$transaction(async (tx) => {
      const updated = await tx.materialVersion.update({
        where: { id: versionId },
        data: { processing_status: status },
      });

      // A retry must not leave stale segments from an earlier attempt.
      await tx.materialSegment.deleteMany({
        where: { material_version_id: versionId },
      });

      if (segments && segments.length > 0) {
        await tx.materialSegment.createMany({
          data: segments.map((s) => ({
            material_version_id: versionId,
            position_type: s.positionType,
            position_index: s.positionIndex,
            position_label: s.positionLabel,
            ordinal: s.ordinal,
            content: s.content,
            processing_status: 'PROCESSED',
          })),
        });
      }

      if (status === 'PROCESSED') {
        await tx.learningMaterial.update({
          where: { id: updated.material_id },
          data: { active_version_id: updated.id },
        });
      }

      return updated;
    });
  },

  async updateClaimedVersionProcessing(
    versionId: string,
    attemptId: string,
    status: 'PROCESSED' | 'FAILED' | 'PENDING',
    segments?: ProcessedSegment[]
  ) {
    return prisma.$transaction(async (tx) => {
      const version = await tx.materialVersion.findUnique({
        where: { id: versionId },
        select: { material_id: true },
      });
      if (!version) {
        throw new NotFoundError('Không tìm thấy phiên bản học liệu');
      }

      const updated = await tx.materialVersion.updateMany({
        where: {
          id: versionId,
          processing_status: 'PROCESSING',
          processing_attempt_id: attemptId,
        },
        data: {
          processing_status: status,
          processing_attempt_id: null,
          processing_started_at: null,
        },
      });
      if (updated.count !== 1) {
        throw new ConflictError('Quyền xử lý học liệu đã hết hiệu lực');
      }

      // A retry must not leave stale segments from an earlier attempt.
      await tx.materialSegment.deleteMany({
        where: { material_version_id: versionId },
      });

      if (segments && segments.length > 0) {
        await tx.materialSegment.createMany({
          data: segments.map((segment) => ({
            material_version_id: versionId,
            position_type: segment.positionType,
            position_index: segment.positionIndex,
            position_label: segment.positionLabel,
            ordinal: segment.ordinal,
            content: segment.content,
            processing_status: 'PROCESSED',
          })),
        });
      }

      if (status === 'PROCESSED') {
        await tx.learningMaterial.update({
          where: { id: version.material_id },
          data: { active_version_id: versionId },
        });
      }

      return { applied: true };
    });
  },

  async promoteMaterialVersion(versionId: string) {
    return prisma.$transaction(async (tx) => {
      const version = await tx.materialVersion.findUnique({
        where: { id: versionId },
        select: { id: true, material_id: true, processing_status: true },
      });

      if (!version) {
        throw new NotFoundError('Không tìm thấy phiên bản học liệu');
      }
      if (version.processing_status !== 'PROCESSED') {
        throw new BadRequestError('Chỉ có thể chọn phiên bản đã xử lý thành công');
      }

      return tx.learningMaterial.update({
        where: { id: version.material_id },
        data: { active_version_id: version.id },
      });
    });
  },
};
