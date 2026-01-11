export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  PaymentType,
  OwnershipType,
  DebtStatus,
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
    buyPrice: number | null; // ⬅️ Update: bisa null
    stock: number;
    ownershipType: OwnershipType;
    partnerId: string | null;
  };
  qty: number;
  subtotal: number;
  buyPriceSnap: number; // ⬅️ Untuk transaksi, harus ada nilai
  profit: number;
}

/* =====================
   HANDLER
===================== */

export async function POST(req: Request) {
  try {
    const body: TransactionRequestBody = await req.json();
    const { paymentType, customerName, items } = body;

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
    const transaction = await prisma.$transaction(async (tx) => {
      /* === ANTI DOUBLE SUBMIT === */
      if (body.clientTransactionId) {
        const exists = await tx.transaction.findFirst({
          where: { clientTransactionId: body.clientTransactionId },
        });

        if (exists) {
          throw new Error("Transaksi ini sudah diproses sebelumnya");
        }
      }

      const productIds = items.map((i) => i.productId);

      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
      });

      if (products.length !== productIds.length) {
        throw new Error("Ada produk yang tidak ditemukan");
      }

      let totalAmount = 0;

      /* === HITUNG SNAPSHOT ITEM === */
      const computedItems: ComputedTransactionItem[] = items.map((item) => {
        const product = products.find((p) => p.id === item.productId);
        if (!product) throw new Error("Produk tidak ditemukan");

        if (product.stock < item.qty) {
          throw new Error(`Stok tidak cukup: ${product.name}`);
        }

        const subtotal = product.sellPrice * item.qty;
        totalAmount += subtotal;

        // Tentukan harga beli berdasarkan ownership type
        let buyPrice = 0;
        
        if (product.ownershipType === OwnershipType.OWN) {
          // Untuk produk sendiri, ambil buyPrice dari produk
          // Jika buyPrice null, gunakan default (misal: 70% dari harga jual)
          buyPrice = product.buyPrice ?? Math.round(product.sellPrice * 0.7);
        } else {
          // Untuk produk konsinyasi, harga beli = 0 (karena bukan milik kita)
          buyPrice = 0;
        }

        const profit = (product.sellPrice - buyPrice) * item.qty;

        return {
          product: {
            id: product.id,
            name: product.name,
            sellPrice: product.sellPrice,
            buyPrice: product.buyPrice, // Bisa null
            stock: product.stock,
            ownershipType: product.ownershipType,
            partnerId: product.partnerId,
          },
          qty: item.qty,
          subtotal,
          buyPriceSnap: buyPrice, // Selalu ada nilai (tidak null)
          profit,
        };
      });

      /* === CREATE TRANSACTION === */
      const trx = await tx.transaction.create({
        data: {
          paymentType,
          totalAmount,
          clientTransactionId: body.clientTransactionId,
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

      console.log(
        `[TRANSACTION OK] ${trx.id} | ${paymentType} | Total: ${totalAmount}`
      );

      return trx;
    });

    return NextResponse.json({
      success: true,
      transactionId: transaction.id,
    });
  } catch (error) {
    console.error("[TRANSACTION FAILED]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Transaksi gagal" },
      { status: 500 }
    );
  }
}