import { BadRequestError, NotFoundError } from '../../../shared/errors/app-error.js';
import { requireAssignedSubject } from '../access/teacher-subject.policy.js';
import { lessonRepository } from './lesson.repository.js';
import type { CreateLessonInput, UpdateLessonInput } from './lesson.schemas.js';

export const lessonService = {
  async listLessons(classroomSubjectId: string, teacherId: string) {
    await requireAssignedSubject(teacherId, classroomSubjectId, { allowArchived: true });

    const lessons = await lessonRepository.listLessons(classroomSubjectId);

    return lessons.map((l) => ({
      id: l.id,
      classroomSubjectId: l.classroom_subject_id,
      title: l.title,
      status: l.status,
      publishedAt: l.published_at ? l.published_at.toISOString() : null,
      createdAt: l.created_at.toISOString(),
      updatedAt: l.updated_at.toISOString(),
      materials: l.materials.map((m) => {
        const latest = m.versions[0];
        const active = m.activeVersion;
        return {
          id: m.id,
          name: m.file_name,
          version: latest ? latest.version_no : 1,
          processing: latest ? latest.processing_status : 'PENDING',
          activeVersionId: active?.id ?? null,
          sourcePosition: active?.segments[0]?.position_label ?? '',
        };
      }),
    }));
  },

  async createLesson(classroomSubjectId: string, teacherId: string, data: CreateLessonInput) {
    await requireAssignedSubject(teacherId, classroomSubjectId, { allowArchived: false });

    const created = await lessonRepository.createLesson({
      classroomSubjectId,
      teacherId,
      data,
    });

    return {
      id: created.id,
      classroomSubjectId: created.classroom_subject_id,
      title: created.title,
      status: created.status,
      publishedAt: created.published_at ? created.published_at.toISOString() : null,
      createdAt: created.created_at.toISOString(),
      updatedAt: created.updated_at.toISOString(),
    };
  },

  async getLessonDetail(lessonId: string, teacherId: string) {
    const lesson = await lessonRepository.findLessonDetail(lessonId);
    if (!lesson) {
      throw new NotFoundError('Không tìm thấy bài học');
    }

    await requireAssignedSubject(teacherId, lesson.classroom_subject_id, { allowArchived: true });

    return {
      id: lesson.id,
      classroomSubjectId: lesson.classroom_subject_id,
      title: lesson.title,
      status: lesson.status,
      publishedAt: lesson.published_at ? lesson.published_at.toISOString() : null,
      createdAt: lesson.created_at.toISOString(),
      updatedAt: lesson.updated_at.toISOString(),
      classroom: {
        id: lesson.classroomSubject.classroom.id,
        name: lesson.classroomSubject.classroom.name,
        status: lesson.classroomSubject.classroom.status,
      },
      subject: {
        id: lesson.classroomSubject.subject.id,
        name: lesson.classroomSubject.subject.name,
      },
      createdBy: lesson.createdBy,
      materials: lesson.materials.map((m) => ({
        id: m.id,
        fileName: m.file_name,
        status: m.status,
        createdAt: m.created_at.toISOString(),
        activeVersionId: m.activeVersion?.id ?? null,
        versions: m.versions.map((v) => ({
          id: v.id,
          versionNo: v.version_no,
          mimeType: v.mime_type,
          byteSize: v.byte_size.toString(),
          processingStatus: v.processing_status,
          uploadedAt: v.uploaded_at.toISOString(),
          segments: v.segments.map((s) => ({
            id: s.id,
            positionType: s.position_type,
            positionIndex: s.position_index,
            positionLabel: s.position_label,
            ordinal: s.ordinal,
            content: s.content,
          })),
        })),
      })),
    };
  },

  async updateLesson(lessonId: string, teacherId: string, data: UpdateLessonInput) {
    const lesson = await lessonRepository.findLessonDetail(lessonId);
    if (!lesson) {
      throw new NotFoundError('Không tìm thấy bài học');
    }

    await requireAssignedSubject(teacherId, lesson.classroom_subject_id, { allowArchived: false });

    const updated = await lessonRepository.updateLesson(lessonId, teacherId, data);

    return {
      id: updated.id,
      classroomSubjectId: updated.classroom_subject_id,
      title: updated.title,
      status: updated.status,
      publishedAt: updated.published_at ? updated.published_at.toISOString() : null,
      createdAt: updated.created_at.toISOString(),
      updatedAt: updated.updated_at.toISOString(),
    };
  },

  async publishLesson(lessonId: string, teacherId: string) {
    const lesson = await lessonRepository.findLessonDetail(lessonId);
    if (!lesson) {
      throw new NotFoundError('Không tìm thấy bài học');
    }

    await requireAssignedSubject(teacherId, lesson.classroom_subject_id, { allowArchived: false });

    // Validate publication prerequisites
    const activeMaterials = lesson.materials.filter((m) => m.status !== 'ARCHIVED');
    if (activeMaterials.length === 0) {
      throw new BadRequestError('Bài học cần ít nhất một học liệu đã được xử lý thành công để công bố');
    }

    const allMaterialsProcessed = activeMaterials.every((m) =>
      m.activeVersion?.processing_status === 'PROCESSED'
    );

    if (!allMaterialsProcessed) {
      throw new BadRequestError(
        'Tất cả học liệu đang giữ lại phải được xử lý thành công trước khi công bố'
      );
    }

    const published = await lessonRepository.publishLessonWithMaterials(lessonId, teacherId);

    return {
      id: published.id,
      classroomSubjectId: published.classroom_subject_id,
      title: published.title,
      status: published.status,
      publishedAt: published.published_at ? published.published_at.toISOString() : null,
    };
  },
};
