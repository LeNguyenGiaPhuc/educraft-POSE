ALTER TABLE "learning_materials"
ADD COLUMN "active_version_id" UUID;

UPDATE "learning_materials" AS material
SET "active_version_id" = selected."id"
FROM (
    SELECT DISTINCT ON ("material_id")
        "id",
        "material_id"
    FROM "material_versions"
    WHERE "processing_status" = 'PROCESSED'
    ORDER BY "material_id", "version_no" DESC
) AS selected
WHERE material."id" = selected."material_id";

ALTER TABLE "learning_materials"
ADD CONSTRAINT "learning_materials_active_version_id_fkey"
FOREIGN KEY ("active_version_id") REFERENCES "material_versions"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "learning_materials_active_version_id_key"
ON "learning_materials"("active_version_id");
