-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'MODERATOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "Color" AS ENUM ('GREEN', 'VIOLET', 'RED');

-- CreateEnum
CREATE TYPE "RoundStatus" AS ENUM ('OPEN', 'SETTLING', 'SETTLED');

-- CreateEnum
CREATE TYPE "BetStatus" AS ENUM ('PENDING', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "TxType" AS ENUM ('SIGNUP_BONUS', 'ADMIN_ADJUST', 'BET', 'WIN');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "role" "Role" NOT NULL DEFAULT 'USER',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "coins" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Otp" (
    "phone" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Otp_pkey" PRIMARY KEY ("phone")
);

-- CreateTable
CREATE TABLE "Round" (
    "id" SERIAL NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" "RoundStatus" NOT NULL DEFAULT 'OPEN',
    "seed" TEXT NOT NULL,
    "seedHash" TEXT NOT NULL,
    "resultNumber" INTEGER,

    CONSTRAINT "Round_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roundId" INTEGER NOT NULL,
    "color" "Color" NOT NULL,
    "amount" INTEGER NOT NULL,
    "payout" INTEGER NOT NULL DEFAULT 0,
    "status" "BetStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoinTx" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "type" "TxType" NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "balanceAfter" INTEGER NOT NULL,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoinTx_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target" TEXT NOT NULL DEFAULT '',
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Round_startsAt_key" ON "Round"("startsAt");

-- CreateIndex
CREATE INDEX "Round_status_endsAt_idx" ON "Round"("status", "endsAt");

-- CreateIndex
CREATE INDEX "Bet_roundId_idx" ON "Bet"("roundId");

-- CreateIndex
CREATE INDEX "Bet_userId_createdAt_idx" ON "Bet"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "CoinTx_userId_createdAt_idx" ON "CoinTx"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "Bet" ADD CONSTRAINT "Bet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bet" ADD CONSTRAINT "Bet_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoinTx" ADD CONSTRAINT "CoinTx_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
