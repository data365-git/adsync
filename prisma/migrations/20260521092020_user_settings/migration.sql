-- AlterTable
ALTER TABLE "User" ADD COLUMN     "schedulesPaused" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "UserSettings" (
    "userId" TEXT NOT NULL,
    "emailOnFailure" BOOLEAN NOT NULL DEFAULT false,
    "slackWebhookUrl" TEXT,
    "genericWebhookUrl" TEXT,
    "quietHoursStart" TEXT,
    "quietHoursEnd" TEXT,
    "schedulesPaused" BOOLEAN NOT NULL DEFAULT false,
    "defaultSheetTemplate" TEXT,
    "weekStartsOn" INTEGER NOT NULL DEFAULT 1,
    "displayName" TEXT,
    "defaultAdAccountBehavior" TEXT,

    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
