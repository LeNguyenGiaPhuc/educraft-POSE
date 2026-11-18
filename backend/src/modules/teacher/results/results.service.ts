import { BadRequestError, NotFoundError } from '../../../shared/errors/app-error.js';
import { env } from '../../../config/env.js';
import { normalizeAcademicYear } from '../../../shared/academic-year.js';
import { requireAssignedSubject } from '../access/teacher-subject.policy.js';
import type { AssignedSubjectContext } from '../access/teacher-subject.policy.js';
import { resultsRepository } from './results.repository.js';
import type { PromptTopicsQuery, StatisticsQuery, SubmissionQuery } from './results.schemas.js';

type ExerciseSubmissionResult = NonNullable<
  Awaited<ReturnType<typeof resultsRepository.findExerciseSubmissionResult>>
>;
type NotebookSubmissionResult = NonNullable<
  Awaited<ReturnType<typeof resultsRepository.findNotebookSubmissionResult>>
>;

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function toIso(value: Date | string | null): string | null {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : value;
}

function toDateOnly(value: Date | string): string {
  return value instanceof Date ? value.toISOString().slice(0, 10) : value.slice(0, 10);
}

function mapSubjectContext(context: AssignedSubjectContext) {
  return {
    id: context.classroomSubjectId,
    classroom: {
      id: context.classroomId,
      name: context.classroomName,
      status: context.classroomStatus,
      academicYear: context.academicYear,
      gradeLevel: context.gradeLevel,
    },
    subject: {
      id: context.subjectId,
      name: context.subjectName,
    },
  };
}

function mapExerciseResult(submission: ExerciseSubmissionResult) {
  const activity = submission.activity.activity;
  const classroomSubject = activity.classroomSubject;
  const answers = [...submission.answers]
    .sort((left, right) => left.question.sort_order - right.question.sort_order)
    .map((answer) => ({
      id: answer.id,
      questionId: answer.question_id,
      question: {
        id: answer.question.id,
        prompt: answer.question.prompt,
        maxPoints: toNumber(answer.question.max_points),
        sortOrder: answer.question.sort_order,
        explanation: answer.question.explanation,
      },
      answer: answer.answer,
      earnedPoints: toNumber(answer.earned_points),
      explanation: answer.explanation,
      gradingStatus: answer.grading_status,
      answeredAt: answer.answered_at.toISOString(),
      citations: answer.citations.map((citation) => ({
        excerpt: citation.excerpt,
        segment: {
          id: citation.segment.id,
          positionType: citation.segment.position_type,
          positionIndex: citation.segment.position_index,
          positionLabel: citation.segment.position_label,
          content: citation.segment.content,
        },
      })),
    }));

  return {
    id: submission.id,
    kind: 'EXERCISE' as const,
    activity: {
      id: activity.id,
      title: activity.title,
      description: activity.description,
      status: activity.status,
      closesAt: toIso(activity.closes_at),
      exerciseType: submission.activity.exercise_type,
      classroomSubject: {
        id: classroomSubject.id,
        classroom: {
          id: classroomSubject.classroom.id,
          name: classroomSubject.classroom.name,
          status: classroomSubject.classroom.status,
          academicYear: classroomSubject.classroom.academic_year,
          gradeLevel: classroomSubject.classroom.grade_level,
        },
        subject: {
          id: classroomSubject.subject.id,
          name: classroomSubject.subject.name,
        },
      },
    },
    student: {
      id: submission.student.id,
      username: submission.student.username,
      fullName: submission.student.full_name,
    },
    submittedAt: submission.submitted_at.toISOString(),
    gradingStatus: submission.grading_status,
    totalScore: toNumber(submission.total_score),
    gradedAt: toIso(submission.graded_at),
    answers,
  };
}

