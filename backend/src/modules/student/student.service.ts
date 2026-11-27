import { prisma } from '../../lib/prisma.js';
import { AppError, BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../../shared/errors/app-error.js';
import { defaultStorageProvider } from '../storage/storage-factory.js';
import { generateStorageKey, validateMaterialFile } from '../storage/file-validation.js';
import { aiDraftProvider } from '../teacher/activities/activity-ai-draft.provider.js';

const publishedMaterialsInclude = {
  where: { status: 'PUBLISHED' as const },
  orderBy: { created_at: 'asc' as const },
  include: {
    versions: {
      where: { processing_status: 'PROCESSED' as const, published_at: { not: null } },
      orderBy: { version_no: 'desc' as const },
      take: 1,
      select: {
        id: true,
        version_no: true,
        processing_status: true,
        published_at: true,
        segments: {
          orderBy: { ordinal: 'asc' as const },
          select: { id: true, content: true, position_label: true },
        },
      },
    },
  },
};

const publishedLessonInclude = {
  where: { status: 'PUBLISHED' as const },
  orderBy: { published_at: 'desc' as const },
  include: { materials: publishedMaterialsInclude },
};

function requiredAnswer(answers: Map<string, string>, questionId: string) {
  const answer = answers.get(questionId);
  if (answer === undefined) throw new BadRequestError('Cần trả lời tất cả câu hỏi');
  return answer;
}

function shapeLesson(lesson: {
  id: string;
  title: string;
  published_at: Date | null;
  materials: Array<{
    id: string;
    file_name: string;
    versions: Array<{
      id: string;
      version_no: number;
      processing_status: string;
      published_at: Date | null;
      segments: Array<{ id: string; content: string; position_label: string }>;
    }>;
  }>;
}) {
  return {
    id: lesson.id,
    title: lesson.title,
    publishedAt: lesson.published_at,
    materials: lesson.materials.map((material) => ({
      id: material.id,
      name: material.file_name,
      versions: material.versions.map((version) => ({
        id: version.id,
        number: version.version_no,
        processingStatus: version.processing_status,
        publishedAt: version.published_at,
        sources: version.segments.map((segment) => ({
          id: segment.id,
          content: segment.content,
          position: segment.position_label,
        })),
      })),
    })),
  };
}

async function getMemberships(studentId: string) {
  return prisma.classroomEnrollment.findMany({
    where: { student_id: studentId },
    orderBy: [{ joined_at: 'desc' }, { classroom: { academic_year: 'desc' } }],
    include: {
      classroom: {
        include: {
          classroomSubjects: {
            include: {
              subject: true,
              teacher: { select: { id: true, full_name: true } },
              lessons: publishedLessonInclude,
            },
          },
        },
      },
    },
  });
}

function shapeMembership(enrollment: Awaited<ReturnType<typeof getMemberships>>[number]) {
  const classroom = enrollment.classroom;
  return {
    enrollmentId: enrollment.id,
    joinedAt: enrollment.joined_at,
    leftAt: enrollment.left_at,
    classroom: {
      id: classroom.id,
      name: classroom.name,
      gradeLevel: classroom.grade_level,
      academicYear: classroom.academic_year,
      status: classroom.status,
    },
    subjects: classroom.classroomSubjects.map((classroomSubject) => ({
      id: classroomSubject.id,
      subjectId: classroomSubject.subject.id,
      name: classroomSubject.subject.name,
      teacher: classroomSubject.teacher ? {
        id: classroomSubject.teacher.id,
        name: classroomSubject.teacher.full_name,
      } : null,
      lessons: classroomSubject.lessons.map(shapeLesson),
    })),
  };
}

export const studentService = {
  async getWorkspace(studentId: string) {
    const [student, enrollments] = await Promise.all([
      prisma.user.findUnique({
        where: { id: studentId },
        select: { id: true, username: true, full_name: true },
      }),
      getMemberships(studentId),
    ]);
    if (!student) throw new NotFoundError('Không tìm thấy tài khoản học sinh');

    const current = enrollments.find((item) => item.left_at === null && item.classroom.status === 'ACTIVE') ?? null;
    const history = enrollments.filter((item) => item.id !== current?.id);
    return {
      student: { id: student.id, username: student.username, name: student.full_name },
      current: current ? shapeMembership(current) : null,
      history: history.map(shapeMembership),
    };
  },

  async getLesson(studentId: string, lessonId: string) {
    const memberships = await prisma.classroomEnrollment.findMany({
      where: { student_id: studentId },
      select: { classroom_id: true },
    });
    const lesson = await prisma.lesson.findFirst({
      where: {
        id: lessonId,
        status: 'PUBLISHED',
        classroomSubject: { classroom_id: { in: memberships.map((item) => item.classroom_id) } },
      },
      select: {
        id: true,
        classroom_subject_id: true,
        title: true,
        published_at: true,
        classroomSubject: { include: { classroom: true, subject: true } },
        materials: publishedMaterialsInclude,
      },
    });
    if (!lesson) throw new NotFoundError('Không tìm thấy bài học đã công bố');

    return {
      ...shapeLesson(lesson),
      subject: { id: lesson.classroom_subject_id, name: lesson.classroomSubject.subject.name },
      classroom: {
        id: lesson.classroomSubject.classroom.id,
        name: lesson.classroomSubject.classroom.name,
        academicYear: lesson.classroomSubject.classroom.academic_year,
        status: lesson.classroomSubject.classroom.status,
      },
    };
  },

  async createPracticeSession(studentId: string, input: { classroomSubjectId: string; lessonIds: string[]; exerciseType: 'QUIZ' | 'WRITTEN'; difficulty: 'BASIC' | 'INTERMEDIATE' | 'ADVANCED'; questionCount: number }) {
    const membership = await prisma.classroomEnrollment.findFirst({
      where: { student_id: studentId, left_at: null, classroom: { status: 'ACTIVE' } },
      select: { classroom_id: true },
    });
    if (!membership) throw new ForbiddenError('Chỉ học sinh có lớp hiện tại mới tạo được phiên tự ôn');
    const subject = await prisma.classroomSubject.findFirst({
      where: { id: input.classroomSubjectId, classroom_id: membership.classroom_id },
      select: { id: true },
    });
    if (!subject) throw new ForbiddenError('Môn học không thuộc lớp hiện tại');
    if (!input.lessonIds.length || new Set(input.lessonIds).size !== input.lessonIds.length) throw new BadRequestError('Chọn ít nhất một bài học khác nhau');

    const lessons = await prisma.lesson.findMany({
      where: {
        id: { in: input.lessonIds }, classroom_subject_id: subject.id, status: 'PUBLISHED',
        materials: { some: { status: 'PUBLISHED', versions: { some: { processing_status: 'PROCESSED', published_at: { not: null } } } } },
      },
      select: { id: true, title: true },
    });
    if (lessons.length !== input.lessonIds.length) throw new BadRequestError('Chỉ chọn bài đã công bố có học liệu xử lý thành công');
    const segments = await prisma.materialSegment.findMany({
      where: {
        processing_status: 'PROCESSED',
        materialVersion: {
          processing_status: 'PROCESSED', published_at: { not: null },
          material: { status: 'PUBLISHED', lesson_id: { in: input.lessonIds } },
        },
      },
      select: {
        id: true,
        content: true,
        materialVersion: { select: { material: { select: { lesson_id: true, file_name: true } } } },
      },
      orderBy: { ordinal: 'asc' },
    });
    const draft = await aiDraftProvider.generateDraft({
      exerciseType: input.exerciseType,
      difficulty: input.difficulty,
      questionCount: input.questionCount,
      lessonIds: input.lessonIds,
      teacherInstructions: '',
      segments: segments.map((segment) => ({ id: segment.id, content: segment.content, lessonId: segment.materialVersion.material.lesson_id, materialTitle: segment.materialVersion.material.file_name })),
    });
    if (draft.status !== 'READY') throw new AppError(draft.message ?? 'Dịch vụ AI tạo câu hỏi chưa khả dụng', 503, 'AI_UNAVAILABLE');
    if (draft.questions.length !== input.questionCount) throw new AppError('Dịch vụ AI không trả về đủ câu hỏi hợp lệ', 502, 'AI_INVALID_RESPONSE');
    const allowedSegmentIds = new Set(segments.map((segment) => segment.id));
    if (draft.questions.some((question) => !input.lessonIds.includes(question.lessonId) || question.citations.some((citation) => !allowedSegmentIds.has(citation.segmentId)))) {
      throw new AppError('Dịch vụ AI trả về câu hỏi hoặc trích dẫn ngoài nguồn đã chọn', 502, 'AI_INVALID_RESPONSE');
    }

    return prisma.selfPracticeSession.create({
      data: {
        student_id: studentId,
        classroom_subject_id: subject.id,
        exercise_type: input.exerciseType,
        difficulty: input.difficulty,
        question_count: input.questionCount,
        status: 'PENDING',
        lessons: { create: input.lessonIds.map((lessonId) => ({ lesson_id: lessonId })) },
        questions: { create: draft.questions.map((question, index) => ({
          lesson_id: question.lessonId,
          prompt: question.prompt,
          options: question.options,
          max_points: question.maxPoints,
          answer_key: question.answerKey,
          marking_criteria: question.markingCriteria,
          explanation: question.explanation,
          sort_order: index,
          citations: { create: question.citations.map((citation) => ({ segment_id: citation.segmentId, excerpt: citation.excerpt })) },
        })) },
      },
      include: { questions: { orderBy: { sort_order: 'asc' }, select: { id: true, prompt: true, options: true, max_points: true, lesson_id: true, lesson: { select: { id: true, title: true } }, citations: { include: { segment: { select: { id: true, position_label: true } } } } } } },
    });
  },

  async submitPracticeSession(studentId: string, sessionId: string, input: { answers: Array<{ questionId: string; answer: string }> }) {
    return prisma.$transaction(async (tx) => {
      const session = await tx.selfPracticeSession.findFirst({
        where: { id: sessionId, student_id: studentId },
        include: { questions: { orderBy: { sort_order: 'asc' }, include: { citations: true } }, classroomSubject: { include: { classroom: true } } },
      });
      if (!session) throw new NotFoundError('Không tìm thấy phiên tự ôn');
      const enrollment = await tx.classroomEnrollment.findFirst({
        where: { student_id: studentId, classroom_id: session.classroomSubject.classroom_id, left_at: null, classroom: { status: 'ACTIVE' } },
        select: { id: true },
      });
      if (!enrollment) throw new ForbiddenError('Chỉ nộp phiên tự ôn trong lớp hiện tại');
      if (session.submitted_at) throw new ConflictError('Phiên tự ôn này đã được nộp');
      const questions = session.questions;
      const answerMap = new Map(input.answers.map((answer) => [answer.questionId, answer.answer.trim()]));
      if (answerMap.size !== questions.length || questions.some((question) => !answerMap.has(question.id))
        || input.answers.some((answer) => !questions.some((question) => question.id === answer.questionId))) {
        throw new BadRequestError('Cần trả lời đúng một lần cho tất cả câu hỏi trong phiên');
      }
      if ([...answerMap.values()].some((answer) => !answer)) throw new BadRequestError('Câu trả lời không được để trống');
      const isQuiz = session.exercise_type === 'QUIZ';
      const now = new Date();
      const answers = questions.map((question) => {
        const answer = requiredAnswer(answerMap, question.id);
        return {
          question,
          answer,
          earned: isQuiz && answer === question.answer_key ? Number(question.max_points) : isQuiz ? 0 : null,
        };
      });
      const records = await Promise.all(answers.map(({ question, answer, earned }) => tx.studentAnswer.create({
        data: {
          question_id: question.id,
          self_practice_session_id: sessionId,
          answer,
          earned_points: earned,
          grading_status: isQuiz ? 'GRADED' : 'PENDING',
          explanation: isQuiz ? question.explanation : null,
          ...(isQuiz && question.citations.length ? { citations: { create: question.citations.map((citation) => ({ segment_id: citation.segment_id, excerpt: citation.excerpt })) } } : {}),
        },
      })));
      const total = isQuiz ? answers.reduce((sum, answer) => sum + (answer.earned ?? 0), 0) : null;
      const updated = await tx.selfPracticeSession.update({
        where: { id: sessionId },
        data: { submitted_at: now, completed_at: isQuiz ? now : null, status: isQuiz ? 'GRADED' : 'PENDING', total_score: total },
      });
      if (isQuiz) {
        const perLesson = new Map<string, { earned: number; maximum: number }>();
        for (const { question, earned } of answers) {
          const score = perLesson.get(question.lesson_id) ?? { earned: 0, maximum: 0 };
          score.earned += earned ?? 0;
          score.maximum += Number(question.max_points);
          perLesson.set(question.lesson_id, score);
        }
        for (const [lessonId, score] of perLesson) {
          await tx.lessonScoreResult.create({ data: {
            student_id: studentId, classroom_subject_id: session.classroom_subject_id, lesson_id: lessonId,
            stream: 'SELF_PRACTICE', self_practice_session_id: sessionId, earned_points: score.earned,
            max_points: score.maximum, occurred_at: now, graded_at: now,
          } });
          const history = await tx.lessonScoreResult.findMany({ where: { student_id: studentId, lesson_id: lessonId, stream: 'SELF_PRACTICE' }, orderBy: [{ occurred_at: 'asc' }, { id: 'asc' }] });
          let hasDifficulty = false;
          for (const result of history) {
            const percent = Number(result.earned_points) / Number(result.max_points) * 100;
            if (percent < 50) hasDifficulty = true;
            else if (percent >= 70) hasDifficulty = false;
          }
          const lastResult = history.at(-1);
          if (!lastResult) throw new AppError('Không thể cập nhật tiến độ tự ôn', 500, 'PROGRESS_UPDATE_FAILED');
          await tx.studentLessonProgress.upsert({
            where: { student_id_lesson_id_stream: { student_id: studentId, lesson_id: lessonId, stream: 'SELF_PRACTICE' } },
            create: { student_id: studentId, lesson_id: lessonId, stream: 'SELF_PRACTICE', has_difficulty: hasDifficulty, last_result_id: lastResult.id },
            update: { has_difficulty: hasDifficulty, last_result_id: lastResult.id },
          });
        }
      }
      return { id: updated.id, status: updated.status, totalScore: updated.total_score, answers: records.length };
    });
  },

  async listActivities(studentId: string) {
    const memberships = await prisma.classroomEnrollment.findMany({
      where: { student_id: studentId }, select: { classroom_id: true },
    });
    const classroomIds = memberships.map((item) => item.classroom_id);
    return prisma.activity.findMany({
      where: {
        classroomSubject: { classroom_id: { in: classroomIds } },
        status: { in: ['PUBLISHED', 'CLOSED'] },
        published_at: { not: null },
      },
      orderBy: [{ closes_at: 'asc' }, { published_at: 'desc' }],
      include: {
        classroomSubject: { include: { classroom: true, subject: true } },
        exercise: {
          include: {
            lessons: { include: { lesson: { select: { id: true, title: true } } } },
            questions: {
              orderBy: { sort_order: 'asc' },
              select: {
                id: true, prompt: true, options: true, max_points: true,
                explanation: true, lesson_id: true, sort_order: true,
                lesson: { select: { id: true, title: true } },
                citations: { include: { segment: { select: { id: true, position_label: true } } } },
              },
            },
            submissions: {
              where: { student_id: studentId },
              include: { answers: { include: { citations: true } }, scoreResults: true },
            },
          },
        },
        notebookCheck: {
          include: {
            criteria: { orderBy: { order_index: 'asc' } },
            periods: {
              orderBy: { period_no: 'desc' },
              include: {
                submissions: {
                  where: { student_id: studentId },
                  orderBy: { submitted_at: 'desc' },
                  include: {
                    files: { orderBy: { sort_order: 'asc' }, select: { id: true, mime_type: true, byte_size: true, sort_order: true } },
                    assessment: { include: { results: { include: { criterion: true } } } },
                  },
                },
              },
            },
          },
        },
      },
    });
  },

  async submitExercise(studentId: string, activityId: string, input: { answers: Array<{ questionId: string; answer: string }> }) {
    try {
      return await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM activities WHERE id = ${activityId}::uuid FOR UPDATE`;
        const activity = await tx.activity.findFirst({
          where: { id: activityId, kind: 'EXERCISE' },
          include: {
            classroomSubject: { include: { classroom: true } },
            exercise: { include: { questions: { orderBy: { sort_order: 'asc' }, include: { citations: true } } } },
          },
        });
        if (!activity?.exercise) throw new NotFoundError('Không tìm thấy bài tập');

        const enrollment = await tx.classroomEnrollment.findFirst({
          where: {
            student_id: studentId,
            classroom_id: activity.classroomSubject.classroom_id,
            left_at: null,
            classroom: { status: 'ACTIVE' },
          },
          select: { id: true },
        });
        if (!enrollment) throw new ForbiddenError('Chỉ học sinh của lớp hiện tại mới được nộp bài');
        const now = new Date();
        if (activity.status !== 'PUBLISHED' || !activity.published_at || (activity.closes_at && activity.closes_at <= now)) {
          throw new ConflictError('Hoạt động đã đóng hoặc chưa được công bố');
        }
        const existing = await tx.exerciseSubmission.findUnique({
          where: { student_id_activity_id: { student_id: studentId, activity_id: activityId } },
          select: { id: true },
        });
        if (existing) throw new ConflictError('Bài này đã được nộp; mỗi hoạt động chỉ nhận một bài nộp');

        const questions = activity.exercise.questions;
        const answerMap = new Map(input.answers.map((answer) => [answer.questionId, answer.answer.trim()]));
        if (answerMap.size !== questions.length || questions.some((question) => !answerMap.has(question.id))
          || input.answers.some((answer) => !questions.some((question) => question.id === answer.questionId))) {
          throw new BadRequestError('Cần trả lời đúng một lần cho tất cả câu hỏi trong bài');
        }
        if ([...answerMap.values()].some((answer) => !answer)) throw new BadRequestError('Câu trả lời không được để trống');

        const isQuiz = activity.exercise.exercise_type === 'QUIZ';
        const gradedAnswers = questions.map((question) => {
          const answer = requiredAnswer(answerMap, question.id);
          return {
            question,
            answer,
            earned: isQuiz && answer === question.answer_key ? Number(question.max_points) : isQuiz ? 0 : null,
          };
        });
        const submission = await tx.exerciseSubmission.create({
          data: {
            student_id: studentId,
            activity_id: activityId,
            grading_status: isQuiz ? 'GRADED' : 'PENDING',
            total_score: isQuiz ? gradedAnswers.reduce((total, answer) => total + (answer.earned ?? 0), 0) : null,
            graded_at: isQuiz ? now : null,
            answers: {
              create: gradedAnswers.map(({ question, answer, earned }) => ({
                question_id: question.id,
                answer,
                earned_points: earned,
                grading_status: isQuiz ? 'GRADED' : 'PENDING',
                explanation: isQuiz ? question.explanation : null,
                ...(isQuiz && question.citations.length ? {
                  citations: { create: question.citations.map((citation) => ({ segment_id: citation.segment_id, excerpt: citation.excerpt })) },
                } : {}),
              })),
            },
          },
          include: { answers: true },
        });

        if (isQuiz) {
          const perLesson = new Map<string, { earned: number; maximum: number }>();
          for (const { question, earned } of gradedAnswers) {
            const scores = perLesson.get(question.lesson_id) ?? { earned: 0, maximum: 0 };
            scores.earned += earned ?? 0;
            scores.maximum += Number(question.max_points);
            perLesson.set(question.lesson_id, scores);
          }
          for (const [lessonId, score] of perLesson) {
            await tx.lessonScoreResult.create({
              data: {
                student_id: studentId,
                classroom_subject_id: activity.classroom_subject_id,
                lesson_id: lessonId,
                stream: 'ASSIGNED',
                exercise_submission_id: submission.id,
                earned_points: score.earned,
                max_points: score.maximum,
                occurred_at: submission.submitted_at,
                graded_at: now,
              },
            });
            const history = await tx.lessonScoreResult.findMany({
              where: { student_id: studentId, lesson_id: lessonId, stream: 'ASSIGNED' },
              orderBy: [{ occurred_at: 'asc' }, { id: 'asc' }],
            });
            let hasDifficulty = false;
            for (const result of history) {
              const percent = Number(result.earned_points) / Number(result.max_points) * 100;
              if (percent < 50) hasDifficulty = true;
              else if (percent >= 70) hasDifficulty = false;
            }
            const lastResult = history.at(-1);
            if (!lastResult) throw new AppError('Không thể cập nhật tiến độ bài được giao', 500, 'PROGRESS_UPDATE_FAILED');
            await tx.studentLessonProgress.upsert({
              where: { student_id_lesson_id_stream: { student_id: studentId, lesson_id: lessonId, stream: 'ASSIGNED' } },
              create: { student_id: studentId, lesson_id: lessonId, stream: 'ASSIGNED', has_difficulty: hasDifficulty, last_result_id: lastResult.id },
              update: { has_difficulty: hasDifficulty, last_result_id: lastResult.id },
            });
          }
        }

        return {
          id: submission.id,
          submittedAt: submission.submitted_at,
          gradingStatus: submission.grading_status,
          totalScore: submission.total_score,
          message: isQuiz ? 'Bài đã được lưu và chấm.' : 'Bài đã được lưu. Câu trả lời đang chờ chấm; chưa có điểm.',
        };
      });
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
        throw new ConflictError('Bài này đã được nộp; mỗi hoạt động chỉ nhận một bài nộp');
      }
      throw error;
    }
  },

  async saveNotebookImages(studentId: string, activityId: string, files: Array<{ originalname: string; mimetype: string; size: number; buffer: Buffer }>, mode: 'append' | 'replace') {
    if (!files.length) throw new BadRequestError('Chọn ít nhất một ảnh JPEG hoặc PNG');
    for (const file of files) {
      const validation = validateMaterialFile(file);
      if (!validation.isValid || !['image/jpeg', 'image/png'].includes(file.mimetype)) {
        throw new BadRequestError(validation.error ?? 'Chỉ chấp nhận ảnh JPEG hoặc PNG hợp lệ');
      }
    }

    const keys = files.map((file) => generateStorageKey(file.originalname));
    try {
      for (let index = 0; index < files.length; index += 1) {
        await defaultStorageProvider.put(keys[index], files[index].buffer, files[index].mimetype);
      }
    } catch (error) {
      await Promise.all(keys.map((key) => defaultStorageProvider.delete(key).catch(() => undefined)));
      throw error;
    }

    let oldKeys: string[] = [];
    let result: Awaited<ReturnType<typeof prisma.$transaction>>;
    try {
      result = await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM activities WHERE id = ${activityId}::uuid FOR UPDATE`;
        const activity = await tx.activity.findFirst({
          where: { id: activityId, kind: 'NOTEBOOK_CHECK', status: 'PUBLISHED' },
          include: { classroomSubject: { include: { classroom: true } }, notebookCheck: { include: { periods: { orderBy: { period_no: 'desc' }, take: 1 } } } },
        });
        if (!activity?.notebookCheck) throw new NotFoundError('Không tìm thấy kiểm tra vở đã công bố');
        const enrollment = await tx.classroomEnrollment.findFirst({
          where: { student_id: studentId, classroom_id: activity.classroomSubject.classroom_id, left_at: null, classroom: { status: 'ACTIVE' } },
          select: { id: true },
        });
        if (!enrollment) throw new ForbiddenError('Chỉ học sinh của lớp hiện tại mới được nộp ảnh');
        const period = activity.notebookCheck.periods[0];
        if (!period || period.closed_at || period.due_at <= new Date()) throw new ConflictError('Thời gian nộp đã đóng');

        let submission = await tx.notebookSubmission.findUnique({
          where: { student_id_period_id: { student_id: studentId, period_id: period.id } },
          include: { files: { orderBy: { sort_order: 'asc' } } },
        });
        if (submission && submission.status !== 'CURRENT') throw new ConflictError('Bài nộp đã khóa và không thể sửa');
        if (submission) {
          oldKeys = mode === 'replace' ? submission.files.map((file) => file.storage_key) : [];
          const offset = mode === 'append' ? submission.files.length : 0;
          if (mode === 'replace') await tx.notebookSubmissionFile.deleteMany({ where: { submission_id: submission.id } });
          if (mode === 'append' && submission.files.length + files.length > 10) throw new BadRequestError('Mỗi bài nộp tối đa 10 ảnh');
          submission = await tx.notebookSubmission.update({
            where: { id: submission.id },
            data: {
              updated_at: new Date(),
              files: { create: files.map((file, index) => ({ storage_key: keys[index], mime_type: file.mimetype, byte_size: file.size, sort_order: offset + index })) },
            },
            include: { files: { orderBy: { sort_order: 'asc' } } },
          });
        } else {
          if (mode === 'append') throw new BadRequestError('Chưa có bài nộp hiện tại; hãy thay ảnh để tạo bài nộp mới');
          if (files.length > 10) throw new BadRequestError('Mỗi bài nộp tối đa 10 ảnh');
          submission = await tx.notebookSubmission.create({
            data: {
              student_id: studentId,
              period_id: period.id,
              files: { create: files.map((file, index) => ({ storage_key: keys[index], mime_type: file.mimetype, byte_size: file.size, sort_order: index })) },
            },
            include: { files: { orderBy: { sort_order: 'asc' } } },
          });
        }
        if (!activity.notebookCheck.criteria_locked_at) {
          await tx.notebookCheckActivity.update({ where: { activity_id: activityId }, data: { criteria_locked_at: new Date() } });
        }
        return { id: submission.id, status: submission.status, submittedAt: submission.submitted_at, updatedAt: submission.updated_at, files: submission.files.map((file) => ({ id: file.id, mimeType: file.mime_type, order: file.sort_order })) };
      });
    } catch (error) {
      await Promise.all(keys.map((key) => defaultStorageProvider.delete(key).catch(() => undefined)));
      throw error;
    }
    await Promise.all(oldKeys.map((key) => defaultStorageProvider.delete(key).catch(() => undefined)));
    return result;
  },

  async deleteNotebookSubmission(studentId: string, submissionId: string) {
    const submission = await prisma.notebookSubmission.findFirst({
      where: {
        id: submissionId,
        student_id: studentId,
        status: 'CURRENT',
        period: { closed_at: null, due_at: { gt: new Date() }, activity: { activity: { status: 'PUBLISHED', classroomSubject: { classroom: { status: 'ACTIVE', enrollments: { some: { student_id: studentId, left_at: null } } } } } } },
      },
      include: { files: true },
    });
    if (!submission) throw new ConflictError('Bài nộp không còn ở trạng thái có thể xóa');
    await prisma.$transaction(async (tx) => {
      await tx.notebookSubmissionFile.deleteMany({ where: { submission_id: submissionId } });
      await tx.notebookSubmission.delete({ where: { id: submissionId } });
    });
    await Promise.all(submission.files.map((file) => defaultStorageProvider.delete(file.storage_key)));
    return { success: true };
  },

  async getNotebookFile(studentId: string, submissionId: string, fileId: string) {
    const file = await prisma.notebookSubmissionFile.findFirst({
      where: { id: fileId, submission_id: submissionId, submission: { student_id: studentId } },
      select: { storage_key: true, mime_type: true },
    });
    if (!file) throw new NotFoundError('Không tìm thấy ảnh bài nộp');
    return { buffer: await defaultStorageProvider.open(file.storage_key), mimeType: file.mime_type };
  },

  async listResults(studentId: string) {
    const [exerciseSubmissions, notebookSubmissions] = await Promise.all([
      prisma.exerciseSubmission.findMany({
        where: { student_id: studentId },
        orderBy: { submitted_at: 'desc' },
        include: {
          activity: {
            include: {
              activity: { include: { classroomSubject: { include: { classroom: true, subject: true } } } },
            },
          },
          answers: {
            include: {
              question: {
                select: {
                  id: true,
                  prompt: true,
                  max_points: true,
                  lesson: { select: { id: true, title: true } },
                  citations: {
                    include: {
                      segment: {
                        include: {
                          materialVersion: {
                            select: { version_no: true, material: { select: { file_name: true, lesson_id: true } } },
                          },
                        },
                      },
                    },
                  },
                },
              },
              citations: {
                include: {
                  segment: {
                    include: {
                      materialVersion: {
                        select: { version_no: true, material: { select: { file_name: true, lesson_id: true } } },
                      },
                    },
                  },
                },
              },
            },
          },
          scoreResults: { include: { lesson: true, classroomSubject: { include: { subject: true, classroom: true } } } },
        },
      }),
      prisma.notebookSubmission.findMany({
        where: { student_id: studentId, assessment: { isNot: null } },
        orderBy: { submitted_at: 'desc' },
        include: {
          period: {
            include: {
              activity: {
                include: {
                  activity: { include: { classroomSubject: { include: { classroom: true, subject: true } } } },
                  criteria: { orderBy: { order_index: 'asc' } },
                },
              },
            },
          },
          assessment: { include: { evaluator: { select: { full_name: true } }, results: { include: { criterion: true } } } },
        },
      }),
    ]);
    return { exercises: exerciseSubmissions, notebooks: notebookSubmissions };
  },

  async getProfile(studentId: string) {
    const [points, progress] = await Promise.all([
      prisma.lessonScoreResult.findMany({
        where: { student_id: studentId },
        orderBy: [{ occurred_at: 'asc' }, { id: 'asc' }],
        include: { lesson: { select: { id: true, title: true } }, classroomSubject: { include: { classroom: true, subject: true } } },
      }),
      prisma.studentLessonProgress.findMany({
        where: { student_id: studentId },
        include: { lesson: { select: { id: true, title: true, classroom_subject_id: true } } },
      }),
    ]);
    return { points, progress };
  },

  async getCalendar(studentId: string) {
    const memberships = await prisma.classroomEnrollment.findMany({
      where: { student_id: studentId }, select: { classroom_id: true },
    });
    const classroomIds = memberships.map((item) => item.classroom_id);
    const events = await prisma.scheduleEvent.findMany({
      where: {
        classroomSubject: { classroom_id: { in: classroomIds } },
        published_at: { not: null },
      },
      orderBy: { starts_at: 'asc' },
      select: {
        id: true,
        classroom_subject_id: true,
        title: true,
        details: true,
        event_type: true,
        starts_at: true,
        published_at: true,
        lesson_id: true,
        activity_id: true,
        classroomSubject: { include: { classroom: true, subject: true } },
        lesson: { select: { id: true, title: true } },
        activity: { select: { id: true, title: true, kind: true } },
        notifications: { where: { recipient_id: studentId }, select: { id: true, read_at: true } },
      },
    });
    const notifications = await prisma.notification.findMany({
      where: { recipient_id: studentId, OR: [
        { scheduleEvent: { classroomSubject: { classroom_id: { in: classroomIds } } } },
        { activity: { classroomSubject: { classroom_id: { in: classroomIds } } } },
      ] },
      orderBy: { created_at: 'desc' },
      include: {
        scheduleEvent: { select: {
          id: true,
          classroom_subject_id: true,
          lesson_id: true,
          activity_id: true,
          title: true,
          details: true,
          event_type: true,
          starts_at: true,
          published_at: true,
          classroomSubject: { include: { classroom: true, subject: true } },
          lesson: true,
          activity: true,
        } },
        activity: { include: { classroomSubject: { include: { classroom: true, subject: true } } } },
      },
    });
    return { events, notifications };
  },

  async listConversations(studentId: string) {
    const memberships = await prisma.classroomEnrollment.findMany({
      where: { student_id: studentId }, select: { classroom_id: true },
    });
    return prisma.aIConversation.findMany({
      where: { student_id: studentId, classroom_id: { in: memberships.map((item) => item.classroom_id) } },
      orderBy: { updated_at: 'desc' },
      include: {
        classroom: true,
        turns: {
          orderBy: { created_at: 'asc' },
          include: {
            messages: {
              orderBy: { created_at: 'asc' },
              include: { citations: { include: { segment: { select: { id: true, position_label: true } } } } },
            },
          },
        },
      },
    });
  },

  async createConversation(studentId: string, classroomId: string) {
    const enrollment = await prisma.classroomEnrollment.findFirst({
      where: { student_id: studentId, classroom_id: classroomId, left_at: null, classroom: { status: 'ACTIVE' } },
      select: { id: true },
    });
    if (!enrollment) throw new ForbiddenError('Chỉ tạo hội thoại mới trong lớp hiện tại');
    return prisma.aIConversation.create({
      data: { student_id: studentId, classroom_id: classroomId },
      select: { id: true, classroom_id: true, created_at: true, updated_at: true },
    });
  },

  async sendChatTurn(studentId: string, conversationId: string, input: { question: string; classroomSubjectId?: string }) {
    return prisma.$transaction(async (tx) => {
      const conversation = await tx.aIConversation.findFirst({
        where: { id: conversationId, student_id: studentId },
        include: { classroom: true },
      });
      if (!conversation) throw new NotFoundError('Không tìm thấy hội thoại');
      const enrollment = await tx.classroomEnrollment.findFirst({
        where: { student_id: studentId, classroom_id: conversation.classroom_id, left_at: null, classroom: { status: 'ACTIVE' } },
        select: { id: true },
      });
      if (!enrollment) throw new ForbiddenError('Hội thoại lớp cũ chỉ được xem lại');

      if (input.classroomSubjectId) {
        const subject = await tx.classroomSubject.findFirst({
          where: { id: input.classroomSubjectId, classroom_id: conversation.classroom_id },
          select: { id: true },
        });
        if (!subject) throw new ForbiddenError('Môn học không thuộc lớp của hội thoại này');
      }
      const source = await tx.materialSegment.findFirst({
        where: {
          processing_status: 'PROCESSED',
          materialVersion: {
            processing_status: 'PROCESSED', published_at: { not: null },
            material: {
              status: 'PUBLISHED',
              lesson: {
                status: 'PUBLISHED',
                ...(input.classroomSubjectId ? { classroom_subject_id: input.classroomSubjectId } : {}),
                classroomSubject: { classroom_id: conversation.classroom_id },
              },
            },
          },
        },
        select: { id: true },
      });
      if (!source) {
        const turn = await tx.aIChatTurn.create({
          data: {
            conversation_id: conversationId,
            status: 'ANSWERED',
            completed_at: new Date(),
            messages: {
              create: [
                { role: 'USER', content: input.question, attributed_classroom_subject_id: input.classroomSubjectId },
                { role: 'ASSISTANT', content: 'Chưa đủ bằng chứng từ học liệu đã công bố và xử lý thành công để trả lời câu hỏi này.' },
              ],
            },
          },
          select: { id: true, status: true, created_at: true },
        });
        await tx.aIConversation.update({ where: { id: conversationId }, data: { updated_at: new Date() } });
        return { ...turn, message: 'Chưa đủ bằng chứng từ nguồn học liệu được phép.' };
      }

      const turn = await tx.aIChatTurn.create({
        data: {
          conversation_id: conversationId,
          status: 'FAILED',
          completed_at: new Date(),
          messages: { create: { role: 'USER', content: input.question, attributed_classroom_subject_id: input.classroomSubjectId } },
        },
        select: { id: true, status: true, created_at: true },
      });
      await tx.aIConversation.update({ where: { id: conversationId }, data: { updated_at: new Date() } });
      return { ...turn, message: 'Câu hỏi đã lưu. Dịch vụ AI chưa được cấu hình nên chưa thể tạo câu trả lời.' };
    });
  },

  async markNotificationRead(studentId: string, notificationId: string, read: boolean) {
    const result = await prisma.notification.updateMany({
      where: { id: notificationId, recipient_id: studentId },
      data: { read_at: read ? new Date() : null },
    });
    if (!result.count) throw new NotFoundError('Không tìm thấy thông báo');
    return { id: notificationId, read };
  },

  async ensureLessonAccess(studentId: string, lessonId: string) {
    const lesson = await prisma.lesson.findFirst({
      where: { id: lessonId, status: 'PUBLISHED', classroomSubject: { classroom: { enrollments: { some: { student_id: studentId } } } } },
      select: { id: true },
    });
    if (!lesson) throw new ForbiddenError('Bài học không thuộc lớp của học sinh này');
  },
};
