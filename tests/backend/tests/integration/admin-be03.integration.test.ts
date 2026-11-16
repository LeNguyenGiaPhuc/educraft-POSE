import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { prisma } from '../../../../backend/src/lib/prisma.js';
import { rosterService } from '../../../../backend/src/modules/admin/imports/roster.service.js';
import { enrollmentRepository } from '../../../../backend/src/modules/admin/enrollments/enrollment.repository.js';
import { classroomSubjectRepository } from '../../../../backend/src/modules/admin/classroom-subjects/classroom-subject.repository.js';
import { lessonRepository } from '../../../../backend/src/modules/teacher/lessons/lesson.repository.js';
import { BadRequestError, ConflictError, ForbiddenError } from '../../../../backend/src/shared/errors/app-error.js';

async function createTestXlsxBuffer(rows: Array<Array<string | number | object>>): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Students');
  for (const r of rows) {
    ws.addRow(r);
  }
  const arrayBuf = await wb.xlsx.writeBuffer();
  return Buffer.from(arrayBuf);
}

async function settledWithin(promise: Promise<unknown>, milliseconds: number): Promise<boolean> {
  return Promise.race([
    promise.then(
      () => true,
      () => true
    ),
    new Promise<boolean>((resolve) => setTimeout(() => resolve(false), milliseconds)),
  ]);
}

