ALTER TABLE "material_versions"
ADD COLUMN "processing_attempt_id" UUID,
ADD COLUMN "processing_started_at" TIMESTAMPTZ(6);

CREATE INDEX "material_versions_processing_status_processing_started_at_idx"
ON "material_versions"("processing_status", "processing_started_at");
