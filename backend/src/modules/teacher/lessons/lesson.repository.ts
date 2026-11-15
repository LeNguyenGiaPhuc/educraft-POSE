import { prisma } from '../../../lib/prisma.js';
import { BadRequestError, NotFoundError } from '../../../shared/errors/app-error.js';
import { requireAssignedSubjectForMutation } from '../access/teacher-subject.policy.js';
import type { CreateLessonInput, UpdateLessonInput } from './lesson.schemas.js';

export const lessonRepository = {
  async listLessons(classroomSubjectId: string) {
    return prisma.lesson.findMany({
      where: { classroom_subject_id: classroomSubjectId },
      orderBy: { created_at: 'desc' },
      include: {
        materials: {
          where: { status: { not: 'ARCHIVED' } },
          include: {
            versions: {
              orderBy: { version_no: 'desc' },
              take: 1,
              include: {
                segments: {
                  orderBy: { ordinal: 'asc' },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });
  },

  async findLessonDetail(id: string) {
    return prisma.lesson.findUnique({
      where: { id },
      include: {
        classroomSubject: {
          include: {
            classroom: true,
            subject: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            full_name: true,
            username: true,
          },
        },
        materials: {
          where: { status: { not: 'ARCHIVED' } },
          orderBy: { created_at: 'asc' },
          include: {
            versions: {
              orderBy: { version_no: 'desc' },
              include: {
                segments: {
                  orderBy: { ordinal: 'asc' },
                },
              },
            },
          },
        },
      },
    });
  },

  async createLesson(params: {
    classroomSubjectId: string;
    teacherId: string;
    data: CreateLessonInput;
  }) {
    return prisma.$transaction(async (tx) => {
      await requireAssignedSubjectForMutation(tx, params.teacherId, params.classroomSubjectId);
      return tx.lesson.create({
        data: {
          classroom_subject_id: params.classroomSubjectId,
          title: params.data.title,
          status: 'DRAFT',
          created_by_id: params.teacherId,
        },
      });
    });
  },

  async updateLesson(id: string, teacherId: string, data: UpdateLessonInput) {
    return prisma.$transaction(async (tx) => {
      const lesson = await tx.lesson.findUnique({
        where: { id },
        select: { classroom_subject_id: true },
      });
      if (!lesson) {
        throw new NotFoundError('Không tìm thấy bài học');
      }

      await requireAssignedSubjectForMutation(tx, teacherId, lesson.classroom_subject_id);
      return tx.lesson.update({
        where: { id },
        data: {
          ...(data.title !== undefined && { title: data.title }),
        },
      });
    });
  },

  async publishLessonWithMaterials(id: string, teacherId: string) {
    return prisma.$transaction(async (tx) => {
      const lessonContext = await tx.lesson.findUnique({
        where: { id },
        select: { classroom_subject_id: true },
      });
      if (!lessonContext) {
        throw new NotFoundError('Không tìm thấy bài học');
      }

      await requireAssignedSubjectForMutation(
        tx,
        teacherId,
        lessonContext.classroom_subject_id
      );

      const activeMaterials = await tx.learningMaterial.findMany({
        where: {
          lesson_id: id,
          status: { not: 'ARCHIVED' },
        },
        select: {
          id: true,
          versions: {
            orderBy: { version_no: 'desc' },
            take: 1,
            select: { processing_status: true },
          },
        },
      });
      const allMaterialsProcessed =
        activeMaterials.length > 0 &&
        activeMaterials.every((material) => material.versions[0]?.processing_status === 'PROCESSED');

      if (!allMaterialsProcessed) {
        throw new BadRequestError(
          'Tất cả học liệu đang giữ lại phải được xử lý thành công trước khi công bố'
        );
      }

      const now = new Date();

      const lesson = await tx.lesson.update({
        where: { id },
        data: {
          status: 'PUBLISHED',
          published_at: now,
        },
      });

      await tx.learningMaterial.updateMany({
        where: {
          lesson_id: id,
          status: 'DRAFT',
        },
        data: {
          status: 'PUBLISHED',
        },
      });

      return lesson;
    });
  },
};
