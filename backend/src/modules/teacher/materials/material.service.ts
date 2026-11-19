import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from '../../../shared/errors/app-error.js';
import { defaultStorageProvider } from '../../storage/storage-factory.js';
import {
  generateStorageKey,
  validateMaterialFile,
} from '../../storage/file-validation.js';
import { requireAssignedSubject } from '../access/teacher-subject.policy.js';
import {
  defaultAiProcessingProvider,
  type ProcessedMaterialResult,
} from './ai-processing.provider.js';
import { materialRepository } from './material.repository.js';

type CreatedMaterial = Awaited<ReturnType<typeof materialRepository.createMaterialWithVersion>>;
type CreatedMaterialVersion = Awaited<ReturnType<typeof materialRepository.createNewVersion>>;

async function processMaterialVersion(params: {
  versionId: string;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
  persistPending?: boolean;
  attemptId?: string;
}): Promise<ProcessedMaterialResult['status']> {
  const updateProcessing = async (
    status: 'PROCESSED' | 'FAILED' | 'PENDING',
    segments?: ProcessedMaterialResult['segments']
  ) => {
    if (params.attemptId) {
      if (segments === undefined) {
        await materialRepository.updateClaimedVersionProcessing(
          params.versionId,
          params.attemptId,
          status
        );
        return;
      }

      await materialRepository.updateClaimedVersionProcessing(
        params.versionId,
        params.attemptId,
        status,
        segments
      );
      return;
    }

    if (segments === undefined) {
      await materialRepository.updateVersionProcessing(params.versionId, status);
      return;
    }

    await materialRepository.updateVersionProcessing(params.versionId, status, segments);
  };

  let result: ProcessedMaterialResult;

  try {
    result = await defaultAiProcessingProvider.process({
      materialVersionId: params.versionId,
      fileName: params.fileName,
      mimeType: params.mimeType,
      buffer: params.buffer,
    });
  } catch {
    await updateProcessing('FAILED');
    return 'FAILED';
  }

  if (result.status === 'PENDING') {
    if (params.attemptId || params.persistPending) {
      await updateProcessing('PENDING');
    }
    return 'PENDING';
  }

  const segments = result.status === 'PROCESSED' ? result.segments : undefined;
  await updateProcessing(result.status, segments);
  return result.status;
}

