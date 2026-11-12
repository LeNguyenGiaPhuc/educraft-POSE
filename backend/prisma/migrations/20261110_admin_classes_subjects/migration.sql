-- AlterTable
ALTER TABLE "users" ADD COLUMN "contact" TEXT,
ADD COLUMN "password_changed_at" TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "classroom_subjects" ALTER COLUMN "teacher_id" DROP NOT NULL;
