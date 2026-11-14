-- Enforce single active classroom enrollment per student
CREATE UNIQUE INDEX "classroom_enrollments_current_student_unique" ON "classroom_enrollments"("student_id") WHERE "left_at" IS NULL;

-- Enforce case-insensitive classroom name uniqueness per academic year
CREATE UNIQUE INDEX "classrooms_name_lower_academic_year_key" ON "classrooms" (LOWER("name"), "academic_year");
