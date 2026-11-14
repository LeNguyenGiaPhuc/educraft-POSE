-- BE-06: serialize submission/period races and protect AI retry results

ALTER TABLE "notebook_submissions"
ADD COLUMN "analysis_attempt_id" UUID;

CREATE OR REPLACE FUNCTION lock_notebook_activity_on_submission()
RETURNS TRIGGER AS $$
DECLARE
  target_activity_id UUID;
  period_closed_at TIMESTAMPTZ;
BEGIN
  SELECT p."activity_id", p."closed_at"
  INTO target_activity_id, period_closed_at
  FROM "notebook_check_periods" p
  WHERE p."id" = NEW."period_id"
  FOR UPDATE;

  IF period_closed_at IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot submit to a closed notebook period'
      USING ERRCODE = '23514';
  END IF;

  IF target_activity_id IS NOT NULL THEN
    PERFORM 1 FROM "activities" WHERE "id" = target_activity_id FOR UPDATE;
    UPDATE "notebook_check_activities"
    SET "criteria_locked_at" = CURRENT_TIMESTAMP
    WHERE "activity_id" = target_activity_id AND "criteria_locked_at" IS NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION guard_locked_notebook_criteria()
RETURNS TRIGGER AS $$
DECLARE
  target_activity_id UUID;
  is_locked BOOLEAN;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_activity_id := OLD."activity_id";
  ELSE
    target_activity_id := NEW."activity_id";
  END IF;

  SELECT ("criteria_locked_at" IS NOT NULL)
  INTO is_locked
  FROM "notebook_check_activities"
  WHERE "activity_id" = target_activity_id
  FOR UPDATE;

  IF is_locked THEN
    RAISE EXCEPTION 'Cannot modify notebook criteria after criteria have been locked'
      USING ERRCODE = '23514';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION guard_locked_notebook_reference_files()
RETURNS TRIGGER AS $$
DECLARE
  target_activity_id UUID;
  is_locked BOOLEAN;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_activity_id := OLD."activity_id";
  ELSE
    target_activity_id := NEW."activity_id";
  END IF;

  SELECT ("criteria_locked_at" IS NOT NULL)
  INTO is_locked
  FROM "notebook_check_activities"
  WHERE "activity_id" = target_activity_id
  FOR UPDATE;

  IF is_locked THEN
    RAISE EXCEPTION 'Cannot modify notebook reference files after criteria have been locked'
      USING ERRCODE = '23514';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
