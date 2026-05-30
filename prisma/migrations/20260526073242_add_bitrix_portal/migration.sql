-- CreateTable
CREATE TABLE "BitrixPortal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "clientEndpoint" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "scope" TEXT,
    "status" "ConnectionStatus" NOT NULL DEFAULT 'CONNECTED',
    "expiresAt" TIMESTAMP(3),
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BitrixPortal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BitrixPortal_userId_idx" ON "BitrixPortal"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BitrixPortal_userId_memberId_key" ON "BitrixPortal"("userId", "memberId");

-- AddForeignKey
ALTER TABLE "BitrixPortal" ADD CONSTRAINT "BitrixPortal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