describe('BE-03 admin persistence & enrollment guards (real PostgreSQL)', () => {
  const marker = randomUUID().slice(0, 8);
  const userIds: string[] = [];
  const classroomIds: string[] = [];
  const subjectIds: string[] = [];

  afterAll(async () => {
    await prisma.classroomEnrollment.deleteMany({ where: { student_id: { in: userIds } } });
    await prisma.lesson.deleteMany({
      where: { classroomSubject: { classroom_id: { in: classroomIds } } },
    });
    await prisma.classroomSubject.deleteMany({ where: { classroom_id: { in: classroomIds } } });
    await prisma.teacherProfile.deleteMany({ where: { teacher_id: { in: userIds } } });
    await prisma.classroom.deleteMany({ where: { id: { in: classroomIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.subject.deleteMany({ where: { id: { in: subjectIds } } });
    await prisma.$disconnect();
  });

  it('enforces single active enrollment per student (partial unique index)', async () => {
    const student = await prisma.user.create({
      data: {
        username: `student_${marker}_1`,
        password_hash: 'hash',
        full_name: 'Test Student 1',
        role: 'STUDENT',
        status: 'ACTIVE',
      },
    });
    userIds.push(student.id);

    const classA = await prisma.classroom.create({
      data: {
        name: `ClassA_${marker}`,
        grade_level: 10,
        academic_year: '2026-2027',
        status: 'ACTIVE',
      },
    });
    const classB = await prisma.classroom.create({
      data: {
        name: `ClassB_${marker}`,
        grade_level: 10,
        academic_year: '2026-2027',
        status: 'ACTIVE',
      },
    });
    classroomIds.push(classA.id, classB.id);

    // First active enrollment succeeds
    await prisma.classroomEnrollment.create({
      data: {
        student_id: student.id,
        classroom_id: classA.id,
        left_at: null,
      },
    });

    // Second concurrent active enrollment MUST fail with unique constraint violation
    await expect(
      prisma.classroomEnrollment.create({
        data: {
          student_id: student.id,
          classroom_id: classB.id,
          left_at: null,
        },
      })
    ).rejects.toThrow();

    // Closing the first enrollment allows a new active enrollment
    await prisma.classroomEnrollment.updateMany({
      where: { student_id: student.id, classroom_id: classA.id },
      data: { left_at: new Date() },
    });

    const secondEnrollment = await prisma.classroomEnrollment.create({
      data: {
        student_id: student.id,
        classroom_id: classB.id,
        left_at: null,
      },
    });
    expect(secondEnrollment.id).toBeDefined();
    expect(secondEnrollment.left_at).toBeNull();
  });

  it('enforces case-insensitive classroom name uniqueness within the same academic year', async () => {
    const name = `UniqueClass_${marker}`;
    const academicYear = '2026-2027';

    const first = await prisma.classroom.create({
      data: {
        name,
        grade_level: 11,
        academic_year: academicYear,
        status: 'ACTIVE',
      },
    });
    classroomIds.push(first.id);

    // Duplicate with different casing in same year must fail
    await expect(
      prisma.classroom.create({
        data: {
          name: name.toLowerCase(),
          grade_level: 11,
          academic_year: academicYear,
          status: 'ACTIVE',
        },
      })
    ).rejects.toThrow();

    // Same name in a DIFFERENT academic year is allowed
    const diffYear = await prisma.classroom.create({
      data: {
        name,
        grade_level: 11,
        academic_year: '2027-2028',
        status: 'ACTIVE',
      },
    });
    classroomIds.push(diffYear.id);
    expect(diffYear.id).toBeDefined();
  });

  it('Task 1: tampered commit writes zero Users and zero enrollments to PostgreSQL', async () => {
    const admin = await prisma.user.create({
      data: {
        username: `admin_${marker}_roster`,
        password_hash: 'hash',
        full_name: 'Admin Roster',
        role: 'ADMIN',
        status: 'ACTIVE',
      },
    });
    userIds.push(admin.id);

    const classroom = await prisma.classroom.create({
      data: {
        name: `RosterClass_${marker}`,
        grade_level: 10,
        academic_year: '2026-2027',
        status: 'ACTIVE',
      },
    });
    classroomIds.push(classroom.id);

    const validExcel = await createTestXlsxBuffer([
      ['Họ và tên', 'Tên đăng nhập', 'Thông tin liên hệ'],
      ['Student One', `stu_${marker}_valid1`, '0901112233'],
    ]);

    const preview = await rosterService.previewRoster({
      adminId: admin.id,
      classroomId: classroom.id,
      fileBuffer: validExcel,
    });

    expect(preview.isValid).toBe(true);
    expect(preview.validationToken).toBeDefined();

    // Attempt commit with tampered row content (same row count, different name & username)
    const tamperedRows = [
      {
        line: 2,
        fullName: 'Tampered Student',
        username: `stu_${marker}_tampered`,
        contact: '0901112233',
      },
    ];

    await expect(
      rosterService.commitRoster({
        adminId: admin.id,
        classroomId: classroom.id,
        validationToken: preview.validationToken,
        defaultPassword: 'StrongPassword123!',
        rows: tamperedRows,
      })
    ).rejects.toThrow(BadRequestError);

    // Verify 0 users and 0 enrollments created
    const foundValid = await prisma.user.findFirst({
      where: { username: `stu_${marker}_valid1` },
    });
    const foundTampered = await prisma.user.findFirst({
      where: { username: `stu_${marker}_tampered` },
    });
    const enrollmentsCount = await prisma.classroomEnrollment.count({
      where: { classroom_id: classroom.id },
    });

    expect(foundValid).toBeNull();
    expect(foundTampered).toBeNull();
    expect(enrollmentsCount).toBe(0);
  });

  it('Task 2: atomic enrollment & transfer transaction guards on PostgreSQL', async () => {
    const student = await prisma.user.create({
      data: {
        username: `stu_${marker}_enr_trans`,
        password_hash: 'hash',
        full_name: 'Student Atomic Enr',
        role: 'STUDENT',
        status: 'ACTIVE',
      },
    });
    const inactiveStudent = await prisma.user.create({
      data: {
        username: `stu_${marker}_inactive`,
        password_hash: 'hash',
        full_name: 'Student Inactive',
        role: 'STUDENT',
        status: 'INACTIVE',
      },
    });
    userIds.push(student.id, inactiveStudent.id);

    const activeClassA = await prisma.classroom.create({
      data: {
        name: `AtomicClassA_${marker}`,
        grade_level: 10,
        academic_year: '2026-2027',
        status: 'ACTIVE',
      },
    });
    const activeClassB = await prisma.classroom.create({
      data: {
        name: `AtomicClassB_${marker}`,
        grade_level: 10,
        academic_year: '2026-2027',
        status: 'ACTIVE',
      },
    });
    const archivedClass = await prisma.classroom.create({
      data: {
        name: `ArchivedClass_${marker}`,
        grade_level: 10,
        academic_year: '2026-2027',
        status: 'ARCHIVED',
      },
    });
    classroomIds.push(activeClassA.id, activeClassB.id, archivedClass.id);

    // 1. Rejects inactive student
    await expect(
      enrollmentRepository.enrollStudentAtomically(activeClassA.id, inactiveStudent.id)
    ).rejects.toThrow(BadRequestError);

    // 2. Rejects archived classroom
    await expect(
      enrollmentRepository.enrollStudentAtomically(archivedClass.id, student.id)
    ).rejects.toThrow(BadRequestError);

    // 3. Successful atomic enrollment
    const enrolled = await enrollmentRepository.enrollStudentAtomically(
      activeClassA.id,
      student.id
    );
    expect(enrolled.id).toBeDefined();
    expect(enrolled.left_at).toBeNull();

    // 4. Duplicate enrollment throws ConflictError (caught from check and partial unique index)
    await expect(
      enrollmentRepository.enrollStudentAtomically(activeClassB.id, student.id)
    ).rejects.toThrow(ConflictError);

    // 5. Transfer to archived classroom rejected
    await expect(
      enrollmentRepository.transferStudentAtomically(student.id, archivedClass.id)
    ).rejects.toThrow(BadRequestError);

    // 6. Successful atomic transfer from ClassA to ClassB
    const transferred = await enrollmentRepository.transferStudentAtomically(
      student.id,
      activeClassB.id
    );
    expect(transferred.previousClassroomId).toBe(activeClassA.id);
    expect(transferred.newClassroomId).toBe(activeClassB.id);

    // Verify database state: old enrollment has left_at set, new enrollment active
    const oldEnr = await prisma.classroomEnrollment.findFirst({
      where: { student_id: student.id, classroom_id: activeClassA.id },
    });
    const newEnr = await prisma.classroomEnrollment.findFirst({
      where: { student_id: student.id, classroom_id: activeClassB.id },
    });
    expect(oldEnr?.left_at).not.toBeNull();
    expect(newEnr?.left_at).toBeNull();
  });

  it('waits for a concurrent classroom archive before enrolling a student', async () => {
    const student = await prisma.user.create({
      data: {
        username: `stu_${marker}_archive_race`,
        password_hash: 'hash',
        full_name: 'Student Archive Race',
        role: 'STUDENT',
        status: 'ACTIVE',
      },
    });
    const classroom = await prisma.classroom.create({
      data: {
        name: `ArchiveRace_${marker}`,
        grade_level: 10,
        academic_year: '2026-2027',
        status: 'ACTIVE',
      },
    });
    userIds.push(student.id);
    classroomIds.push(classroom.id);

    let releaseArchive = () => {};
    let markArchiveReady = () => {};
    const archiveReady = new Promise<void>((resolve) => {
      markArchiveReady = resolve;
    });
    const mayCommitArchive = new Promise<void>((resolve) => {
      releaseArchive = resolve;
    });

    const archivePromise = prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM classrooms WHERE id = ${classroom.id}::uuid FOR UPDATE`;
      await tx.classroom.update({
        where: { id: classroom.id },
        data: { status: 'ARCHIVED' },
      });
      markArchiveReady();
      await mayCommitArchive;
    });

    await archiveReady;
    const enrollmentPromise = enrollmentRepository.enrollStudentAtomically(
      classroom.id,
      student.id
    );
    const settledBeforeArchiveCommit = await settledWithin(enrollmentPromise, 150);

    releaseArchive();
    await archivePromise;

    expect(settledBeforeArchiveCommit).toBe(false);
    await expect(enrollmentPromise).rejects.toThrow(BadRequestError);
  });

  it('Task 3: atomic teacher assignment guards and state transitions on PostgreSQL', async () => {
    const subjectMath = await prisma.subject.create({
      data: { name: `Math_${marker}`, is_active: true },
    });
    const subjectPhysics = await prisma.subject.create({
      data: { name: `Physics_${marker}`, is_active: true },
    });
    subjectIds.push(subjectMath.id, subjectPhysics.id);

    const mathTeacher1 = await prisma.user.create({
      data: {
        username: `tea_${marker}_math1`,
        password_hash: 'hash',
        full_name: 'Math Teacher 1',
        role: 'TEACHER',
        status: 'ACTIVE',
        teacherProfile: {
          create: {
            specialized_subject_id: subjectMath.id,
            qualification: 'Cử nhân Toán',
          },
        },
      },
    });
    const mathTeacher2 = await prisma.user.create({
      data: {
        username: `tea_${marker}_math2`,
        password_hash: 'hash',
        full_name: 'Math Teacher 2',
        role: 'TEACHER',
        status: 'ACTIVE',
        teacherProfile: {
          create: {
            specialized_subject_id: subjectMath.id,
            qualification: 'Thạc sĩ Toán',
          },
        },
      },
    });
    const inactiveTeacher = await prisma.user.create({
      data: {
        username: `tea_${marker}_inactive`,
        password_hash: 'hash',
        full_name: 'Inactive Teacher',
        role: 'TEACHER',
        status: 'INACTIVE',
        teacherProfile: {
          create: {
            specialized_subject_id: subjectMath.id,
            qualification: 'Cử nhân Sư phạm',
          },
        },
      },
    });
    const physicsTeacher = await prisma.user.create({
      data: {
        username: `tea_${marker}_physics`,
        password_hash: 'hash',
        full_name: 'Physics Teacher',
        role: 'TEACHER',
        status: 'ACTIVE',
        teacherProfile: {
          create: {
            specialized_subject_id: subjectPhysics.id,
            qualification: 'Cử nhân Vật lý',
          },
        },
      },
    });
    userIds.push(
      mathTeacher1.id,
      mathTeacher2.id,
      inactiveTeacher.id,
      physicsTeacher.id
    );

    const classroom = await prisma.classroom.create({
      data: {
        name: `TeachClass_${marker}`,
        grade_level: 10,
        academic_year: '2026-2027',
        status: 'ACTIVE',
        classroomSubjects: {
          create: {
            subject_id: subjectMath.id,
          },
        },
      },
    });
    const archivedClass = await prisma.classroom.create({
      data: {
        name: `ArchivedTeachClass_${marker}`,
        grade_level: 10,
        academic_year: '2026-2027',
        status: 'ARCHIVED',
        classroomSubjects: {
          create: {
            subject_id: subjectMath.id,
          },
        },
      },
    });
    classroomIds.push(classroom.id, archivedClass.id);

    // 1. Rejects assignment to archived classroom
    await expect(
      classroomSubjectRepository.assignTeacherAtomically(
        archivedClass.id,
        subjectMath.id,
        mathTeacher1.id
      )
    ).rejects.toThrow(BadRequestError);

    // 2. Rejects inactive teacher
    await expect(
      classroomSubjectRepository.assignTeacherAtomically(
        classroom.id,
        subjectMath.id,
        inactiveTeacher.id
      )
    ).rejects.toThrow(BadRequestError);

    // 3. Rejects wrong specialization teacher
    await expect(
      classroomSubjectRepository.assignTeacherAtomically(
        classroom.id,
        subjectMath.id,
        physicsTeacher.id
      )
    ).rejects.toThrow(BadRequestError);

    // 4. Successful initial assignment
    const assigned1 = await classroomSubjectRepository.assignTeacherAtomically(
      classroom.id,
      subjectMath.id,
      mathTeacher1.id
    );
    expect(assigned1.teacher_id).toBe(mathTeacher1.id);
    expect(assigned1.teacher?.full_name).toBe('Math Teacher 1');

    // 5. Successful replace with another eligible teacher
    const replaced = await classroomSubjectRepository.assignTeacherAtomically(
      classroom.id,
      subjectMath.id,
      mathTeacher2.id
    );
    expect(replaced.teacher_id).toBe(mathTeacher2.id);
    expect(replaced.teacher?.full_name).toBe('Math Teacher 2');

    // 6. Successful removal (unassign)
    const removed = await classroomSubjectRepository.assignTeacherAtomically(
      classroom.id,
      subjectMath.id,
      null
    );
    expect(removed.teacher_id).toBeNull();
    expect(removed.teacher).toBeNull();
  });

  it('waits for a concurrent teacher deactivation before assigning the teacher', async () => {
    const subject = await prisma.subject.create({
      data: { name: `RaceSubject_${marker}`, is_active: true },
    });
    const teacher = await prisma.user.create({
      data: {
        username: `tea_${marker}_status_race`,
        password_hash: 'hash',
        full_name: 'Teacher Status Race',
        role: 'TEACHER',
        status: 'ACTIVE',
        teacherProfile: {
          create: {
            specialized_subject_id: subject.id,
            qualification: 'Cử nhân',
          },
        },
      },
    });
    const classroom = await prisma.classroom.create({
      data: {
        name: `TeacherRace_${marker}`,
        grade_level: 10,
        academic_year: '2026-2027',
        status: 'ACTIVE',
        classroomSubjects: { create: { subject_id: subject.id } },
      },
    });
    subjectIds.push(subject.id);
    userIds.push(teacher.id);
    classroomIds.push(classroom.id);

    let releaseDeactivation = () => {};
    let markDeactivationReady = () => {};
    const deactivationReady = new Promise<void>((resolve) => {
      markDeactivationReady = resolve;
    });
    const mayCommitDeactivation = new Promise<void>((resolve) => {
      releaseDeactivation = resolve;
    });

    const deactivationPromise = prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${teacher.id}::uuid FOR UPDATE`;
      await tx.user.update({
        where: { id: teacher.id },
        data: { status: 'INACTIVE' },
      });
      markDeactivationReady();
      await mayCommitDeactivation;
    });

    await deactivationReady;
    const assignmentPromise = classroomSubjectRepository.assignTeacherAtomically(
      classroom.id,
      subject.id,
      teacher.id
    );
    const settledBeforeDeactivationCommit = await settledWithin(assignmentPromise, 150);

    releaseDeactivation();
    await deactivationPromise;

    expect(settledBeforeDeactivationCommit).toBe(false);
    await expect(assignmentPromise).rejects.toThrow(BadRequestError);
  });

  it('rejects lesson creation after a concurrent teacher reassignment commits', async () => {
    const subject = await prisma.subject.create({
      data: { name: `LessonRaceSubject_${marker}`, is_active: true },
    });
    const oldTeacher = await prisma.user.create({
      data: {
        username: `tea_${marker}_lesson_old`,
        password_hash: 'hash',
        full_name: 'Old Lesson Teacher',
        role: 'TEACHER',
        status: 'ACTIVE',
      },
    });
    const newTeacher = await prisma.user.create({
      data: {
        username: `tea_${marker}_lesson_new`,
        password_hash: 'hash',
        full_name: 'New Lesson Teacher',
        role: 'TEACHER',
        status: 'ACTIVE',
      },
    });
    const classroom = await prisma.classroom.create({
      data: {
        name: `LessonRace_${marker}`,
        grade_level: 10,
        academic_year: '2026-2027',
        status: 'ACTIVE',
        classroomSubjects: {
          create: { subject_id: subject.id, teacher_id: oldTeacher.id },
        },
      },
      include: { classroomSubjects: true },
    });
    const classroomSubject = classroom.classroomSubjects[0];
    subjectIds.push(subject.id);
    userIds.push(oldTeacher.id, newTeacher.id);
    classroomIds.push(classroom.id);

    let releaseReassignment = () => {};
    let markReassignmentReady = () => {};
    const reassignmentReady = new Promise<void>((resolve) => {
      markReassignmentReady = resolve;
    });
    const mayCommitReassignment = new Promise<void>((resolve) => {
      releaseReassignment = resolve;
    });

    const reassignmentPromise = prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM classrooms WHERE id = ${classroom.id}::uuid FOR UPDATE`;
      await tx.classroomSubject.update({
        where: { id: classroomSubject.id },
        data: { teacher_id: newTeacher.id },
      });
      markReassignmentReady();
      await mayCommitReassignment;
    });

    await reassignmentReady;
    const creationPromise = lessonRepository.createLesson({
      classroomSubjectId: classroomSubject.id,
      teacherId: oldTeacher.id,
      data: { title: 'Bài học không còn quyền tạo' },
    });
    const settledBeforeReassignmentCommit = await settledWithin(creationPromise, 150);

    releaseReassignment();
    await reassignmentPromise;

    expect(settledBeforeReassignmentCommit).toBe(false);
    await expect(creationPromise).rejects.toThrow(ForbiddenError);
  });
});
