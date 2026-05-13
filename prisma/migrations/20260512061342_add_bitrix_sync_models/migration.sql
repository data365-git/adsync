-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "sourceRowId" TEXT NOT NULL,
    "bitrixId" TEXT,
    "name" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "status" TEXT,
    "source" TEXT,
    "raw" JSONB NOT NULL,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deal" (
    "id" TEXT NOT NULL,
    "sourceRowId" TEXT NOT NULL,
    "bitrixId" TEXT,
    "title" TEXT,
    "contactId" TEXT,
    "stageId" TEXT,
    "amount" TEXT,
    "currency" TEXT,
    "raw" JSONB NOT NULL,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "sourceRowId" TEXT NOT NULL,
    "bitrixId" TEXT,
    "name" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "source" TEXT,
    "raw" JSONB NOT NULL,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncJob" (
    "id" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "payload" JSONB NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyncJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncLog" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "bitrixId" TEXT,
    "direction" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "request" JSONB NOT NULL,
    "response" JSONB NOT NULL,
    "error" TEXT,
    "duration" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BitrixSchemaCache" (
    "entity" TEXT NOT NULL,
    "schema" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BitrixSchemaCache_pkey" PRIMARY KEY ("entity")
);

-- CreateIndex
CREATE UNIQUE INDEX "Lead_sourceRowId_key" ON "Lead"("sourceRowId");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_bitrixId_key" ON "Lead"("bitrixId");

-- CreateIndex
CREATE INDEX "Lead_bitrixId_idx" ON "Lead"("bitrixId");

-- CreateIndex
CREATE INDEX "Lead_phone_idx" ON "Lead"("phone");

-- CreateIndex
CREATE INDEX "Lead_email_idx" ON "Lead"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Deal_sourceRowId_key" ON "Deal"("sourceRowId");

-- CreateIndex
CREATE UNIQUE INDEX "Deal_bitrixId_key" ON "Deal"("bitrixId");

-- CreateIndex
CREATE INDEX "Deal_bitrixId_idx" ON "Deal"("bitrixId");

-- CreateIndex
CREATE UNIQUE INDEX "Contact_sourceRowId_key" ON "Contact"("sourceRowId");

-- CreateIndex
CREATE UNIQUE INDEX "Contact_bitrixId_key" ON "Contact"("bitrixId");

-- CreateIndex
CREATE INDEX "Contact_bitrixId_idx" ON "Contact"("bitrixId");

-- CreateIndex
CREATE INDEX "Contact_phone_idx" ON "Contact"("phone");

-- CreateIndex
CREATE INDEX "Contact_email_idx" ON "Contact"("email");

-- CreateIndex
CREATE INDEX "SyncJob_status_scheduledAt_idx" ON "SyncJob"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "SyncLog_createdAt_idx" ON "SyncLog"("createdAt");

-- CreateIndex
CREATE INDEX "SyncLog_entity_success_idx" ON "SyncLog"("entity", "success");
