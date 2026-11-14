import type { GradingStatus, Prisma, SubmissionStatus } from '@prisma/client';
import { prisma } from '../../../lib/prisma.js';
import type { PromptTopicsQuery, StatisticsQuery, SubmissionQuery } from './results.schemas.js';

const exerciseStatuses = new Set(['PENDING', 'PROCESSING', 'GRADED', 'FAILED']);
const notebookStatuses = new Set(['CURRENT', 'LOCKED', 'FINALIZED']);

export interface SubmissionSummary {
  id: string;
  kind: 'EXERCISE' | 'NOTEBOOK_CHECK';
  activityId: string;
  activityTitle: string;
  student: {
    id: string;
    username: string;
    fullName: string;
  };
  submittedAt: string;
  status: string;
  score: number | null;
  gradedAt: string | null;
}

export interface SubmissionListResult {
  items: SubmissionSummary[];
  total: number;
}

export interface TeacherStatistics {
  studentCount: number;
  exercise: {
    activityCount: number;
    expectedSubmissions: number;
    submittedSubmissions: number;
    gradedSubmissions: number;
    pendingSubmissions: number;
    failedSubmissions: number;
    averageScore: number | null;
    submissionRate: number | null;
  };
  notebook: {
    activityCount: number;
    periodCount: number;
    expectedSubmissions: number;
    submittedSubmissions: number;
    finalizedSubmissions: number;
    pendingSubmissions: number;
    submissionRate: number | null;
    finalizationRate: number | null;
    criteria: Array<{
      criterionId: string;
      content: string;
      needsSupplementation: number;
      undetermined: number;
    }>;
  };
}

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

function createActivityFilter(
  classroomSubjectId: string,
  activityId: string | undefined,
  kind: 'EXERCISE' | 'NOTEBOOK_CHECK',
  includeOnlyPublishedActivities = false
): Prisma.ActivityWhereInput {
  const filter: Prisma.ActivityWhereInput = {
    classroom_subject_id: classroomSubjectId,
    kind,
  };

  if (activityId) {
    filter.id = activityId;
  }

  if (includeOnlyPublishedActivities) {
    filter.status = { in: ['PUBLISHED', 'CLOSED'] };
  }

  return filter;
}

function createExerciseSubmissionWhere(
  classroomSubjectId: string,
  query: SubmissionQuery
): Prisma.ExerciseSubmissionWhereInput | null {
  if (query.status && !exerciseStatuses.has(query.status)) {
    return null;
  }

  const where: Prisma.ExerciseSubmissionWhereInput = {
    activity: {
      activity: createActivityFilter(classroomSubjectId, query.activityId, 'EXERCISE'),
    },
  };

  if (query.studentId) {
    where.student_id = query.studentId;
  }

  if (query.status) {
    where.grading_status = query.status as GradingStatus;
  }

  return where;
}

function createNotebookSubmissionWhere(
  classroomSubjectId: string,
  query: SubmissionQuery
): Prisma.NotebookSubmissionWhereInput | null {
  if (query.status && !notebookStatuses.has(query.status)) {
    return null;
  }

  const where: Prisma.NotebookSubmissionWhereInput = {
    period: {
      activity: {
        activity: createActivityFilter(classroomSubjectId, query.activityId, 'NOTEBOOK_CHECK'),
      },
    },
  };

  if (query.studentId) {
    where.student_id = query.studentId;
  }

  if (query.status) {
    where.status = query.status as SubmissionStatus;
  }

  return where;
}

function compareSubmittedAt(left: SubmissionSummary, right: SubmissionSummary): number {
  const timeDifference =
    new Date(left.submittedAt).getTime() - new Date(right.submittedAt).getTime();

  if (timeDifference !== 0) {
    return timeDifference;
  }

  return left.id.localeCompare(right.id);
}