function mapNotebookResult(submission: NotebookSubmissionResult) {
  const activity = submission.period.activity.activity;
  const classroomSubject = activity.classroomSubject;
  const assessment = submission.assessment
    ? {
        id: submission.assessment.id,
        teacherComment: submission.assessment.teacher_comment,
        reviewedAt: submission.assessment.reviewed_at.toISOString(),
        evaluator: {
          id: submission.assessment.evaluator.id,
          username: submission.assessment.evaluator.username,
          fullName: submission.assessment.evaluator.full_name,
        },
        results: submission.assessment.results.map((result) => ({
          id: result.id,
          criterionId: result.criterion_id,
          status: result.status,
          note: result.note,
          criterion: {
            id: result.criterion.id,
            content: result.criterion.content,
            orderIndex: result.criterion.order_index,
          },
        })),
      }
    : null;

  return {
    id: submission.id,
    kind: 'NOTEBOOK_CHECK' as const,
    activity: {
      id: activity.id,
      title: activity.title,
      description: activity.description,
      status: activity.status,
      classroomSubject: {
        id: classroomSubject.id,
        classroom: {
          id: classroomSubject.classroom.id,
          name: classroomSubject.classroom.name,
          status: classroomSubject.classroom.status,
          academicYear: classroomSubject.classroom.academic_year,
          gradeLevel: classroomSubject.classroom.grade_level,
        },
        subject: {
          id: classroomSubject.subject.id,
          name: classroomSubject.subject.name,
        },
      },
    },
    student: {
      id: submission.student.id,
      username: submission.student.username,
      fullName: submission.student.full_name,
    },
    period: {
      id: submission.period.id,
      periodNo: submission.period.period_no,
      dueAt: submission.period.due_at.toISOString(),
      closedAt: toIso(submission.period.closed_at),
    },
    submittedAt: submission.submitted_at.toISOString(),
    updatedAt: submission.updated_at.toISOString(),
    status: submission.status,
    processingStatus: submission.processing_status,
    criteria: submission.period.activity.criteria.map((criterion) => ({
      id: criterion.id,
      content: criterion.content,
      orderIndex: criterion.order_index,
    })),
    assessment,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeTopics(value: unknown): Array<{ label: string; count: number }> {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalized: Array<{ label: string; count: number }> = [];

  for (const item of value) {
    if (typeof item === 'string' && item.trim()) {
      normalized.push({ label: item.trim(), count: 1 });
      continue;
    }

    if (!isRecord(item) || typeof item.label !== 'string' || !item.label.trim()) {
      continue;
    }

    const count = Number(item.count);
    if (!Number.isFinite(count) || count < 0) {
      continue;
    }

    normalized.push({
      label: item.label.trim(),
      count,
    });
  }

  return normalized;
}

export const resultsService = {
  async listSubmissions(actorId: string, classroomSubjectId: string, query: SubmissionQuery) {
    await requireAssignedSubject(actorId, classroomSubjectId);

    if (query.periodId && (query.kind !== 'NOTEBOOK_CHECK' || !query.activityId)) {
      throw new BadRequestError('periodId chỉ dùng khi lọc một hoạt động kiểm tra vở');
    }

    if (query.kind === 'NOTEBOOK_CHECK' && query.activityId && !query.periodId) {
      throw new BadRequestError('Cần chọn đợt kiểm tra vở');
    }

    if (query.activityId) {
      return resultsRepository.findSubmissionRoster(classroomSubjectId, query);
    }

    return resultsRepository.findSubmissions(classroomSubjectId, query);
  },

  async getExerciseResult(actorId: string, submissionId: string) {
    const submission = await resultsRepository.findExerciseSubmissionResult(submissionId);
    if (!submission) {
      throw new NotFoundError('Không tìm thấy bài nộp bài tập');
    }

    await requireAssignedSubject(actorId, submission.activity.activity.classroom_subject_id);
    return mapExerciseResult(submission);
  },

  async getNotebookResult(actorId: string, submissionId: string) {
    const submission = await resultsRepository.findNotebookSubmissionResult(submissionId);
    if (!submission) {
      throw new NotFoundError('Không tìm thấy bài nộp kiểm tra vở');
    }

    await requireAssignedSubject(actorId, submission.period.activity.activity.classroom_subject_id);
    return mapNotebookResult(submission);
  },

  async getStatistics(actorId: string, classroomSubjectId: string, query: StatisticsQuery) {
    const context = await requireAssignedSubject(actorId, classroomSubjectId);

    if (query.activityId) {
      const activity = await resultsRepository.findStatisticsActivityScope(
        context.classroomSubjectId,
        query.activityId
      );

      if (!activity) {
        throw new NotFoundError('Không tìm thấy hoạt động cần thống kê');
      }

      if (query.periodId && activity.kind !== 'NOTEBOOK_CHECK') {
        throw new BadRequestError('periodId chỉ dùng cho hoạt động kiểm tra vở');
      }

      if (query.periodId && !activity.periodIds.includes(query.periodId)) {
        throw new NotFoundError('Không tìm thấy đợt kiểm tra thuộc hoạt động đã chọn');
      }
    }

    const statistics = await resultsRepository.findStatistics(
      context.classroomId,
      context.classroomSubjectId,
      query
    );

    return {
      classroomSubject: mapSubjectContext(context),
      ...statistics,
    };
  },

  async getStudentProgress(actorId: string, classroomSubjectId: string, studentId: string) {
    const context = await requireAssignedSubject(actorId, classroomSubjectId);
    const enrollment = await resultsRepository.findStudentInClassroom(
      context.classroomId,
      studentId
    );

    if (!enrollment) {
      throw new NotFoundError('Không tìm thấy học sinh trong lớp được phân công');
    }

    const progress = await resultsRepository.findProgress(context.classroomSubjectId, studentId);
    const lessons = new Map<
      string,
      {
        lessonId: string;
        title: string;
        hasDifficulty: boolean;
        lastResultId: string | null;
        updatedAt: string | null;
        results: Array<{
          id: string;
          earnedPoints: number | null;
          maxPoints: number | null;
          percentage: number | null;
          occurredAt: string;
          gradedAt: string;
          exerciseSubmissionId: string | null;
        }>;
      }
    >();

    for (const result of progress.scoreResults) {
      const lesson = lessons.get(result.lesson_id) ?? {
        lessonId: result.lesson_id,
        title: result.lesson.title,
        hasDifficulty: false,
        lastResultId: null,
        updatedAt: null,
        results: [],
      };
      const earnedPoints = toNumber(result.earned_points);
      const maxPoints = toNumber(result.max_points);

      lesson.results.push({
        id: result.id,
        earnedPoints,
        maxPoints,
        percentage: maxPoints && maxPoints > 0 && earnedPoints !== null
          ? (earnedPoints / maxPoints) * 100
          : null,
        occurredAt: result.occurred_at.toISOString(),
        gradedAt: result.graded_at.toISOString(),
        exerciseSubmissionId: result.exercise_submission_id,
      });
      lessons.set(result.lesson_id, lesson);
    }

    for (const item of progress.lessonProgress) {
      const lesson = lessons.get(item.lesson_id);
      if (!lesson) {
        continue;
      }

      lesson.hasDifficulty = item.has_difficulty;
      lesson.lastResultId = item.last_result_id;
      lesson.updatedAt = item.updated_at.toISOString();
    }

    return {
      classroomSubject: mapSubjectContext(context),
      student: {
        id: enrollment.student.id,
        username: enrollment.student.username,
        fullName: enrollment.student.full_name,
        status: enrollment.student.status,
      },
      lessons: Array.from(lessons.values()).sort((left, right) =>
        left.title.localeCompare(right.title)
      ),
    };
  },

  async getPromptTopics(actorId: string, classroomSubjectId: string, query: PromptTopicsQuery) {
    const context = await requireAssignedSubject(actorId, classroomSubjectId);
    if (context.classroomStatus !== 'ACTIVE') {
      throw new BadRequestError('Chỉ có thể xem tổng hợp chủ đề của lớp đang hoạt động');
    }
    if (normalizeAcademicYear(context.academicYear) !== env.CURRENT_ACADEMIC_YEAR) {
      throw new NotFoundError('Không tìm thấy phạm vi chủ đề học tập hiện tại');
    }

    if (query.studentId) {
      const enrollment = await resultsRepository.findStudentInClassroom(
        context.classroomId,
        query.studentId
      );
      if (!enrollment) {
        throw new NotFoundError('Không tìm thấy học sinh trong lớp được phân công');
      }
    }

    const topics = await resultsRepository.findPromptTopics(
      context.classroomSubjectId,
      query
    );

    return {
      classroomSubject: mapSubjectContext(context),
      items: topics.map((item) => ({
        id: item.id,
        student: {
          id: item.student.id,
          username: item.student.username,
          fullName: item.student.full_name,
        },
        periodStart: toDateOnly(item.period_start),
        periodEnd: toDateOnly(item.period_end),
        promptCount: item.prompt_count,
        generatedAt: item.generated_at.toISOString(),
        topics: normalizeTopics(item.topics),
      })),
    };
  },
};
