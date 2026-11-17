import { prisma } from '../../../lib/prisma.js';
import { BadRequestError, NotFoundError } from '../../../shared/errors/app-error.js';
import { requireAssignedSubjectForMutation } from '../access/teacher-subject.policy.js';
import type { ProcessedSegment } from './ai-processing.provider.js';

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

      return updated;
    });
  },
};
