/*
  Warnings:

  - A unique constraint covering the columns `[clientTransactionId]` on the table `Transaction` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "clientTransactionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_clientTransactionId_key" ON "Transaction"("clientTransactionId");
