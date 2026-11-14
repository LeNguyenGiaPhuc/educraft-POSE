-- Keep assessed activity content immutable after the first submission.
-- Every content change and submission insert locks the same activity row.

CREATE OR REPLACE FUNCTION "lock_exercise_activity_for_submission"()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM 1 FROM "activities" WHERE "id" = NEW."activity_id" FOR UPDATE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "exercise_submissions_lock_activity"
BEFORE INSERT OR UPDATE OF "activity_id" ON "exercise_submissions"
FOR EACH ROW EXECUTE FUNCTION "lock_exercise_activity_for_submission"();

CREATE OR REPLACE FUNCTION "guard_submitted_question_content"()
RETURNS TRIGGER AS $$
DECLARE
  target_activity_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_activity_id := OLD."exercise_activity_id";
  ELSE
    target_activity_id := NEW."exercise_activity_id";
  END IF;

  IF target_activity_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;

  PERFORM 1 FROM "activities" WHERE "id" = target_activity_id FOR UPDATE;

  IF EXISTS (
    SELECT 1 FROM "exercise_submissions" WHERE "activity_id" = target_activity_id
  ) THEN
    RAISE EXCEPTION 'Cannot change questions after an exercise submission exists'
      USING ERRCODE = '23514';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "questions_guard_submitted_activity"
BEFORE INSERT OR UPDATE OR DELETE ON "questions"
FOR EACH ROW EXECUTE FUNCTION "guard_submitted_question_content"();

CREATE OR REPLACE FUNCTION "guard_submitted_question_citation"()
RETURNS TRIGGER AS $$
DECLARE
  target_question_id UUID;
  target_activity_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_question_id := OLD."question_id";
  ELSE
    target_question_id := NEW."question_id";
  END IF;

  SELECT "exercise_activity_id"
  INTO target_activity_id
  FROM "questions"
  WHERE "id" = target_question_id;

  IF target_activity_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;

  PERFORM 1 FROM "activities" WHERE "id" = target_activity_id FOR UPDATE;

  IF EXISTS (
    SELECT 1 FROM "exercise_submissions" WHERE "activity_id" = target_activity_id
  ) THEN
    RAISE EXCEPTION 'Cannot change citations after an exercise submission exists'
      USING ERRCODE = '23514';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "question_citations_guard_submitted_activity"
BEFORE INSERT OR UPDATE OR DELETE ON "question_citations"
FOR EACH ROW EXECUTE FUNCTION "guard_submitted_question_citation"();

CREATE OR REPLACE FUNCTION "guard_submitted_activity_lesson"()
RETURNS TRIGGER AS $$
DECLARE
  target_activity_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_activity_id := OLD."activity_id";
  ELSE
    target_activity_id := NEW."activity_id";
  END IF;

  PERFORM 1 FROM "activities" WHERE "id" = target_activity_id FOR UPDATE;

  IF EXISTS (
    SELECT 1 FROM "exercise_submissions" WHERE "activity_id" = target_activity_id
  ) THEN
    RAISE EXCEPTION 'Cannot change linked lessons after an exercise submission exists'
      USING ERRCODE = '23514';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "exercise_activity_lessons_guard_submitted_activity"
BEFORE INSERT OR UPDATE OR DELETE ON "exercise_activity_lessons"
FOR EACH ROW EXECUTE FUNCTION "guard_submitted_activity_lesson"();
