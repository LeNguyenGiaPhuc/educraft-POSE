import type { Subject } from '@prisma/client';
import { prisma } from '../../../lib/prisma.js';

export interface SubjectWithCounts extends Subject {
  _count?: {
    teacherProfiles: number;
    classroomSubjects: number;
  };
}

export class SubjectRepository {
  async findMany(): Promise<SubjectWithCounts[]> {
    return prisma.subject.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            teacherProfiles: true,
            classroomSubjects: true,
          },
        },
      },
    });
  }

  async findById(id: string): Promise<SubjectWithCounts | null> {
    return prisma.subject.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            teacherProfiles: true,
            classroomSubjects: true,
          },
        },
      },
    });
  }

  async findByNameCaseInsensitive(name: string, excludeId?: string): Promise<Subject | null> {
    return prisma.subject.findFirst({
      where: {
        name: {
          equals: name.trim(),
          mode: 'insensitive',
        },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
  }

  async createSubjectWithActiveClasses(name: string): Promise<SubjectWithCounts> {
    return prisma.$transaction(async (tx) => {
      // 1. Create subject
      const subject = await tx.subject.create({
        data: {
          name: name.trim(),
          is_active: true,
        },
      });

      // 2. Find all active classrooms
      const activeClassrooms = await tx.classroom.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true },
      });

      // 3. Create unassigned ClassroomSubject for each active classroom
      if (activeClassrooms.length > 0) {
        await tx.classroomSubject.createMany({
          data: activeClassrooms.map((c) => ({
            classroom_id: c.id,
            subject_id: subject.id,
            teacher_id: null,
          })),
        });
      }

      return tx.subject.findUniqueOrThrow({
        where: { id: subject.id },
        include: {
          _count: {
            select: {
              teacherProfiles: true,
              classroomSubjects: true,
            },
          },
        },
      });
    });
  }

  async updateName(id: string, name: string): Promise<SubjectWithCounts> {
    return prisma.subject.update({
      where: { id },
      data: { name: name.trim() },
      include: {
        _count: {
          select: {
            teacherProfiles: true,
            classroomSubjects: true,
          },
        },
      },
    });
  }

  async updateStatus(id: string, isActive: boolean): Promise<SubjectWithCounts> {
    return prisma.subject.update({
      where: { id },
      data: { is_active: isActive },
      include: {
        _count: {
          select: {
            teacherProfiles: true,
            classroomSubjects: true,
          },
        },
      },
    });
  }
}

export const subjectRepository = new SubjectRepository();