export const materialService = {
  async uploadMaterial(params: {
    lessonId: string;
    teacherId: string;
    file: {
      originalname: string;
      mimetype: string;
      size: number;
      buffer: Buffer;
    };
  }) {
    // 1. File validation
    const validation = validateMaterialFile(params.file);
    if (!validation.isValid) {
      throw new BadRequestError(validation.error || 'File không hợp lệ');
    }

    // 2. Verify lesson & assignment
    const lesson = await materialRepository.findLessonWithClassroomSubject(params.lessonId);
    if (!lesson) {
      throw new NotFoundError('Không tìm thấy bài học');
    }

    await requireAssignedSubject(params.teacherId, lesson.classroom_subject_id, {
      allowArchived: false,
    });

    // 3. Storage put
    const storageKey = generateStorageKey(params.file.originalname);
    await defaultStorageProvider.put(storageKey, params.file.buffer, params.file.mimetype);

    // 4. DB insert with compensation
    let created: CreatedMaterial;
    try {
      created = await materialRepository.createMaterialWithVersion({
        lessonId: params.lessonId,
        fileName: params.file.originalname,
        teacherId: params.teacherId,
        storageKey,
        mimeType: params.file.mimetype,
        byteSize: BigInt(params.file.size),
      });

    } catch (err) {
      // Storage compensation: remove uploaded file if DB insertion failed
      await defaultStorageProvider.delete(storageKey).catch(() => {});
      throw err;
    }

    const version = created.versions[0];
    const processingStatus = await processMaterialVersion({
      versionId: version.id,
      fileName: created.file_name,
      mimeType: version.mime_type,
      buffer: params.file.buffer,
    });

    return {
      id: created.id,
      lessonId: created.lesson_id,
      fileName: created.file_name,
      status: created.status,
      latestVersion: {
        id: version.id,
        versionNo: version.version_no,
        byteSize: version.byte_size.toString(),
        mimeType: version.mime_type,
        processingStatus,
        uploadedAt: version.uploaded_at
          ? version.uploaded_at.toISOString()
          : new Date().toISOString(),
      },
    };
  },

  async uploadNewVersion(params: {
    materialId: string;
    teacherId: string;
    file: {
      originalname: string;
      mimetype: string;
      size: number;
      buffer: Buffer;
    };
  }) {
    // 1. File validation
    const validation = validateMaterialFile(params.file);
    if (!validation.isValid) {
      throw new BadRequestError(validation.error || 'File không hợp lệ');
    }

    // 2. Verify material & assignment
    const material = await materialRepository.findMaterialWithLessonContext(params.materialId);
    if (!material) {
      throw new NotFoundError('Không tìm thấy học liệu');
    }

    await requireAssignedSubject(params.teacherId, material.lesson.classroom_subject_id, {
      allowArchived: false,
    });

    // 3. Storage put
    const storageKey = generateStorageKey(params.file.originalname);
    await defaultStorageProvider.put(storageKey, params.file.buffer, params.file.mimetype);

    // 4. DB insert with compensation
    let version: CreatedMaterialVersion;
    try {
      version = await materialRepository.createNewVersion({
        materialId: params.materialId,
        teacherId: params.teacherId,
        storageKey,
        mimeType: params.file.mimetype,
        byteSize: BigInt(params.file.size),
      });
    } catch (err) {
      await defaultStorageProvider.delete(storageKey).catch(() => {});
      throw err;
    }

    const processingStatus = await processMaterialVersion({
      versionId: version.id,
      fileName: params.file.originalname,
      mimeType: version.mime_type,
      buffer: params.file.buffer,
    });

    return {
      id: version.id,
      materialId: version.material_id,
      versionNo: version.version_no,
      byteSize: version.byte_size.toString(),
      mimeType: version.mime_type,
      processingStatus,
      uploadedAt: version.uploaded_at
        ? version.uploaded_at.toISOString()
        : new Date().toISOString(),
    };
  },

  async retryProcessing(materialId: string, teacherId: string) {
    const material = await materialRepository.findMaterialWithLessonContext(materialId);
    if (!material) {
      throw new NotFoundError('Không tìm thấy học liệu');
    }

    await requireAssignedSubject(teacherId, material.lesson.classroom_subject_id, {
      allowArchived: false,
    });

    if (material.status === 'ARCHIVED') {
      throw new BadRequestError('Không thể xử lý lại học liệu đã lưu trữ');
    }

    const latest = material.versions[0];
    if (!latest) {
      throw new NotFoundError('Không tìm thấy phiên bản học liệu');
    }

    if (latest.processing_status !== 'FAILED' && latest.processing_status !== 'PENDING') {
      throw new BadRequestError('Chỉ có thể xử lý lại học liệu đang chờ hoặc bị lỗi');
    }

    const attemptId = await materialRepository.claimProcessingAttempt(latest.id);
    if (!attemptId) {
      throw new ConflictError('Học liệu đang được xử lý bởi một yêu cầu khác');
    }

    let buffer: Buffer;
    try {
      buffer = await defaultStorageProvider.open(latest.storage_key);
    } catch {
      await materialRepository
        .updateClaimedVersionProcessing(latest.id, attemptId, 'FAILED')
        .catch(() => {});
      throw new NotFoundError('Không tìm thấy tệp học liệu trong kho lưu trữ');
    }

    const processingStatus = await processMaterialVersion({
      versionId: latest.id,
      fileName: material.file_name,
      mimeType: latest.mime_type,
      buffer,
      attemptId,
    });

    return {
      materialId: material.id,
      versionId: latest.id,
      versionNo: latest.version_no,
      processingStatus,
    };
  },

  async archiveMaterial(materialId: string, teacherId: string) {
    const material = await materialRepository.findMaterialWithLessonContext(materialId);
    if (!material) {
      throw new NotFoundError('Không tìm thấy học liệu');
    }

    await requireAssignedSubject(teacherId, material.lesson.classroom_subject_id, {
      allowArchived: false,
    });

    const archived = await materialRepository.archiveMaterial(materialId, teacherId);
    return {
      id: archived.id,
      status: archived.status,
    };
  },

  async downloadMaterial(materialId: string, teacherId: string) {
    const material = await materialRepository.findMaterialWithLessonContext(materialId);
    if (!material) {
      throw new NotFoundError('Không tìm thấy học liệu');
    }

    await requireAssignedSubject(teacherId, material.lesson.classroom_subject_id, {
      allowArchived: true,
    });

    const activeVersion = material.activeVersion;
    if (activeVersion?.processing_status !== 'PROCESSED') {
      throw new NotFoundError('Không tìm thấy tệp đính kèm của học liệu');
    }

    const buffer = await defaultStorageProvider.open(activeVersion.storage_key);

    return {
      buffer,
      fileName: material.file_name,
      mimeType: activeVersion.mime_type,
    };
  },
};
