-- AlterTable
ALTER TABLE "User" ADD COLUMN     "selectedChatId" TEXT;

-- CreateTable
CREATE TABLE "Chat" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "selectedExampleValue" TEXT,
    "source" TEXT NOT NULL DEFAULT '',
    "argsJson" TEXT NOT NULL DEFAULT '',
    "witJson" TEXT NOT NULL DEFAULT '',
    "faucetUrl" TEXT,
    "fundingTxId" TEXT,
    "fundingTxSnapshot" JSONB,
    "fundingUtxoVout" INTEGER,
    "fundingUtxoValueSats" INTEGER,
    "fundingUtxoNonceHex" TEXT,
    "walletPubHex" TEXT,
    "walletPrivEnc" TEXT,
    "walletPrivIv" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Chat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Chat_userId_createdAt_idx" ON "Chat"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
