-- CreateEnum
CREATE TYPE "BitrixConnectionKind" AS ENUM ('OAUTH', 'WEBHOOK');

-- AlterTable
ALTER TABLE "BitrixPortal" ADD COLUMN     "kind" "BitrixConnectionKind" NOT NULL DEFAULT 'OAUTH',
ADD COLUMN     "webhookUrl" TEXT,
ALTER COLUMN "accessToken" DROP NOT NULL,
ALTER COLUMN "refreshToken" DROP NOT NULL;
