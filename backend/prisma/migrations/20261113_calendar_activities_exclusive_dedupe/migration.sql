-- AlterTable schedule_events: add lesson_id, activity_id
ALTER TABLE "schedule_events" ADD COLUMN "lesson_id" UUID;
ALTER TABLE "schedule_events" ADD COLUMN "activity_id" UUID;

-- AddForeignKey to lessons
ALTER TABLE "schedule_events" ADD CONSTRAINT "schedule_events_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey to activities
ALTER TABLE "schedule_events" ADD CONSTRAINT "schedule_events_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add Check Constraint for exclusive link (cannot link both lesson and activity at the same time)
ALTER TABLE "schedule_events" ADD CONSTRAINT "chk_schedule_events_exclusive_link" CHECK (
  NOT ("lesson_id" IS NOT NULL AND "activity_id" IS NOT NULL)
);

-- CreateIndex on schedule_events (classroom_subject_id, starts_at)
CREATE INDEX "schedule_events_classroom_subject_id_starts_at_idx" ON "schedule_events"("classroom_subject_id", "starts_at");

-- AlterTable notifications: add dedupe_key
ALTER TABLE "notifications" ADD COLUMN "dedupe_key" VARCHAR(120);

-- Backfill dedupe_key for any existing notifications
UPDATE "notifications" SET "dedupe_key" = COALESCE(
  CASE WHEN "activity_id" IS NOT NULL THEN 'activity:' || "activity_id"::text ELSE NULL END,
  CASE WHEN "schedule_event_id" IS NOT NULL THEN 'event:' || "schedule_event_id"::text ELSE NULL END,
  'legacy:' || "id"::text
) WHERE "dedupe_key" IS NULL;

-- CreateUniqueIndex on notifications (recipient_id, dedupe_key)
CREATE UNIQUE INDEX "notifications_recipient_id_dedupe_key_key" ON "notifications"("recipient_id", "dedupe_key");
