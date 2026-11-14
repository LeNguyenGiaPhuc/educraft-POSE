-- BE-06: Notebook check criteria lock and finalized assessment immutability guards

-- 1. Criteria locked_at cannot be cleared or changed once set
CREATE OR REPLACE FUNCTION guard_notebook_criteria_locked_at()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD."criteria_locked_at" IS NOT NULL THEN
    IF NEW."criteria_locked_at" IS NULL OR NEW."criteria_locked_at" <> OLD."criteria_locked_at" THEN
      RAISE EXCEPTION 'criteria_locked_at is permanent and cannot be modified or cleared'
        USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notebook_check_activities_guard_lock
BEFORE UPDATE OF "criteria_locked_at" ON "notebook_check_activities"
FOR EACH ROW EXECUTE FUNCTION guard_notebook_criteria_locked_at();

-- 2. First accepted notebook submission locks criteria_locked_at
CREATE OR REPLACE FUNCTION lock_notebook_activity_on_submission()
RETURNS TRIGGER AS $$
DECLARE
  target_activity_id UUID;
BEGIN
  SELECT p."activity_id"
  INTO target_activity_id
  FROM "notebook_check_periods" p
  WHERE p."id" = NEW."period_id";

  IF target_activity_id IS NOT NULL THEN
    PERFORM 1 FROM "activities" WHERE "id" = target_activity_id FOR UPDATE;
    UPDATE "notebook_check_activities"
    SET "criteria_locked_at" = CURRENT_TIMESTAMP
    WHERE "activity_id" = target_activity_id AND "criteria_locked_at" IS NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notebook_submissions_lock_criteria
BEFORE INSERT ON "notebook_submissions"
FOR EACH ROW EXECUTE FUNCTION lock_notebook_activity_on_submission();

-- 3. Guard criteria modifications once criteria are locked
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
  WHERE "activity_id" = target_activity_id;

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

CREATE TRIGGER notebook_criteria_guard_locked
BEFORE INSERT OR UPDATE OR DELETE ON "notebook_criteria"
FOR EACH ROW EXECUTE FUNCTION guard_locked_notebook_criteria();

-- 4. Guard reference files modifications once criteria are locked
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
  WHERE "activity_id" = target_activity_id;

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

CREATE TRIGGER notebook_reference_files_guard_locked
BEFORE INSERT OR UPDATE OR DELETE ON "notebook_reference_files"
FOR EACH ROW EXECUTE FUNCTION guard_locked_notebook_reference_files();

-- 5. Guard finalized assessment immutability
CREATE OR REPLACE FUNCTION guard_finalized_notebook_assessment()
RETURNS TRIGGER AS $$
DECLARE
  sub_status "submission_status";
BEGIN
  SELECT s."status"
  INTO sub_status
  FROM "notebook_submissions" s
  WHERE s."id" = OLD."submission_id";

  IF sub_status = 'FINALIZED' THEN
    RAISE EXCEPTION 'Finalized notebook assessment cannot be modified or deleted'
      USING ERRCODE = '23514';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notebook_assessments_guard_finalized
BEFORE UPDATE OR DELETE ON "notebook_assessments"
FOR EACH ROW EXECUTE FUNCTION guard_finalized_notebook_assessment();

-- 6. Guard finalized criterion results immutability
CREATE OR REPLACE FUNCTION guard_finalized_criterion_result()
RETURNS TRIGGER AS $$
DECLARE
  sub_status "submission_status";
BEGIN
  SELECT s."status"
  INTO sub_status
  FROM "notebook_assessments" a
  JOIN "notebook_submissions" s ON s."id" = a."submission_id"
  WHERE a."id" = OLD."assessment_id";

  IF sub_status = 'FINALIZED' THEN
    RAISE EXCEPTION 'Finalized criterion results cannot be modified or deleted'
      USING ERRCODE = '23514';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER criterion_results_guard_finalized
BEFORE UPDATE OR DELETE ON "criterion_results"
FOR EACH ROW EXECUTE FUNCTION guard_finalized_criterion_result();
