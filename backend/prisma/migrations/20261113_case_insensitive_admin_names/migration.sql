-- Enforce the same case-insensitive identity used by Admin prechecks.
-- Existing case-only duplicates must be resolved before this migration is deployed.
CREATE UNIQUE INDEX "users_username_lower_key" ON "users" (LOWER("username"));
CREATE UNIQUE INDEX "subjects_name_lower_key" ON "subjects" (LOWER("name"));
