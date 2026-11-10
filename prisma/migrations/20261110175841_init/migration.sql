-- CreateEnum
CREATE TYPE "Role" AS ENUM ('WEAVER', 'BUYER', 'COOP_ADMIN');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('DRAFT', 'NEEDS_ANSWERS', 'READY_TO_CONFIRM', 'LIVE', 'SOLD', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('CREATED', 'PAID', 'SHIPPED', 'DELIVERED', 'REFUNDED', 'FAILED');

-- CreateEnum
CREATE TYPE "Channel" AS ENUM ('WEB', 'ASSISTANT', 'MCP');

-- CreateEnum
CREATE TYPE "PayoutRecipient" AS ENUM ('WEAVER', 'COOP');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'SENT', 'SUCCEEDED', 'FAILED');

-- CreateTable
CREATE TABLE "Coop" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "town" TEXT NOT NULL,
    "paypalEmail" TEXT NOT NULL,
    "commissionPct" INTEGER NOT NULL DEFAULT 10,

    CONSTRAINT "Coop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "name" TEXT NOT NULL,
    "town" TEXT,
    "preferredLang" TEXT NOT NULL DEFAULT 'ta',
    "bioNative" TEXT,
    "bioEn" TEXT,
    "photoUrl" TEXT,
    "paypalEmail" TEXT,
    "email" TEXT,
    "coopId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Listing" (
    "id" TEXT NOT NULL,
    "weaverId" TEXT NOT NULL,
    "status" "ListingStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT,
    "lang" TEXT NOT NULL DEFAULT 'ta',
    "titleNative" TEXT,
    "description" TEXT,
    "story" TEXT,
    "category" TEXT,
    "fabric" TEXT,
    "weave" TEXT,
    "colors" TEXT[],
    "motifs" TEXT[],
    "includesBlouse" BOOLEAN,
    "stitched" BOOLEAN,
    "lengthMeters" DOUBLE PRECISION,
    "weeksToWeave" INTEGER,
    "giTag" TEXT,
    "priceInr" INTEGER,
    "priceUsdCents" INTEGER,
    "loomClipUrl" TEXT,
    "voiceNoteUrl" TEXT,
    "transcriptNative" TEXT,
    "transcriptEn" TEXT,
    "pendingQuestions" JSONB,
    "readbackNative" TEXT,
    "readbackAudioUrl" TEXT,
    "aiRaw" JSONB,
    "coopConfirmedAt" TIMESTAMP(3),
    "paypalProductId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Photo" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "Photo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "buyerId" TEXT,
    "status" "OrderStatus" NOT NULL DEFAULT 'CREATED',
    "channel" "Channel" NOT NULL DEFAULT 'WEB',
    "paypalOrderId" TEXT NOT NULL,
    "captureId" TEXT,
    "itemUsdCents" INTEGER NOT NULL,
    "shippingUsdCents" INTEGER NOT NULL,
    "totalUsdCents" INTEGER NOT NULL,
    "payerEmail" TEXT,
    "shippingAddress" JSONB,
    "trackingNumber" TEXT,
    "carrier" TEXT,
    "fulfilledAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payout" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "recipient" "PayoutRecipient" NOT NULL,
    "receiverEmail" TEXT NOT NULL,
    "amountUsdCents" INTEGER NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "paypalBatchId" TEXT,
    "paypalItemId" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "lang" TEXT NOT NULL DEFAULT 'ta',
    "textNative" TEXT NOT NULL,
    "textEn" TEXT NOT NULL,
    "audioUrl" TEXT,
    "orderId" TEXT,
    "heardAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentLog" (
    "id" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "listingId" TEXT,
    "orderId" TEXT,
    "detail" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TtsCache" (
    "hash" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TtsCache_pkey" PRIMARY KEY ("hash")
);

-- CreateIndex
CREATE UNIQUE INDEX "Order_paypalOrderId_key" ON "Order"("paypalOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_captureId_key" ON "Order"("captureId");

-- CreateIndex
CREATE UNIQUE INDEX "Payout_orderId_recipient_key" ON "Payout"("orderId", "recipient");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_coopId_fkey" FOREIGN KEY ("coopId") REFERENCES "Coop"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_weaverId_fkey" FOREIGN KEY ("weaverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
