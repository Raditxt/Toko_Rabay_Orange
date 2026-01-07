export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  PaymentType,
  OwnershipType,
  DebtStatus,
} from "@/app/generated/prisma/client";

// Define interfaces for request body
interface TransactionItemRequest {
  productId: string;
  qty: number;
}

interface TransactionRequestBody {
  paymentType: PaymentType;
  customerName?: string;
  items: TransactionItemRequest[];
}

// Define interfaces for product data
interface ComputedTransactionItem {
  product: {
    id: string;
    name: string;
    sellPrice: number;
    stock: number;
    ownershipType: OwnershipType;
    partnerId: string | null;
  };
  qty: number;
  subtotal: number;
}

export async function POST(req: Request) {
  try {
    const body: TransactionRequestBody = await req.json();
    const { paymentType, customerName, items } = body;

    // ===== VALIDASI DASAR =====
    if (!paymentType || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Data transaksi tidak lengkap" },
        { status: 400 }
      );
    }

    if (paymentType === "DEBT" && !customerName) {
      return NextResponse.json(
        { error: "Nama pelanggan wajib untuk bon" },
        { status: 400 }
      );
    }

    // ===== ATOMIC TRANSACTION =====
    const transaction = await prisma.$transaction(async (tx) => {
      const productIds = items.map((i) => i.productId);

      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
      });

      if (products.length !== productIds.length) {
        throw new Error("Ada produk yang tidak ditemukan");
      }

      let totalAmount = 0;

      // simpan data sementara
      const computedItems: ComputedTransactionItem[] = items.map((item) => {
        const product = products.find((p) => p.id === item.productId);
        
        // Type-safe assertion since we already validated all products exist
        if (!product) {
          throw new Error(`Produk dengan ID ${item.productId} tidak ditemukan`);
        }

        if (product.stock < item.qty) {
          throw new Error(`Stok tidak cukup: ${product.name}`);
        }

        const subtotal = product.sellPrice * item.qty;
        totalAmount += subtotal;

        return {
          product: {
            id: product.id,
            name: product.name,
            sellPrice: product.sellPrice,
            stock: product.stock,
            ownershipType: product.ownershipType,
            partnerId: product.partnerId,
          },
          qty: item.qty,
          subtotal,
        };
      });

      // ===== CREATE TRANSACTION =====
      const trx = await tx.transaction.create({
        data: {
          paymentType,
          totalAmount,
        },
      });

      // ===== ITEM + STOK + TITIPAN =====
      for (const item of computedItems) {
        await tx.transactionItem.create({
          data: {
            transactionId: trx.id,
            productId: item.product.id,
            qty: item.qty,
            sellPriceSnap: item.product.sellPrice,
            subtotal: item.subtotal,
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

      // ===== DEBT =====
      if (paymentType === PaymentType.DEBT) {
        await tx.debt.create({
          data: {
            customerName: customerName!, // Non-null assertion since we validated above
            transactionId: trx.id,
            amount: totalAmount,
            status: DebtStatus.UNPAID,
          },
        });
      }

      return trx;
    });

    return NextResponse.json({
      success: true,
      transactionId: transaction.id,
    });
  } catch (error: unknown) {
    console.error("Transaction error:", error);
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : "Transaksi gagal";
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}