-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "buyPrice" INTEGER;

-- AlterTable
ALTER TABLE "TransactionItem" ADD COLUMN     "buyPriceSnap" INTEGER,
ADD COLUMN     "profit" INTEGER;

-- CreateTable
CREATE TABLE "ProductBatch" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "expiredAt" TIMESTAMP(3) NOT NULL,
    "stock" INTEGER NOT NULL,
    "buyPrice" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductBatch_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ProductBatch" ADD CONSTRAINT "ProductBatch_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
