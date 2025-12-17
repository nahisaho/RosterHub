-- CreateEnum
CREATE TYPE "MappingTransformationType" AS ENUM ('direct', 'constant', 'concatenate', 'split', 'lookup', 'script', 'dateFormat', 'trim', 'lowercase', 'uppercase', 'substring', 'replace', 'default');

-- CreateTable
CREATE TABLE "field_mapping_configs" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "entityType" VARCHAR(50) NOT NULL,
    "organizationId" VARCHAR(255) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "createdBy" VARCHAR(255) NOT NULL,

    CONSTRAINT "field_mapping_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "field_mappings" (
    "id" UUID NOT NULL,
    "configId" UUID NOT NULL,
    "targetField" VARCHAR(255) NOT NULL,
    "sourceFields" VARCHAR(255)[],
    "transformationType" "MappingTransformationType" NOT NULL,
    "transformConfig" JSONB,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "defaultValue" VARCHAR(1000),
    "validationRules" JSONB,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "field_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mapping_lookup_tables" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "organizationId" VARCHAR(255) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "mapping_lookup_tables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mapping_lookup_entries" (
    "id" UUID NOT NULL,
    "tableId" UUID NOT NULL,
    "sourceValue" VARCHAR(500) NOT NULL,
    "targetValue" VARCHAR(500) NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "mapping_lookup_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "field_mapping_configs_organizationId_idx" ON "field_mapping_configs"("organizationId");

-- CreateIndex
CREATE INDEX "field_mapping_configs_entityType_idx" ON "field_mapping_configs"("entityType");

-- CreateIndex
CREATE INDEX "field_mapping_configs_isActive_idx" ON "field_mapping_configs"("isActive");

-- CreateIndex
CREATE INDEX "field_mapping_configs_isDefault_idx" ON "field_mapping_configs"("isDefault");

-- CreateIndex
CREATE INDEX "field_mappings_configId_idx" ON "field_mappings"("configId");

-- CreateIndex
CREATE INDEX "field_mappings_targetField_idx" ON "field_mappings"("targetField");

-- CreateIndex
CREATE INDEX "mapping_lookup_tables_organizationId_idx" ON "mapping_lookup_tables"("organizationId");

-- CreateIndex
CREATE INDEX "mapping_lookup_tables_name_idx" ON "mapping_lookup_tables"("name");

-- CreateIndex
CREATE INDEX "mapping_lookup_tables_isActive_idx" ON "mapping_lookup_tables"("isActive");

-- CreateIndex
CREATE INDEX "mapping_lookup_entries_tableId_idx" ON "mapping_lookup_entries"("tableId");

-- CreateIndex
CREATE INDEX "mapping_lookup_entries_sourceValue_idx" ON "mapping_lookup_entries"("sourceValue");

-- CreateIndex
CREATE UNIQUE INDEX "mapping_lookup_entries_tableId_sourceValue_key" ON "mapping_lookup_entries"("tableId", "sourceValue");

-- AddForeignKey
ALTER TABLE "field_mappings" ADD CONSTRAINT "field_mappings_configId_fkey" FOREIGN KEY ("configId") REFERENCES "field_mapping_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mapping_lookup_entries" ADD CONSTRAINT "mapping_lookup_entries_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "mapping_lookup_tables"("id") ON DELETE CASCADE ON UPDATE CASCADE;
