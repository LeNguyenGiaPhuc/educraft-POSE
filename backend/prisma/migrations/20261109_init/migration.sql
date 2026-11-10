-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('ADMIN', 'TEACHER', 'STUDENT');

-- CreateEnum
CREATE TYPE "account_status" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "classroom_status" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "publication_status" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "processing_status" AS ENUM ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED');

-- CreateEnum
CREATE TYPE "activity_kind" AS ENUM ('EXERCISE', 'NOTEBOOK_CHECK');

-- CreateEnum
CREATE TYPE "activity_status" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED');

-- CreateEnum
CREATE TYPE "exercise_type" AS ENUM ('QUIZ', 'WRITTEN');

-- CreateEnum
CREATE TYPE "difficulty_level" AS ENUM ('BASIC', 'INTERMEDIATE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "grading_status" AS ENUM ('PENDING', 'PROCESSING', 'GRADED', 'FAILED');

-- CreateEnum
CREATE TYPE "submission_status" AS ENUM ('CURRENT', 'LOCKED', 'FINALIZED');

-- CreateEnum
CREATE TYPE "criterion_status" AS ENUM ('RECORDED', 'NEEDS_SUPPLEMENTATION', 'UNDETERMINED');

-- CreateEnum
CREATE TYPE "source_position_type" AS ENUM ('PAGE', 'SLIDE', 'PARAGRAPH', 'IMAGE');

-- CreateEnum
CREATE TYPE "message_role" AS ENUM ('USER', 'ASSISTANT');

-- CreateEnum
CREATE TYPE "progress_stream" AS ENUM ('ASSIGNED', 'SELF_PRACTICE');

-- CreateEnum
CREATE TYPE "chat_turn_status" AS ENUM ('PENDING', 'PROCESSING', 'ANSWERED', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "username" VARCHAR(100) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" VARCHAR(200) NOT NULL,
    "role" "user_role" NOT NULL,
    "status" "account_status" NOT NULL DEFAULT 'ACTIVE',
    "must_change_password" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subjects" (
    "id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teacher_profiles" (
    "teacher_id" UUID NOT NULL,
    "qualification" TEXT NOT NULL,
    "specialized_subject_id" UUID NOT NULL,

    CONSTRAINT "teacher_profiles_pkey" PRIMARY KEY ("teacher_id")
);

-- CreateTable
CREATE TABLE "classrooms" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "grade_level" SMALLINT NOT NULL,
    "academic_year" VARCHAR(20) NOT NULL,
    "status" "classroom_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "classrooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classroom_enrollments" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "classroom_id" UUID NOT NULL,
    "joined_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "left_at" TIMESTAMPTZ(6),

    CONSTRAINT "classroom_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classroom_subjects" (
    "id" UUID NOT NULL,
    "classroom_id" UUID NOT NULL,
    "subject_id" UUID NOT NULL,
    "teacher_id" UUID NOT NULL,

    CONSTRAINT "classroom_subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lessons" (
    "id" UUID NOT NULL,
    "classroom_subject_id" UUID NOT NULL,
    "title" VARCHAR(250) NOT NULL,
    "status" "publication_status" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMPTZ(6),
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_materials" (
    "id" UUID NOT NULL,
    "lesson_id" UUID NOT NULL,
    "file_name" TEXT NOT NULL,
    "status" "publication_status" NOT NULL DEFAULT 'DRAFT',
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "learning_materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_versions" (
    "id" UUID NOT NULL,
    "material_id" UUID NOT NULL,
    "version_no" INTEGER NOT NULL,
    "storage_key" TEXT NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "byte_size" BIGINT NOT NULL,
    "processing_status" "processing_status" NOT NULL DEFAULT 'PENDING',
    "uploaded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_at" TIMESTAMPTZ(6),

    CONSTRAINT "material_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_segments" (
    "id" UUID NOT NULL,
    "material_version_id" UUID NOT NULL,
    "position_type" "source_position_type" NOT NULL,
    "position_index" INTEGER NOT NULL,
    "position_label" TEXT NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "processing_status" "processing_status" NOT NULL DEFAULT 'PROCESSED',

    CONSTRAINT "material_segments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activities" (
    "id" UUID NOT NULL,
    "classroom_subject_id" UUID NOT NULL,
    "created_by_id" UUID NOT NULL,
    "kind" "activity_kind" NOT NULL,
    "title" VARCHAR(250) NOT NULL,
    "description" TEXT NOT NULL,
    "status" "activity_status" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMPTZ(6),
    "closes_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercise_activities" (
    "activity_id" UUID NOT NULL,
    "exercise_type" "exercise_type" NOT NULL,
    "difficulty" "difficulty_level" NOT NULL,
    "question_count" SMALLINT NOT NULL,

    CONSTRAINT "exercise_activities_pkey" PRIMARY KEY ("activity_id")
);

-- CreateTable
CREATE TABLE "exercise_activity_lessons" (
    "activity_id" UUID NOT NULL,
    "lesson_id" UUID NOT NULL,

    CONSTRAINT "exercise_activity_lessons_pkey" PRIMARY KEY ("activity_id","lesson_id")
);

-- CreateTable
CREATE TABLE "notebook_check_activities" (
    "activity_id" UUID NOT NULL,
    "criteria_locked_at" TIMESTAMPTZ(6),

    CONSTRAINT "notebook_check_activities_pkey" PRIMARY KEY ("activity_id")
);

-- CreateTable
CREATE TABLE "notebook_reference_files" (
    "id" UUID NOT NULL,
    "activity_id" UUID NOT NULL,
    "storage_key" TEXT NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "byte_size" BIGINT NOT NULL,
    "sort_order" SMALLINT NOT NULL,

    CONSTRAINT "notebook_reference_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notebook_criteria" (
    "id" UUID NOT NULL,
    "activity_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL,

    CONSTRAINT "notebook_criteria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" UUID NOT NULL,
    "exercise_activity_id" UUID,
    "self_practice_session_id" UUID,
    "lesson_id" UUID NOT NULL,
    "prompt" TEXT NOT NULL,
    "options" JSONB,
    "max_points" DECIMAL(8,2) NOT NULL,
    "answer_key" TEXT,
    "marking_criteria" TEXT,
    "explanation" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_citations" (
    "question_id" UUID NOT NULL,
    "segment_id" UUID NOT NULL,
    "excerpt" TEXT,

    CONSTRAINT "question_citations_pkey" PRIMARY KEY ("question_id","segment_id")
);

-- CreateTable
CREATE TABLE "exercise_submissions" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "activity_id" UUID NOT NULL,
    "submitted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "grading_status" "grading_status" NOT NULL DEFAULT 'PENDING',
    "total_score" DECIMAL(8,2),
    "graded_at" TIMESTAMPTZ(6),

    CONSTRAINT "exercise_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "self_practice_sessions" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "classroom_subject_id" UUID NOT NULL,
    "exercise_type" "exercise_type" NOT NULL,
    "difficulty" "difficulty_level" NOT NULL,
    "question_count" SMALLINT NOT NULL,
    "status" "grading_status" NOT NULL DEFAULT 'PENDING',
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submitted_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "total_score" DECIMAL(8,2),

    CONSTRAINT "self_practice_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "self_practice_lessons" (
    "session_id" UUID NOT NULL,
    "lesson_id" UUID NOT NULL,

    CONSTRAINT "self_practice_lessons_pkey" PRIMARY KEY ("session_id","lesson_id")
);

-- CreateTable
CREATE TABLE "student_answers" (
    "id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "exercise_submission_id" UUID,
    "self_practice_session_id" UUID,
    "answer" TEXT NOT NULL,
    "earned_points" DECIMAL(8,2),
    "explanation" TEXT,
    "grading_status" "grading_status" NOT NULL DEFAULT 'PENDING',
    "answered_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "answer_citations" (
    "answer_id" UUID NOT NULL,
    "segment_id" UUID NOT NULL,
    "excerpt" TEXT,

    CONSTRAINT "answer_citations_pkey" PRIMARY KEY ("answer_id","segment_id")
);

-- CreateTable
CREATE TABLE "notebook_check_periods" (
    "id" UUID NOT NULL,
    "activity_id" UUID NOT NULL,
    "period_no" INTEGER NOT NULL,
    "opened_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "due_at" TIMESTAMPTZ(6) NOT NULL,
    "closed_at" TIMESTAMPTZ(6),

    CONSTRAINT "notebook_check_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notebook_submissions" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "period_id" UUID NOT NULL,
    "submitted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "status" "submission_status" NOT NULL DEFAULT 'CURRENT',
    "processing_status" "processing_status" NOT NULL DEFAULT 'PENDING',
    "locked_at" TIMESTAMPTZ(6),

    CONSTRAINT "notebook_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notebook_submission_files" (
    "id" UUID NOT NULL,
    "submission_id" UUID NOT NULL,
    "storage_key" TEXT NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "byte_size" BIGINT NOT NULL,
    "sort_order" SMALLINT NOT NULL,

    CONSTRAINT "notebook_submission_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notebook_ai_drafts" (
    "submission_id" UUID NOT NULL,
    "ocr_text" TEXT,
    "suggestions" JSONB NOT NULL,
    "generated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notebook_ai_drafts_pkey" PRIMARY KEY ("submission_id")
);

-- CreateTable
CREATE TABLE "notebook_assessments" (
    "id" UUID NOT NULL,
    "submission_id" UUID NOT NULL,
    "evaluator_id" UUID NOT NULL,
    "teacher_comment" TEXT,
    "reviewed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notebook_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "criterion_results" (
    "id" UUID NOT NULL,
    "assessment_id" UUID NOT NULL,
    "criterion_id" UUID NOT NULL,
    "status" "criterion_status" NOT NULL,
    "note" TEXT,

    CONSTRAINT "criterion_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule_events" (
    "id" UUID NOT NULL,
    "classroom_subject_id" UUID NOT NULL,
    "created_by_id" UUID NOT NULL,
    "title" VARCHAR(250) NOT NULL,
    "details" TEXT NOT NULL,
    "event_type" VARCHAR(80) NOT NULL,
    "starts_at" TIMESTAMPTZ(6) NOT NULL,
    "published_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "schedule_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "recipient_id" UUID NOT NULL,
    "schedule_event_id" UUID,
    "activity_id" UUID,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read_at" TIMESTAMPTZ(6),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_conversations" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "classroom_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ai_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_chat_turns" (
    "id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "status" "chat_turn_status" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),

    CONSTRAINT "ai_chat_turns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_messages" (
    "id" UUID NOT NULL,
    "turn_id" UUID NOT NULL,
    "role" "message_role" NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attributed_classroom_subject_id" UUID,

    CONSTRAINT "ai_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_message_citations" (
    "message_id" UUID NOT NULL,
    "segment_id" UUID NOT NULL,
    "excerpt" TEXT,

    CONSTRAINT "ai_message_citations_pkey" PRIMARY KEY ("message_id","segment_id")
);

-- CreateTable
CREATE TABLE "subject_prompt_topics" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "classroom_subject_id" UUID NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "topics" JSONB NOT NULL,
    "prompt_count" INTEGER NOT NULL,
    "generated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subject_prompt_topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_score_results" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "classroom_subject_id" UUID NOT NULL,
    "lesson_id" UUID NOT NULL,
    "stream" "progress_stream" NOT NULL,
    "exercise_submission_id" UUID,
    "self_practice_session_id" UUID,
    "earned_points" DECIMAL(8,2) NOT NULL,
    "max_points" DECIMAL(8,2) NOT NULL,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL,
    "graded_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "lesson_score_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_lesson_progress" (
    "student_id" UUID NOT NULL,
    "lesson_id" UUID NOT NULL,
    "stream" "progress_stream" NOT NULL,
    "has_difficulty" BOOLEAN NOT NULL DEFAULT false,
    "last_result_id" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "student_lesson_progress_pkey" PRIMARY KEY ("student_id","lesson_id","stream")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "subjects_name_key" ON "subjects"("name");

-- CreateIndex
CREATE UNIQUE INDEX "classrooms_name_academic_year_key" ON "classrooms"("name", "academic_year");

-- CreateIndex
CREATE INDEX "classroom_enrollments_student_id_joined_at_idx" ON "classroom_enrollments"("student_id", "joined_at");

-- CreateIndex
CREATE INDEX "classroom_enrollments_classroom_id_left_at_idx" ON "classroom_enrollments"("classroom_id", "left_at");

-- CreateIndex
CREATE INDEX "classroom_subjects_teacher_id_idx" ON "classroom_subjects"("teacher_id");

-- CreateIndex
CREATE UNIQUE INDEX "classroom_subjects_classroom_id_subject_id_key" ON "classroom_subjects"("classroom_id", "subject_id");

-- CreateIndex
CREATE INDEX "lessons_classroom_subject_id_status_idx" ON "lessons"("classroom_subject_id", "status");

-- CreateIndex
CREATE INDEX "learning_materials_lesson_id_status_idx" ON "learning_materials"("lesson_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "material_versions_storage_key_key" ON "material_versions"("storage_key");

-- CreateIndex
CREATE UNIQUE INDEX "material_versions_material_id_version_no_key" ON "material_versions"("material_id", "version_no");

-- CreateIndex
CREATE UNIQUE INDEX "material_segments_material_version_id_ordinal_key" ON "material_segments"("material_version_id", "ordinal");

-- CreateIndex
CREATE INDEX "activities_classroom_subject_id_status_idx" ON "activities"("classroom_subject_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "notebook_reference_files_storage_key_key" ON "notebook_reference_files"("storage_key");

-- CreateIndex
CREATE UNIQUE INDEX "notebook_reference_files_activity_id_sort_order_key" ON "notebook_reference_files"("activity_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "notebook_criteria_activity_id_order_index_key" ON "notebook_criteria"("activity_id", "order_index");

-- CreateIndex
CREATE UNIQUE INDEX "questions_exercise_activity_id_sort_order_key" ON "questions"("exercise_activity_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "questions_self_practice_session_id_sort_order_key" ON "questions"("self_practice_session_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "exercise_submissions_student_id_activity_id_key" ON "exercise_submissions"("student_id", "activity_id");

-- CreateIndex
CREATE INDEX "self_practice_sessions_student_id_started_at_idx" ON "self_practice_sessions"("student_id", "started_at");

-- CreateIndex
CREATE UNIQUE INDEX "student_answers_exercise_submission_id_question_id_key" ON "student_answers"("exercise_submission_id", "question_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_answers_self_practice_session_id_question_id_key" ON "student_answers"("self_practice_session_id", "question_id");

-- CreateIndex
CREATE UNIQUE INDEX "notebook_check_periods_activity_id_period_no_key" ON "notebook_check_periods"("activity_id", "period_no");

-- CreateIndex
CREATE UNIQUE INDEX "notebook_submissions_student_id_period_id_key" ON "notebook_submissions"("student_id", "period_id");

-- CreateIndex
CREATE UNIQUE INDEX "notebook_submission_files_storage_key_key" ON "notebook_submission_files"("storage_key");

-- CreateIndex
CREATE UNIQUE INDEX "notebook_submission_files_submission_id_sort_order_key" ON "notebook_submission_files"("submission_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "notebook_assessments_submission_id_key" ON "notebook_assessments"("submission_id");

-- CreateIndex
CREATE UNIQUE INDEX "criterion_results_assessment_id_criterion_id_key" ON "criterion_results"("assessment_id", "criterion_id");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_recipient_id_schedule_event_id_key" ON "notifications"("recipient_id", "schedule_event_id");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_recipient_id_activity_id_key" ON "notifications"("recipient_id", "activity_id");

-- CreateIndex
CREATE INDEX "ai_conversations_student_id_created_at_idx" ON "ai_conversations"("student_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "ai_messages_turn_id_role_key" ON "ai_messages"("turn_id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "subject_prompt_topics_student_id_classroom_subject_id_perio_key" ON "subject_prompt_topics"("student_id", "classroom_subject_id", "period_start", "period_end");

-- CreateIndex
CREATE INDEX "lesson_score_results_student_id_classroom_subject_id_stream_idx" ON "lesson_score_results"("student_id", "classroom_subject_id", "stream", "occurred_at");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_score_results_exercise_submission_id_lesson_id_key" ON "lesson_score_results"("exercise_submission_id", "lesson_id");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_score_results_self_practice_session_id_lesson_id_key" ON "lesson_score_results"("self_practice_session_id", "lesson_id");

-- AddForeignKey
ALTER TABLE "teacher_profiles" ADD CONSTRAINT "teacher_profiles_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_profiles" ADD CONSTRAINT "teacher_profiles_specialized_subject_id_fkey" FOREIGN KEY ("specialized_subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classroom_enrollments" ADD CONSTRAINT "classroom_enrollments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classroom_enrollments" ADD CONSTRAINT "classroom_enrollments_classroom_id_fkey" FOREIGN KEY ("classroom_id") REFERENCES "classrooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classroom_subjects" ADD CONSTRAINT "classroom_subjects_classroom_id_fkey" FOREIGN KEY ("classroom_id") REFERENCES "classrooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classroom_subjects" ADD CONSTRAINT "classroom_subjects_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classroom_subjects" ADD CONSTRAINT "classroom_subjects_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_classroom_subject_id_fkey" FOREIGN KEY ("classroom_subject_id") REFERENCES "classroom_subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_materials" ADD CONSTRAINT "learning_materials_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_materials" ADD CONSTRAINT "learning_materials_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_versions" ADD CONSTRAINT "material_versions_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "learning_materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_segments" ADD CONSTRAINT "material_segments_material_version_id_fkey" FOREIGN KEY ("material_version_id") REFERENCES "material_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_classroom_subject_id_fkey" FOREIGN KEY ("classroom_subject_id") REFERENCES "classroom_subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_activities" ADD CONSTRAINT "exercise_activities_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_activity_lessons" ADD CONSTRAINT "exercise_activity_lessons_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "exercise_activities"("activity_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_activity_lessons" ADD CONSTRAINT "exercise_activity_lessons_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notebook_check_activities" ADD CONSTRAINT "notebook_check_activities_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notebook_reference_files" ADD CONSTRAINT "notebook_reference_files_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "notebook_check_activities"("activity_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notebook_criteria" ADD CONSTRAINT "notebook_criteria_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "notebook_check_activities"("activity_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_exercise_activity_id_fkey" FOREIGN KEY ("exercise_activity_id") REFERENCES "exercise_activities"("activity_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_self_practice_session_id_fkey" FOREIGN KEY ("self_practice_session_id") REFERENCES "self_practice_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_citations" ADD CONSTRAINT "question_citations_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_citations" ADD CONSTRAINT "question_citations_segment_id_fkey" FOREIGN KEY ("segment_id") REFERENCES "material_segments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_submissions" ADD CONSTRAINT "exercise_submissions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_submissions" ADD CONSTRAINT "exercise_submissions_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "exercise_activities"("activity_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "self_practice_sessions" ADD CONSTRAINT "self_practice_sessions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "self_practice_sessions" ADD CONSTRAINT "self_practice_sessions_classroom_subject_id_fkey" FOREIGN KEY ("classroom_subject_id") REFERENCES "classroom_subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "self_practice_lessons" ADD CONSTRAINT "self_practice_lessons_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "self_practice_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "self_practice_lessons" ADD CONSTRAINT "self_practice_lessons_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_answers" ADD CONSTRAINT "student_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_answers" ADD CONSTRAINT "student_answers_exercise_submission_id_fkey" FOREIGN KEY ("exercise_submission_id") REFERENCES "exercise_submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_answers" ADD CONSTRAINT "student_answers_self_practice_session_id_fkey" FOREIGN KEY ("self_practice_session_id") REFERENCES "self_practice_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answer_citations" ADD CONSTRAINT "answer_citations_answer_id_fkey" FOREIGN KEY ("answer_id") REFERENCES "student_answers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answer_citations" ADD CONSTRAINT "answer_citations_segment_id_fkey" FOREIGN KEY ("segment_id") REFERENCES "material_segments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notebook_check_periods" ADD CONSTRAINT "notebook_check_periods_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "notebook_check_activities"("activity_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notebook_submissions" ADD CONSTRAINT "notebook_submissions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notebook_submissions" ADD CONSTRAINT "notebook_submissions_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "notebook_check_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notebook_submission_files" ADD CONSTRAINT "notebook_submission_files_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "notebook_submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notebook_ai_drafts" ADD CONSTRAINT "notebook_ai_drafts_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "notebook_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notebook_assessments" ADD CONSTRAINT "notebook_assessments_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "notebook_submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notebook_assessments" ADD CONSTRAINT "notebook_assessments_evaluator_id_fkey" FOREIGN KEY ("evaluator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "criterion_results" ADD CONSTRAINT "criterion_results_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "notebook_assessments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "criterion_results" ADD CONSTRAINT "criterion_results_criterion_id_fkey" FOREIGN KEY ("criterion_id") REFERENCES "notebook_criteria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_events" ADD CONSTRAINT "schedule_events_classroom_subject_id_fkey" FOREIGN KEY ("classroom_subject_id") REFERENCES "classroom_subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_events" ADD CONSTRAINT "schedule_events_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_schedule_event_id_fkey" FOREIGN KEY ("schedule_event_id") REFERENCES "schedule_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_classroom_id_fkey" FOREIGN KEY ("classroom_id") REFERENCES "classrooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_chat_turns" ADD CONSTRAINT "ai_chat_turns_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "ai_conversations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_turn_id_fkey" FOREIGN KEY ("turn_id") REFERENCES "ai_chat_turns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_attributed_classroom_subject_id_fkey" FOREIGN KEY ("attributed_classroom_subject_id") REFERENCES "classroom_subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_message_citations" ADD CONSTRAINT "ai_message_citations_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "ai_messages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_message_citations" ADD CONSTRAINT "ai_message_citations_segment_id_fkey" FOREIGN KEY ("segment_id") REFERENCES "material_segments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject_prompt_topics" ADD CONSTRAINT "subject_prompt_topics_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject_prompt_topics" ADD CONSTRAINT "subject_prompt_topics_classroom_subject_id_fkey" FOREIGN KEY ("classroom_subject_id") REFERENCES "classroom_subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_score_results" ADD CONSTRAINT "lesson_score_results_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_score_results" ADD CONSTRAINT "lesson_score_results_classroom_subject_id_fkey" FOREIGN KEY ("classroom_subject_id") REFERENCES "classroom_subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_score_results" ADD CONSTRAINT "lesson_score_results_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_score_results" ADD CONSTRAINT "lesson_score_results_exercise_submission_id_fkey" FOREIGN KEY ("exercise_submission_id") REFERENCES "exercise_submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_score_results" ADD CONSTRAINT "lesson_score_results_self_practice_session_id_fkey" FOREIGN KEY ("self_practice_session_id") REFERENCES "self_practice_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_lesson_progress" ADD CONSTRAINT "student_lesson_progress_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_lesson_progress" ADD CONSTRAINT "student_lesson_progress_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_lesson_progress" ADD CONSTRAINT "student_lesson_progress_last_result_id_fkey" FOREIGN KEY ("last_result_id") REFERENCES "lesson_score_results"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- PostgreSQL rules that Prisma 6 cannot express in schema.prisma.
CREATE UNIQUE INDEX "one_current_classroom_per_student"
  ON "classroom_enrollments" ("student_id") WHERE "left_at" IS NULL;
CREATE UNIQUE INDEX "one_open_period_per_notebook_check"
  ON "notebook_check_periods" ("activity_id") WHERE "closed_at" IS NULL;

ALTER TABLE "classrooms" ADD CONSTRAINT "classroom_grade_range" CHECK ("grade_level" BETWEEN 1 AND 12);
ALTER TABLE "classroom_enrollments" ADD CONSTRAINT "enrollment_time_order" CHECK ("left_at" IS NULL OR "left_at" > "joined_at");
ALTER TABLE "material_versions" ADD CONSTRAINT "material_version_positive" CHECK ("version_no" > 0 AND "byte_size" > 0);
ALTER TABLE "material_segments" ADD CONSTRAINT "segment_position_positive" CHECK ("position_index" >= 0 AND "ordinal" > 0);
ALTER TABLE "exercise_activities" ADD CONSTRAINT "exercise_question_count_range" CHECK ("question_count" BETWEEN 1 AND 20);
ALTER TABLE "notebook_reference_files" ADD CONSTRAINT "notebook_reference_file_valid" CHECK ("byte_size" > 0 AND "sort_order" > 0 AND "mime_type" IN ('image/jpeg', 'image/png'));
ALTER TABLE "notebook_criteria" ADD CONSTRAINT "notebook_criterion_order_positive" CHECK ("order_index" > 0);
ALTER TABLE "questions" ADD CONSTRAINT "question_one_owner" CHECK (("exercise_activity_id" IS NOT NULL) <> ("self_practice_session_id" IS NOT NULL));
ALTER TABLE "questions" ADD CONSTRAINT "question_points_positive" CHECK ("max_points" > 0 AND "sort_order" > 0);
ALTER TABLE "exercise_submissions" ADD CONSTRAINT "exercise_score_nonnegative" CHECK ("total_score" IS NULL OR "total_score" >= 0);
ALTER TABLE "self_practice_sessions" ADD CONSTRAINT "practice_question_count_range" CHECK ("question_count" BETWEEN 1 AND 20);
ALTER TABLE "self_practice_sessions" ADD CONSTRAINT "practice_time_order" CHECK (("submitted_at" IS NULL OR "submitted_at" >= "started_at") AND ("completed_at" IS NULL OR ("submitted_at" IS NOT NULL AND "completed_at" >= "submitted_at")));
ALTER TABLE "self_practice_sessions" ADD CONSTRAINT "practice_score_nonnegative" CHECK ("total_score" IS NULL OR "total_score" >= 0);
ALTER TABLE "student_answers" ADD CONSTRAINT "answer_one_owner" CHECK (("exercise_submission_id" IS NOT NULL) <> ("self_practice_session_id" IS NOT NULL));
ALTER TABLE "student_answers" ADD CONSTRAINT "answer_score_nonnegative" CHECK ("earned_points" IS NULL OR "earned_points" >= 0);
ALTER TABLE "notebook_check_periods" ADD CONSTRAINT "notebook_period_valid" CHECK ("period_no" > 0 AND "due_at" > "opened_at" AND ("closed_at" IS NULL OR "closed_at" >= "opened_at"));
ALTER TABLE "notebook_submission_files" ADD CONSTRAINT "notebook_submission_file_valid" CHECK ("sort_order" BETWEEN 1 AND 5 AND "byte_size" BETWEEN 1 AND 10485760 AND "mime_type" IN ('image/jpeg', 'image/png'));
ALTER TABLE "notebook_submissions" ADD CONSTRAINT "notebook_lock_state_valid" CHECK (
  ("status" = 'CURRENT' AND "locked_at" IS NULL)
  OR ("status" IN ('LOCKED', 'FINALIZED') AND "locked_at" IS NOT NULL)
);
ALTER TABLE "notebook_submissions" ADD CONSTRAINT "notebook_submission_time_order" CHECK ("updated_at" >= "submitted_at" AND ("locked_at" IS NULL OR "locked_at" >= "submitted_at"));
ALTER TABLE "notifications" ADD CONSTRAINT "notification_one_source" CHECK (("schedule_event_id" IS NOT NULL) <> ("activity_id" IS NOT NULL));
ALTER TABLE "subject_prompt_topics" ADD CONSTRAINT "prompt_topic_period_valid" CHECK ("period_end" >= "period_start" AND "prompt_count" >= 0 AND jsonb_typeof("topics") = 'array');
ALTER TABLE "lesson_score_results" ADD CONSTRAINT "lesson_score_source_matches_stream" CHECK (
  ("stream" = 'ASSIGNED' AND "exercise_submission_id" IS NOT NULL AND "self_practice_session_id" IS NULL)
  OR ("stream" = 'SELF_PRACTICE' AND "self_practice_session_id" IS NOT NULL AND "exercise_submission_id" IS NULL)
);
ALTER TABLE "lesson_score_results" ADD CONSTRAINT "lesson_score_range" CHECK ("max_points" > 0 AND "earned_points" BETWEEN 0 AND "max_points");

-- A projection must point to the result for the same student, lesson and stream.
ALTER TABLE "lesson_score_results" ADD CONSTRAINT "score_result_identity" UNIQUE ("id", "student_id", "lesson_id", "stream");
ALTER TABLE "student_lesson_progress" ADD CONSTRAINT "progress_last_result_matches" FOREIGN KEY ("last_result_id", "student_id", "lesson_id", "stream")
  REFERENCES "lesson_score_results" ("id", "student_id", "lesson_id", "stream") ON DELETE RESTRICT;

-- A criterion finding cannot be attached to another notebook check.
CREATE FUNCTION check_criterion_result_activity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "notebook_assessments" a
    JOIN "notebook_submissions" s ON s."id" = a."submission_id"
    JOIN "notebook_check_periods" p ON p."id" = s."period_id"
    JOIN "notebook_criteria" c ON c."id" = NEW."criterion_id"
    WHERE a."id" = NEW."assessment_id" AND p."activity_id" = c."activity_id"
  ) THEN
    RAISE EXCEPTION 'Criterion result must belong to the assessed notebook check';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "criterion_result_activity_guard" BEFORE INSERT OR UPDATE OF "assessment_id", "criterion_id" ON "criterion_results"
  FOR EACH ROW EXECUTE FUNCTION check_criterion_result_activity();
