import type { Prisma } from '@prisma/client';
import { prisma } from '../../../lib/prisma.js';
import { BadRequestError, ConflictError, NotFoundError } from '../../../shared/errors/app-error.js';
import { requireAssignedSubjectForMutation } from '../access/teacher-subject.policy.js';
import {
  requireQuestionCitations,
  validateExerciseQuestionShape,
  validateQuestionSources,
  type EligibleActivitySegment,
} from './activity-validation.js';
import type {
  CreateActivityInput,
  QuestionInput,
  ReopenActivityInput,
  UpdateActivityInput,
  UpdateExerciseContentInput,
} from './activity.schemas.js';

async function lockActivityForContentMutation(
  tx: Prisma.TransactionClient,
  activityId: string
): Promise<void> {
  // Student submission uses the same database row lock, so content cannot change mid-submit.
  await tx.$queryRaw`SELECT id FROM activities WHERE id = ${activityId}::uuid FOR UPDATE`;
}

export const activityRepository = {
  async listActivities(classroomSubjectId: string) {
    return prisma.activity.findMany({
      where: {
        classroom_subject_id: classroomSubjectId,
        kind: 'EXERCISE',
      },
      orderBy: { created_at: 'desc' },
      include: {
        exercise: {
          include: {
            _count: {
              select: {
                submissions: true,
                questions: true,
              },
            },
          },
        },
        createdBy: {
          select: {
            id: true,
            full_name: true,
          },
        },
      },
    });
  },

  async findActivityById(
    activityId: string,
    client: Pick<Prisma.TransactionClient, 'activity'> = prisma
  ) {
    return client.activity.findUnique({
      where: { id: activityId },
      include: {
        exercise: {
          include: {
            lessons: {
              include: {
                lesson: true,
              },
            },
            questions: {
              orderBy: { sort_order: 'asc' },
              include: {
                citations: {
                  include: {
                    segment: true,
                  },
                },
              },
            },
            _count: {
              select: {
                submissions: true,
              },
            },
          },
        },
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
          },
        },
      },
    });
  },

  async createActivityAtomically(
    actorId: string,
    classroomSubjectId: string,
    input: CreateActivityInput
  ) {
    return prisma.$transaction(async (tx) => {
      // 1. Authoritative check
      await requireAssignedSubjectForMutation(tx, actorId, classroomSubjectId);

      // 2. Validate lesson links if supplied
      if (input.lessonIds && input.lessonIds.length > 0) {
        const validLessons = await tx.lesson.findMany({
          where: {
            id: { in: input.lessonIds },
            classroom_subject_id: classroomSubjectId,
          },
        });
        if (validLessons.length !== input.lessonIds.length) {
          throw new BadRequestError('Một hoặc nhiều bài học liên kết không thuộc môn học này');
        }
      }

      // 3. Create Activity record (DRAFT)
      const activity = await tx.activity.create({
        data: {
          classroom_subject_id: classroomSubjectId,
          created_by_id: actorId,
          kind: 'EXERCISE',
          title: input.title,
          description: input.description,
          status: 'DRAFT',
          published_at: null,
          closes_at: input.closesAt ? new Date(input.closesAt) : null,
        },
      });

      // 4. Create ExerciseActivity record (default 1 to satisfy DB check constraint BETWEEN 1 AND 20)
      await tx.exerciseActivity.create({
        data: {
          activity_id: activity.id,
          exercise_type: input.exerciseType,
          difficulty: input.difficulty,
          question_count: 1,
        },
      });

      // 5. Link lessons
      if (input.lessonIds && input.lessonIds.length > 0) {
        await tx.exerciseActivityLesson.createMany({
          data: input.lessonIds.map((lessonId) => ({
            activity_id: activity.id,
            lesson_id: lessonId,
          })),
        });
      }

      return this.findActivityById(activity.id, tx);
    });
  },

  async publishExerciseActivityAtomically(
    actorId: string,
    classroomSubjectId: string,
    input: CreateActivityInput & { questions: QuestionInput[] }
  ) {
    return prisma.$transaction(async (tx) => {
      const context = await requireAssignedSubjectForMutation(tx, actorId, classroomSubjectId);
      const selectedLessons = await tx.lesson.findMany({
        where: {
          id: { in: input.lessonIds ?? [] },
          classroom_subject_id: classroomSubjectId,
          status: 'PUBLISHED',
        },
        select: { id: true },
      });

      if (selectedLessons.length !== (input.lessonIds ?? []).length) {
        throw new BadRequestError('Bài học phải thuộc môn học này và đã được công bố.');
      }

      const selectedLessonIds = new Set(selectedLessons.map((lesson) => lesson.id));
      const segments = await tx.materialSegment.findMany({
        where: {
          processing_status: 'PROCESSED',
          materialVersion: {
            processing_status: 'PROCESSED',
            material: {
              status: 'PUBLISHED',
              lesson: { classroom_subject_id: classroomSubjectId, status: 'PUBLISHED' },
            },
          },
        },
        select: {
          id: true,
          content: true,
          materialVersion: {
            select: {
              id: true,
              material: { select: { lesson_id: true, active_version_id: true } },
            },
          },
        },
      });
      validateExerciseQuestionShape(input.exerciseType, input.questions);

      const eligibleSegments: EligibleActivitySegment[] = segments
        .filter((segment) =>
          selectedLessonIds.has(segment.materialVersion.material.lesson_id) &&
          segment.materialVersion.material.active_version_id === segment.materialVersion.id
        )
        .map((segment) => ({
          id: segment.id,
          content: segment.content,
          lessonId: segment.materialVersion.material.lesson_id,
        }));

      requireQuestionCitations(input.questions);
      validateQuestionSources(input.questions, selectedLessonIds, eligibleSegments);

      const activity = await tx.activity.create({
        data: {
          classroom_subject_id: classroomSubjectId,
          created_by_id: actorId,
          kind: 'EXERCISE',
          title: input.title,
          description: input.description,
          status: 'PUBLISHED',
          published_at: new Date(),
          closes_at: input.closesAt ? new Date(input.closesAt) : null,
        },
      });

      await tx.exerciseActivity.create({
        data: {
          activity_id: activity.id,
          exercise_type: input.exerciseType,
          difficulty: input.difficulty,
          question_count: input.questions.length,
        },
      });

      await tx.exerciseActivityLesson.createMany({
        data: (input.lessonIds ?? []).map((lessonId) => ({ activity_id: activity.id, lesson_id: lessonId })),
      });

      for (const [index, question] of input.questions.entries()) {
        const createdQuestion = await tx.question.create({
          data: {
            exercise_activity_id: activity.id,
            lesson_id: question.lessonId,
            prompt: question.prompt,
            options: question.options ?? undefined,
            answer_key: question.answerKey || null,
            marking_criteria: question.markingCriteria || null,
            explanation: question.explanation,
            max_points: question.maxPoints,
            sort_order: index + 1,
          },
        });
        await tx.questionCitation.createMany({
          data: question.citations.map((citation) => ({
            question_id: createdQuestion.id,
            segment_id: citation.segmentId,
            excerpt: citation.excerpt || null,
          })),
        });
      }

      const enrollments = await tx.classroomEnrollment.findMany({
        where: { classroom_id: context.classroomId, left_at: null },
        select: { student_id: true },
      });
      if (enrollments.length > 0) {
        await tx.notification.createMany({
          data: enrollments.map((enrollment) => ({
            recipient_id: enrollment.student_id,
            activity_id: activity.id,
            dedupe_key: `activity:${activity.id}`,
            title: `Hoạt động mới: ${input.title}`,
            body: `Giáo viên đã công bố bài tập "${input.title}" môn ${context.subjectName}. Vui lòng hoàn thành trước hạn nộp.`,
          })),
          skipDuplicates: true,
        });
      }

      return this.findActivityById(activity.id, tx);
    });
  },

  async updateActivityAtomically(
    actorId: string,
    activityId: string,
    input: UpdateActivityInput
  ) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.activity.findUnique({
        where: { id: activityId },
        include: {
          exercise: {
            include: {
              _count: { select: { submissions: true } },
            },
          },
        },
      });

      if (!existing) {
        throw new NotFoundError('Không tìm thấy hoạt động');
      }

      await requireAssignedSubjectForMutation(tx, actorId, existing.classroom_subject_id);

      await lockActivityForContentMutation(tx, activityId);

      // Check submission lock for lesson links
      if (input.lessonIds !== undefined) {
        const submissionCount = await tx.exerciseSubmission.count({
          where: { activity_id: activityId },
        });
        if (submissionCount > 0) {
          throw new ConflictError('Không thể sửa danh sách bài học liên kết của hoạt động đã có bài nộp');
        }
      }

      // Update lesson links if specified
      if (input.lessonIds !== undefined) {
        if (input.lessonIds.length > 0) {
          const validLessons = await tx.lesson.findMany({
            where: {
              id: { in: input.lessonIds },
              classroom_subject_id: existing.classroom_subject_id,
            },
          });
          if (validLessons.length !== input.lessonIds.length) {
            throw new BadRequestError('Một hoặc nhiều bài học liên kết không thuộc môn học này');
          }
        }

        await tx.exerciseActivityLesson.deleteMany({
          where: { activity_id: activityId },
        });

        if (input.lessonIds.length > 0) {
          await tx.exerciseActivityLesson.createMany({
            data: input.lessonIds.map((lessonId) => ({
              activity_id: activityId,
              lesson_id: lessonId,
            })),
          });
        }
      }

      // Update difficulty if specified
      if (input.difficulty !== undefined) {
        await tx.exerciseActivity.update({
          where: { activity_id: activityId },
          data: { difficulty: input.difficulty },
        });
      }

      // Update activity details
      await tx.activity.update({
        where: { id: activityId },
        data: {
          title: input.title !== undefined ? input.title : existing.title,
          description: input.description !== undefined ? input.description : existing.description,
          closes_at: input.closesAt !== undefined ? (input.closesAt ? new Date(input.closesAt) : null) : existing.closes_at,
        },
      });

      return this.findActivityById(activityId, tx);
    });
  },

  async updateExerciseContentAtomically(
    actorId: string,
    activityId: string,
    input: UpdateExerciseContentInput
  ) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.activity.findUnique({
        where: { id: activityId },
        include: { exercise: true },
      });

      if (!existing?.exercise) {
        throw new NotFoundError('Không tìm thấy hoạt động bài tập');
      }

      await requireAssignedSubjectForMutation(tx, actorId, existing.classroom_subject_id);
      await lockActivityForContentMutation(tx, activityId);

      const submissionCount = await tx.exerciseSubmission.count({
        where: { activity_id: activityId },
      });
      if (submissionCount > 0) {
        throw new ConflictError('Không thể sửa hoạt động đã có bài nộp');
      }

      validateExerciseQuestionShape(existing.exercise.exercise_type, input.questions);
      if (existing.status !== 'DRAFT') {
        requireQuestionCitations(input.questions);
      }

      const selectedLessons = await tx.lesson.findMany({
        where: {
          id: { in: input.lessonIds },
          classroom_subject_id: existing.classroom_subject_id,
        },
        select: { id: true },
      });
      if (selectedLessons.length !== input.lessonIds.length) {
        throw new BadRequestError('Một hoặc nhiều bài học liên kết không thuộc môn học này');
      }

      const selectedLessonIds = new Set(selectedLessons.map((lesson) => lesson.id));
      const eligibleSegments: EligibleActivitySegment[] = (await tx.materialSegment.findMany({
        where: {
          processing_status: 'PROCESSED',
          materialVersion: {
            processing_status: 'PROCESSED',
            material: {
              status: 'PUBLISHED',
              lesson: {
                id: { in: input.lessonIds },
                classroom_subject_id: existing.classroom_subject_id,
                status: 'PUBLISHED',
              },
            },
          },
        },
        select: {
          id: true,
          content: true,
          materialVersion: {
            select: {
              id: true,
              material: { select: { lesson_id: true, active_version_id: true } },
            },
          },
        },
      })).filter((segment) => segment.materialVersion.material.active_version_id === segment.materialVersion.id).map((segment) => ({
        id: segment.id,
        content: segment.content,
        lessonId: segment.materialVersion.material.lesson_id,
      }));
      validateQuestionSources(input.questions, selectedLessonIds, eligibleSegments);

      await tx.activity.update({
        where: { id: activityId },
        data: {
          title: input.title,
          description: input.description,
          closes_at: input.closesAt !== undefined
            ? (input.closesAt ? new Date(input.closesAt) : null)
            : existing.closes_at,
        },
      });

      await tx.exerciseActivity.update({
        where: { activity_id: activityId },
        data: { difficulty: input.difficulty },
      });

      await tx.exerciseActivityLesson.deleteMany({
        where: { activity_id: activityId },
      });
      if (input.lessonIds.length > 0) {
        await tx.exerciseActivityLesson.createMany({
          data: input.lessonIds.map((lessonId) => ({
            activity_id: activityId,
            lesson_id: lessonId,
          })),
        });
      }

      await tx.questionCitation.deleteMany({
        where: { question: { exercise_activity_id: activityId } },
      });
      await tx.question.deleteMany({
        where: { exercise_activity_id: activityId },
      });

      for (let index = 0; index < input.questions.length; index += 1) {
        const question = input.questions[index];
        const createdQuestion = await tx.question.create({
          data: {
            exercise_activity_id: activityId,
            lesson_id: question.lessonId,
            prompt: question.prompt,
            options: question.options ?? undefined,
            answer_key: question.answerKey || null,
            marking_criteria: question.markingCriteria || null,
            explanation: question.explanation,
            max_points: question.maxPoints,
            sort_order: index + 1,
          },
        });

        if (question.citations.length > 0) {
          await tx.questionCitation.createMany({
            data: question.citations.map((citation) => ({
              question_id: createdQuestion.id,
              segment_id: citation.segmentId,
              excerpt: citation.excerpt || null,
            })),
          });
        }
      }

      await tx.exerciseActivity.update({
        where: { activity_id: activityId },
        data: { question_count: input.questions.length },
      });

      return this.findActivityById(activityId, tx);
    });
  },

  async deleteActivityAtomically(actorId: string, activityId: string) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.activity.findUnique({
        where: { id: activityId },
      });

      if (!existing) {
        throw new NotFoundError('Không tìm thấy hoạt động');
      }

      await requireAssignedSubjectForMutation(tx, actorId, existing.classroom_subject_id);

      await lockActivityForContentMutation(tx, activityId);

      const submissionCount = await tx.exerciseSubmission.count({
        where: { activity_id: activityId },
      });

      if (submissionCount > 0) {
        throw new ConflictError('Không thể xóa hoạt động đã có bài nộp của học sinh');
      }

      // 1. Remove linked schedule events and their owned notifications.
      const linkedEvents = await tx.scheduleEvent.findMany({
        where: { activity_id: activityId },
        select: { id: true },
      });
      const linkedEventIds = linkedEvents.map((event) => event.id);
      if (linkedEventIds.length > 0) {
        await tx.notification.deleteMany({
          where: { schedule_event_id: { in: linkedEventIds } },
        });
        await tx.scheduleEvent.deleteMany({
          where: { id: { in: linkedEventIds } },
        });
      }

      // 2. Delete question citations & questions
      await tx.questionCitation.deleteMany({
        where: { question: { exercise_activity_id: activityId } },
      });
      await tx.question.deleteMany({
        where: { exercise_activity_id: activityId },
      });

      // 3. Delete lessons link & exercise activity & notifications
      await tx.exerciseActivityLesson.deleteMany({
        where: { activity_id: activityId },
      });
      await tx.notification.deleteMany({
        where: { activity_id: activityId },
      });
      await tx.exerciseActivity.delete({
        where: { activity_id: activityId },
      });

      // 4. Delete activity record
      await tx.activity.delete({
        where: { id: activityId },
      });

      return { success: true };
    });
  },

  async putQuestionsAtomically(
    actorId: string,
    activityId: string,
    questions: QuestionInput[]
  ) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.activity.findUnique({
        where: { id: activityId },
        include: {
          exercise: {
            include: {
              lessons: { select: { lesson_id: true } },
            },
          },
        },
      });

      if (!existing?.exercise) {
        throw new NotFoundError('Không tìm thấy hoạt động bài tập');
      }

      await requireAssignedSubjectForMutation(tx, actorId, existing.classroom_subject_id);

      await lockActivityForContentMutation(tx, activityId);

      const submissionCount = await tx.exerciseSubmission.count({
        where: { activity_id: activityId },
      });

      if (submissionCount > 0) {
        throw new ConflictError('Không thể chỉnh sửa danh sách câu hỏi vì hoạt động đã có bài nộp');
      }

      validateExerciseQuestionShape(existing.exercise.exercise_type, questions);
      if (existing.status !== 'DRAFT') {
        requireQuestionCitations(questions);
      }

      const selectedLessonIds = new Set(existing.exercise.lessons.map((lesson) => lesson.lesson_id));
      const hasCitations = questions.some((question) => question.citations.length > 0);
      const eligibleSegments: EligibleActivitySegment[] = hasCitations
        ? (await tx.materialSegment.findMany({
            where: {
              processing_status: 'PROCESSED',
              materialVersion: {
                processing_status: 'PROCESSED',
                material: {
                  status: 'PUBLISHED',
                  lesson: {
                    classroom_subject_id: existing.classroom_subject_id,
                    status: 'PUBLISHED',
                    id: { in: Array.from(selectedLessonIds) },
                  },
                },
              },
            },
            select: {
              id: true,
              content: true,
              materialVersion: {
                select: {
                  id: true,
                  material: { select: { lesson_id: true, active_version_id: true } },
                },
              },
            },
          })).filter((segment) => segment.materialVersion.material.active_version_id === segment.materialVersion.id).map((segment) => ({
            id: segment.id,
            content: segment.content,
            lessonId: segment.materialVersion.material.lesson_id,
          }))
        : [];
      validateQuestionSources(questions, selectedLessonIds, eligibleSegments);

      // 1. Delete existing citations & questions
      await tx.questionCitation.deleteMany({
        where: { question: { exercise_activity_id: activityId } },
      });
      await tx.question.deleteMany({
        where: { exercise_activity_id: activityId },
      });

      // 2. Insert new questions with ordered sort_order
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const createdQuestion = await tx.question.create({
          data: {
            exercise_activity_id: activityId,
            lesson_id: q.lessonId,
            prompt: q.prompt,
            options: q.options ? q.options : undefined,
            answer_key: q.answerKey || null,
            marking_criteria: q.markingCriteria || null,
            explanation: q.explanation || '',
            max_points: q.maxPoints,
            sort_order: i + 1,
          },
        });

        if (q.citations && q.citations.length > 0) {
          await tx.questionCitation.createMany({
            data: q.citations.map((c) => ({
              question_id: createdQuestion.id,
              segment_id: c.segmentId,
              excerpt: c.excerpt || null,
            })),
          });
        }
      }

      // 3. Update question count
      await tx.exerciseActivity.update({
        where: { activity_id: activityId },
        data: { question_count: questions.length },
      });

      return this.findActivityById(activityId, tx);
    });
  },

  async publishActivityAtomically(actorId: string, activityId: string) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.activity.findUnique({
        where: { id: activityId },
        include: {
          exercise: {
            include: {
              lessons: { select: { lesson_id: true } },
              _count: { select: { questions: true } },
            },
          },
        },
      });

      if (!existing?.exercise) {
        throw new NotFoundError('Không tìm thấy hoạt động');
      }

      const context = await requireAssignedSubjectForMutation(
        tx,
        actorId,
        existing.classroom_subject_id
      );

      if (existing.exercise._count.questions === 0) {
        throw new BadRequestError('Hoạt động phải có ít nhất 1 câu hỏi để xuất bản');
      }

      const questions = await tx.question.findMany({
        where: { exercise_activity_id: activityId },
        select: {
          lesson_id: true,
          prompt: true,
          options: true,
          answer_key: true,
          marking_criteria: true,
          explanation: true,
          max_points: true,
          lesson: {
            select: {
              classroom_subject_id: true,
              status: true,
            },
          },
          citations: {
            select: {
              excerpt: true,
              segment: {
                select: {
                  id: true,
                  content: true,
                  processing_status: true,
                  materialVersion: {
                    select: {
                      processing_status: true,
                      material: {
                        select: {
                          status: true,
                          lesson: {
                            select: {
                              id: true,
                              classroom_subject_id: true,
                              status: true,
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      const questionsForValidation: QuestionInput[] = questions.map((question) => ({
        prompt: question.prompt,
        options: Array.isArray(question.options)
          ? question.options.filter((option): option is string => typeof option === 'string')
          : undefined,
        answerKey: question.answer_key ?? undefined,
        markingCriteria: question.marking_criteria ?? undefined,
        explanation: question.explanation,
        maxPoints: Number(question.max_points),
        lessonId: question.lesson_id,
        citations: question.citations.map((citation) => ({
          segmentId: citation.segment.id,
          excerpt: citation.excerpt ?? undefined,
        })),
      }));

      validateExerciseQuestionShape(existing.exercise.exercise_type, questionsForValidation);
      const selectedLessonIds = new Set(existing.exercise.lessons.map((lesson) => lesson.lesson_id));
      requireQuestionCitations(questionsForValidation);
      validateQuestionSources(
        questionsForValidation,
        selectedLessonIds,
        questions.flatMap((question) => question.citations.map((citation) => ({
          id: citation.segment.id,
          content: citation.segment.content,
          lessonId: citation.segment.materialVersion.material.lesson.id,
        })))
      );

      for (const question of questions) {
        const lessonIsEligible =
          question.lesson.classroom_subject_id === existing.classroom_subject_id &&
          question.lesson.status === 'PUBLISHED';
        if (!lessonIsEligible) {
          throw new BadRequestError('Bài học nguồn không còn đủ điều kiện xuất bản');
        }

        for (const citation of question.citations) {
          const version = citation.segment.materialVersion;
          const material = version.material;
          const sourceLesson = material.lesson;
          const citationIsEligible =
            citation.segment.processing_status === 'PROCESSED' &&
            version.processing_status === 'PROCESSED' &&
            material.status === 'PUBLISHED' &&
            sourceLesson.status === 'PUBLISHED' &&
            sourceLesson.classroom_subject_id === existing.classroom_subject_id;

          if (!citationIsEligible) {
            throw new BadRequestError('Nguồn trích dẫn không còn đủ điều kiện xuất bản');
          }
        }
      }

      const now = new Date();
      await tx.activity.update({
        where: { id: activityId },
        data: {
          status: 'PUBLISHED',
          published_at: existing.published_at ?? now,
        },
      });

      // Idempotent notification creation
      const activeEnrollments = await tx.classroomEnrollment.findMany({
        where: {
          classroom_id: context.classroomId,
          left_at: null,
        },
        select: { student_id: true },
      });

      const dedupeKey = `activity:${activityId}`;
      const title = `Hoạt động mới: ${existing.title}`;
      const body = `Giáo viên đã công bố bài tập "${existing.title}" môn ${context.subjectName}. Vui lòng hoàn thành trước hạn nộp.`;

      if (activeEnrollments.length > 0) {
        await tx.notification.createMany({
          data: activeEnrollments.map((enr) => ({
            recipient_id: enr.student_id,
            activity_id: activityId,
            dedupe_key: dedupeKey,
            title,
            body,
          })),
          skipDuplicates: true,
        });
      }

      return this.findActivityById(activityId, tx);
    });
  },

  async closeActivityAtomically(actorId: string, activityId: string) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.activity.findUnique({
        where: { id: activityId },
      });

      if (!existing) {
        throw new NotFoundError('Không tìm thấy hoạt động');
      }

      await requireAssignedSubjectForMutation(tx, actorId, existing.classroom_subject_id);

      if (existing.status !== 'PUBLISHED') {
        throw new BadRequestError('Chỉ có thể đóng hoạt động đang được công bố (PUBLISHED)');
      }

      await tx.activity.update({
        where: { id: activityId },
        data: {
          status: 'CLOSED',
          closes_at: new Date(),
        },
      });

      return this.findActivityById(activityId, tx);
    });
  },

  async reopenActivityAtomically(
    actorId: string,
    activityId: string,
    input: ReopenActivityInput
  ) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.activity.findUnique({
        where: { id: activityId },
      });

      if (!existing) {
        throw new NotFoundError('Không tìm thấy hoạt động');
      }

      await requireAssignedSubjectForMutation(tx, actorId, existing.classroom_subject_id);

      if (existing.status !== 'CLOSED') {
        throw new BadRequestError('Chỉ có thể mở lại hoạt động đã đóng (CLOSED)');
      }

      await tx.activity.update({
        where: { id: activityId },
        data: {
          status: 'PUBLISHED',
          closes_at: input.closesAt ? new Date(input.closesAt) : null,
        },
      });

      return this.findActivityById(activityId, tx);
    });
  },

  async findSubmissions(activityId: string) {
    return prisma.exerciseSubmission.findMany({
      where: { activity_id: activityId },
      orderBy: { submitted_at: 'asc' },
      include: {
        student: {
          select: {
            id: true,
            full_name: true,
            username: true,
          },
        },
      },
    });
  },

  async findEligibleSegments(classroomSubjectId: string, lessonIds: string[]) {
    const segments = await prisma.materialSegment.findMany({
      where: {
        processing_status: 'PROCESSED',
        materialVersion: {
          processing_status: 'PROCESSED',
          material: {
            status: 'PUBLISHED',
            lesson: {
              classroom_subject_id: classroomSubjectId,
              id: { in: lessonIds },
              status: 'PUBLISHED',
            },
          },
        },
      },
      select: {
        id: true,
        content: true,
        materialVersion: {
          select: {
            id: true,
            material: {
              select: {
                id: true,
                lesson_id: true,
                active_version_id: true,
                file_name: true,
              },
            },
          },
        },
      },
    });

    return segments.filter((segment) => segment.materialVersion.material.active_version_id === segment.materialVersion.id);
  },
};
