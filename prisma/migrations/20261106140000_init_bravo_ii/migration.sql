-- Migration versionada do esquema BRAVO_II (Homologação Neon PostgreSQL bravo_ii_hml)
-- Complementa as migrations 0001..0010 da pasta database/migrations/
CREATE TABLE IF NOT EXISTS "BravoAiQuotaWindow" (
  "actorId" UUID NOT NULL,
  "bucket" VARCHAR(10) NOT NULL,
  "start" TIMESTAMP(3) NOT NULL,
  "requests" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "BravoAiQuotaWindow_pkey" PRIMARY KEY ("actorId", "bucket", "start")
);

CREATE INDEX IF NOT EXISTS "BravoAiQuotaWindow_start_idx" ON "BravoAiQuotaWindow"("start");