export const resultsRepository = {
  async findSubmissions(
    classroomSubjectId: string,
    query: SubmissionQuery
  ): Promise<SubmissionListResult> {
    const skip = (query.page - 1) * query.pageSize;
    const take = skip + query.pageSize;
    const shouldReadExercises = !query.kind || query.kind === 'EXERCISE';
    const shouldReadNotebooks = !query.kind || query.kind === 'NOTEBOOK_CHECK';

    const exerciseWhere = shouldReadExercises
      ? createExerciseSubmissionWhere(classroomSubjectId, query)
      : null;
    const notebookWhere = shouldReadNotebooks
      ? createNotebookSubmissionWhere(classroomSubjectId, query)
      : null;

    const exerciseRows = exerciseWhere
      ? await prisma.exerciseSubmission.findMany({
          where: exerciseWhere,
          orderBy: [{ submitted_at: 'asc' }, { id: 'asc' }],
          take,
          select: {
            id: true,
            submitted_at: true,
            grading_status: true,
            total_score: true,
            graded_at: true,
            student: {
              select: {
                id: true,
                username: true,
                full_name: true,
              },
            },
            activity: {
              select: {
                activity: {
                  select: {
                    id: true,
                    title: true,
                  },
                },
              },
            },
          },
        })
      : [];

    const notebookRows = notebookWhere
      ? await prisma.notebookSubmission.findMany({
          where: notebookWhere,
          orderBy: [{ submitted_at: 'asc' }, { id: 'asc' }],
          take,
          select: {
            id: true,
            submitted_at: true,
            status: true,
            assessment: {
              select: {
                reviewed_at: true,
              },
            },
            student: {
              select: {
                id: true,
                username: true,
                full_name: true,
              },
            },
            period: {
              select: {
                activity: {
                  select: {
                    activity: {
                      select: {
                        id: true,
                        title: true,
                      },
                    },
                  },
                },
              },
            },
          },
        })
      : [];

    const items: SubmissionSummary[] = [];

    for (const row of exerciseRows) {
      items.push({
        id: row.id,
        kind: 'EXERCISE',
        activityId: row.activity.activity.id,
        activityTitle: row.activity.activity.title,
        student: {
          id: row.student.id,
          username: row.student.username,
          fullName: row.student.full_name,
        },
        submittedAt: row.submitted_at.toISOString(),
        status: row.grading_status,
        score: toNumber(row.total_score),
        gradedAt: toIso(row.graded_at),
      });
    }

    for (const row of notebookRows) {
      items.push({
        id: row.id,
        kind: 'NOTEBOOK_CHECK',
        activityId: row.period.activity.activity.id,
        activityTitle: row.period.activity.activity.title,
        student: {
          id: row.student.id,
          username: row.student.username,
          fullName: row.student.full_name,
        },
        submittedAt: row.submitted_at.toISOString(),
        status: row.status,
        score: null,
        gradedAt: toIso(row.assessment?.reviewed_at ?? null),
      });
    }

    items.sort(compareSubmittedAt);

    const exerciseTotal = exerciseWhere
      ? await prisma.exerciseSubmission.count({ where: exerciseWhere })
      : 0;
    const notebookTotal = notebookWhere
      ? await prisma.notebookSubmission.count({ where: notebookWhere })
      : 0;

    return {
      items: items.slice(skip, skip + query.pageSize),
      total: exerciseTotal + notebookTotal,
    };
  },

  async findExerciseSubmissionResult(submissionId: string) {
    return prisma.exerciseSubmission.findUnique({
      where: { id: submissionId },
      select: {
        id: true,
        activity_id: true,
        submitted_at: true,
        grading_status: true,
        total_score: true,
        graded_at: true,
        student: {
          select: {
            id: true,
            username: true,
            full_name: true,
          },
        },
        activity: {
          select: {
            exercise_type: true,
            activity: {
              select: {
                id: true,
                title: true,
                description: true,
                status: true,
                closes_at: true,
                classroom_subject_id: true,
                classroomSubject: {
                  select: {
                    id: true,
                    classroom_id: true,
                    subject: { select: { id: true, name: true } },
                    classroom: {
                      select: {
                        id: true,
                        name: true,
                        academic_year: true,
                        grade_level: true,
                        status: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        answers: {
          select: {
            id: true,
            question_id: true,
            answer: true,
            earned_points: true,
            explanation: true,
            grading_status: true,
            answered_at: true,
            question: {
              select: {
                id: true,
                prompt: true,
                max_points: true,
                sort_order: true,
                explanation: true,
              },
            },
            citations: {
              select: {
                excerpt: true,
                segment: {
                  select: {
                    id: true,
                    position_type: true,
                    position_index: true,
                    position_label: true,
                    content: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  },

  async findNotebookSubmissionResult(submissionId: string) {
    return prisma.notebookSubmission.findUnique({
      where: { id: submissionId },
      select: {
        id: true,
        submitted_at: true,
        updated_at: true,
        status: true,
        processing_status: true,
        student: {
          select: {
            id: true,
            username: true,
            full_name: true,
          },
        },
        period: {
          select: {
            id: true,
            period_no: true,
            due_at: true,
            closed_at: true,
            activity: {
              select: {
                activity: {
                  select: {
                    id: true,
                    title: true,
                    description: true,
                    status: true,
                    classroom_subject_id: true,
                    classroomSubject: {
                      select: {
                        id: true,
                        classroom_id: true,
                        subject: { select: { id: true, name: true } },
                        classroom: {
                          select: {
                            id: true,
                            name: true,
                            academic_year: true,
                            grade_level: true,
                            status: true,
                          },
                        },
                      },
                    },
                  },
                },
                criteria: {
                  orderBy: { order_index: 'asc' },
                  select: {
                    id: true,
                    content: true,
                    order_index: true,
                  },
                },
              },
            },
          },
        },
        assessment: {
          select: {
            id: true,
            teacher_comment: true,
            reviewed_at: true,
            evaluator: {
              select: {
                id: true,
                username: true,
                full_name: true,
              },
            },
            results: {
              orderBy: { criterion: { order_index: 'asc' } },
              select: {
                id: true,
                criterion_id: true,
                status: true,
                note: true,
                criterion: {
                  select: {
                    id: true,
                    content: true,
                    order_index: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  },

  async findStatistics(
    classroomId: string,
    classroomSubjectId: string,
    query: StatisticsQuery
  ): Promise<TeacherStatistics> {
    const exerciseActivityFilter = createActivityFilter(
      classroomSubjectId,
      query.activityId,
      'EXERCISE',
      true
    );
    const notebookActivityFilter = createActivityFilter(
      classroomSubjectId,
      query.activityId,
      'NOTEBOOK_CHECK',
      true
    );

    const studentCount = await prisma.classroomEnrollment.count({
      where: {
        classroom_id: classroomId,
        left_at: null,
        student: { role: 'STUDENT' },
      },
    });

    const exerciseActivityCount = await prisma.exerciseActivity.count({
      where: { activity: exerciseActivityFilter },
    });
    const notebookActivityCount = await prisma.notebookCheckActivity.count({
      where: { activity: notebookActivityFilter },
    });
    const notebookPeriodCount = await prisma.notebookCheckPeriod.count({
      where: { activity: { activity: notebookActivityFilter } },
    });

    const exerciseSubmissions = await prisma.exerciseSubmission.findMany({
      where: { activity: { activity: exerciseActivityFilter } },
      select: {
        grading_status: true,
        total_score: true,
      },
    });

    const notebookSubmissions = await prisma.notebookSubmission.findMany({
      where: { period: { activity: { activity: notebookActivityFilter } } },
      select: {
        status: true,
        assessment: {
          select: {
            results: {
              select: {
                status: true,
                criterion: {
                  select: {
                    id: true,
                    content: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    let gradedSubmissions = 0;
    let pendingSubmissions = 0;
    let failedSubmissions = 0;
    const gradedScores: number[] = [];

    for (const submission of exerciseSubmissions) {
      if (submission.grading_status === 'GRADED') {
        gradedSubmissions += 1;
        const score = toNumber(submission.total_score);
        if (score !== null) {
          gradedScores.push(score);
        }
      } else if (
        submission.grading_status === 'PENDING' ||
        submission.grading_status === 'PROCESSING'
      ) {
        pendingSubmissions += 1;
      } else if (submission.grading_status === 'FAILED') {
        failedSubmissions += 1;
      }
    }

    const criteria = new Map<
      string,
      { criterionId: string; content: string; needsSupplementation: number; undetermined: number }
    >();
    let finalizedNotebookSubmissions = 0;
    let pendingNotebookSubmissions = 0;

    for (const submission of notebookSubmissions) {
      if (submission.status === 'FINALIZED') {
        finalizedNotebookSubmissions += 1;
      } else {
        pendingNotebookSubmissions += 1;
      }

      for (const result of submission.assessment?.results ?? []) {
        const current = criteria.get(result.criterion.id) ?? {
          criterionId: result.criterion.id,
          content: result.criterion.content,
          needsSupplementation: 0,
          undetermined: 0,
        };

        if (result.status === 'NEEDS_SUPPLEMENTATION') {
          current.needsSupplementation += 1;
        }
        if (result.status === 'UNDETERMINED') {
          current.undetermined += 1;
        }

        criteria.set(result.criterion.id, current);
      }
    }

    const expectedExerciseSubmissions = studentCount * exerciseActivityCount;
    const expectedNotebookSubmissions = studentCount * notebookPeriodCount;

    return {
      studentCount,
      exercise: {
        activityCount: exerciseActivityCount,
        expectedSubmissions: expectedExerciseSubmissions,
        submittedSubmissions: exerciseSubmissions.length,
        gradedSubmissions,
        pendingSubmissions,
        failedSubmissions,
        averageScore:
          gradedScores.length > 0
            ? gradedScores.reduce((sum, score) => sum + score, 0) / gradedScores.length
            : null,
        submissionRate:
          expectedExerciseSubmissions > 0
            ? exerciseSubmissions.length / expectedExerciseSubmissions
            : null,
      },
      notebook: {
        activityCount: notebookActivityCount,
        periodCount: notebookPeriodCount,
        expectedSubmissions: expectedNotebookSubmissions,
        submittedSubmissions: notebookSubmissions.length,
        finalizedSubmissions: finalizedNotebookSubmissions,
        pendingSubmissions: pendingNotebookSubmissions,
        submissionRate:
          expectedNotebookSubmissions > 0
            ? notebookSubmissions.length / expectedNotebookSubmissions
            : null,
        finalizationRate:
          notebookSubmissions.length > 0
            ? finalizedNotebookSubmissions / notebookSubmissions.length
            : null,
        criteria: Array.from(criteria.values()).sort((left, right) => {
          const leftCount = left.needsSupplementation + left.undetermined;
          const rightCount = right.needsSupplementation + right.undetermined;
          return rightCount - leftCount || left.content.localeCompare(right.content);
        }),
      },
    };
  },

  async findStudentInClassroom(classroomId: string, studentId: string) {
    return prisma.classroomEnrollment.findFirst({
      where: {
        classroom_id: classroomId,
        student_id: studentId,
        student: { role: 'STUDENT' },
      },
      select: {
        student: {
          select: {
            id: true,
            username: true,
            full_name: true,
            status: true,
          },
        },
      },
    });
  },

  async findProgress(classroomSubjectId: string, studentId: string) {
    const scoreResults = await prisma.lessonScoreResult.findMany({
      where: {
        student_id: studentId,
        classroom_subject_id: classroomSubjectId,
        stream: 'ASSIGNED',
        lesson: { classroom_subject_id: classroomSubjectId },
      },
      orderBy: [{ occurred_at: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        lesson_id: true,
        exercise_submission_id: true,
        earned_points: true,
        max_points: true,
        occurred_at: true,
        graded_at: true,
        lesson: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    const lessonProgress = await prisma.studentLessonProgress.findMany({
      where: {
        student_id: studentId,
        stream: 'ASSIGNED',
        lesson: { classroom_subject_id: classroomSubjectId },
      },
      select: {
        lesson_id: true,
        has_difficulty: true,
        last_result_id: true,
        updated_at: true,
      },
    });

    return { scoreResults, lessonProgress };
  },

  async findPromptTopics(classroomSubjectId: string, query: PromptTopicsQuery) {
    const where: Prisma.SubjectPromptTopicWhereInput = {
      classroom_subject_id: classroomSubjectId,
    };

    if (query.studentId) {
      where.student_id = query.studentId;
    }

    if (query.periodStart && query.periodEnd) {
      where.period_start = { gte: new Date(`${query.periodStart}T00:00:00.000Z`) };
      where.period_end = { lte: new Date(`${query.periodEnd}T00:00:00.000Z`) };
    }

    return prisma.subjectPromptTopic.findMany({
      where,
      orderBy: [{ period_start: 'asc' }, { generated_at: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        student_id: true,
        period_start: true,
        period_end: true,
        topics: true,
        prompt_count: true,
        generated_at: true,
        student: {
          select: {
            id: true,
            username: true,
            full_name: true,
          },
        },
      },
    });
  },
};
