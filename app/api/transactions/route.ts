export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  PaymentType,
  OwnershipType,
  DebtStatus,
  Transaction,
} from "@/app/generated/prisma/client";

/* =====================
   TYPES
===================== */

interface TransactionItemRequest {
  productId: string;
  qty: number;
}

interface TransactionRequestBody {
  paymentType: PaymentType;
  customerName?: string;
  items: TransactionItemRequest[];
  clientTransactionId?: string;
}

interface ComputedTransactionItem {
  product: {
    id: string;
    name: string;
    sellPrice: number;
    buyPrice: number | null;
    stock: number;
    ownershipType: OwnershipType;
    partnerId: string | null;
  };
  qty: number;
  subtotal: number;
  buyPriceSnap: number;
  profit: number;
}

// Extended interface untuk hasil transaction dengan data tambahan
interface TransactionResult extends Transaction {
  totalProfit: number;
  itemCount: number;
}

/* =====================
   HANDLER
===================== */

export async function POST(req: Request) {
  try {
    const body: TransactionRequestBody = await req.json();
    const { paymentType, customerName, items, clientTransactionId } = body;

    /* ===== VALIDASI DASAR ===== */
    if (!paymentType || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Data transaksi tidak lengkap" },
        { status: 400 }
      );
    }

    if (paymentType === PaymentType.DEBT && !customerName) {
      return NextResponse.json(
        { error: "Nama pelanggan wajib untuk bon" },
        { status: 400 }
      );
    }

    if (items.some((i) => i.qty <= 0)) {
      return NextResponse.json(
        { error: "Qty harus lebih dari 0" },
        { status: 400 }
      );
    }

    /* ===== ATOMIC TRANSACTION ===== */
    const transactionResult = await prisma.$transaction(async (tx): Promise<TransactionResult> => {
      /* === ANTI DOUBLE SUBMIT === */
      if (clientTransactionId) {
        const exists = await tx.transaction.findFirst({
          where: { clientTransactionId },
        });

        if (exists) {
          throw new Error("Transaksi ini sudah diproses sebelumnya");
        }
      }

      const productIds = items.map((i) => i.productId);

      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
        include: {
          partner: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (products.length !== productIds.length) {
        throw new Error("Ada produk yang tidak ditemukan");
      }

      let totalAmount = 0;
      let totalProfit = 0;

      /* === HITUNG SNAPSHOT ITEM === */
      const computedItems: ComputedTransactionItem[] = items.map((item) => {
        const product = products.find((p) => p.id === item.productId);
        if (!product) throw new Error("Produk tidak ditemukan");

        if (product.stock < item.qty) {
          throw new Error(`Stok tidak cukup: ${product.name}`);
        }

        const subtotal = product.sellPrice * item.qty;
        totalAmount += subtotal;

        // HITUNG PROFIT sesuai permintaan
        const buyPrice =
          product.ownershipType === OwnershipType.OWN
            ? product.buyPrice ?? 0
            : 0;

        const profit = (product.sellPrice - buyPrice) * item.qty;
        totalProfit += profit;

        return {
          product: {
            id: product.id,
            name: product.name,
            sellPrice: product.sellPrice,
            buyPrice: product.buyPrice,
            stock: product.stock,
            ownershipType: product.ownershipType,
            partnerId: product.partnerId,
          },
          qty: item.qty,
          subtotal,
          buyPriceSnap: buyPrice, // SIMPAN buyPriceSnap
          profit, // SIMPAN profit
        };
      });

      /* === CREATE TRANSACTION === */
      const trx = await tx.transaction.create({
        data: {
          paymentType,
          totalAmount,
          clientTransactionId, // SIMPAN clientTransactionId
        },
      });

      /* === ITEM + STOK + KONSINYASI === */
      for (const item of computedItems) {
        await tx.transactionItem.create({
          data: {
            transactionId: trx.id,
            productId: item.product.id,
            qty: item.qty,
            buyPriceSnap: item.buyPriceSnap,
            sellPriceSnap: item.product.sellPrice,
            subtotal: item.subtotal,
            profit: item.profit,
          },
        });

        await tx.product.update({
          where: { id: item.product.id },
          data: {
            stock: { decrement: item.qty },
          },
        });

        if (
          item.product.ownershipType === OwnershipType.CONSIGNMENT &&
          item.product.partnerId
        ) {
          await tx.consignmentPartner.update({
            where: { id: item.product.partnerId },
            data: {
              balance: { increment: item.subtotal },
            },
          });
        }
      }

      /* === DEBT === */
      if (paymentType === PaymentType.DEBT) {
        await tx.debt.create({
          data: {
            customerName: customerName!,
            transactionId: trx.id,
            amount: totalAmount,
            status: DebtStatus.UNPAID,
          },
        });
      }

      /* === CREATE AUDIT LOG === */
      await tx.auditLog.create({
        data: {
          action: "CREATE_TRANSACTION",
          entity: "Transaction",
          entityId: trx.id,
          meta: {
            totalAmount,
            totalProfit,
            paymentType,
            itemCount: items.length,
            customerName: customerName || null,
            clientTransactionId: clientTransactionId || null,
            items: computedItems.map(item => ({
              productId: item.product.id,
              productName: item.product.name,
              qty: item.qty,
              sellPrice: item.product.sellPrice,
              buyPriceSnap: item.buyPriceSnap,
              subtotal: item.subtotal,
              profit: item.profit,
            })),
          },
        },
      });

      console.log(
        `[TRANSACTION OK] ${trx.id} | ${paymentType} | ` +
        `Total: ${totalAmount} | Profit: ${totalProfit} | ` +
        `Items: ${items.length} | ClientTxID: ${clientTransactionId || 'none'}`
      );

      // Return transaction dengan data tambahan
      return {
        ...trx,
        totalProfit,
        itemCount: items.length,
      } as TransactionResult;
    });

    // Type assertion yang aman karena kita tahu transactionResult adalah TransactionResult
    const result = transactionResult as TransactionResult;

    return NextResponse.json({
      success: true,
      transactionId: result.id,
      totalAmount: result.totalAmount,
      totalProfit: result.totalProfit,
      itemCount: result.itemCount,
      clientTransactionId: result.clientTransactionId,
    });
  } catch (error) {
    console.error("[TRANSACTION FAILED]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Transaksi gagal" },
      { status: 500 }
    );
  }
}