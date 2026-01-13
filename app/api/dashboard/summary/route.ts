export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DebtStatus, PaymentType } from "@/app/generated/prisma/client";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");

    const target = date ? new Date(date) : new Date();
    
    // Buat copy dari target untuk start dan end
    const start = new Date(target);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(target);
    end.setHours(23, 59, 59, 999);

    // Parallel queries untuk performa lebih baik
    const [
      salesToday,
      activeDebts,
      consignmentBalance,
      transactions,
      topProducts
    ] = await Promise.all([
      // Total penjualan hari ini
      prisma.transaction.aggregate({
        _sum: { totalAmount: true },
        where: {
          createdAt: { gte: start, lte: end },
        },
      }),
      
      // Total hutang aktif
      prisma.debt.aggregate({
        _sum: { amount: true },
        where: { status: DebtStatus.UNPAID },
      }),
      
      // Total saldo konsinyasi
      prisma.consignmentPartner.aggregate({
        _sum: { balance: true },
      }),
      
      // Transaksi hari ini untuk hitung profit
      prisma.transaction.findMany({
        where: {
          createdAt: { gte: start, lte: end },
        },
        include: {
          items: true,
        },
      }),
      
      // Produk terlaris hari ini
      prisma.transactionItem.groupBy({
        by: ["productId"],
        where: {
          transaction: { createdAt: { gte: start, lte: end } },
        },
        _sum: {
          qty: true,
          subtotal: true,
        },
        orderBy: {
          _sum: { qty: "desc" },
        },
        take: 5,
      }),
    ]);

    // Hitung revenue, profit, cash, debt dari transaksi hari ini
    let revenue = 0;
    let profit = 0;
    let cash = 0;
    let debt = 0;

    for (const trx of transactions) {
      revenue += trx.totalAmount;
      
      if (trx.paymentType === PaymentType.CASH) cash += trx.totalAmount;
      if (trx.paymentType === PaymentType.DEBT) debt += trx.totalAmount;

      for (const item of trx.items) {
        profit += item.profit ?? 0; // Handle nullable profit
      }
    }

    // Ambil detail produk untuk topProducts
    const topProductsWithDetails = await Promise.all(
      topProducts.map(async (product) => {
        const productDetails = await prisma.product.findUnique({
          where: { id: product.productId },
          select: { name: true, category: true }
        });

        return {
          productId: product.productId,
          productName: productDetails?.name || "Unknown",
          category: productDetails?.category || "Unknown",
          totalQty: product._sum.qty || 0,
          totalRevenue: product._sum.subtotal || 0,
        };
      })
    );

    return NextResponse.json({
      // Summary dari API lama
      salesToday: salesToday._sum.totalAmount || 0,
      activeDebts: activeDebts._sum.amount || 0,
      consignmentBalance: consignmentBalance._sum.balance || 0,
      
      // Detail dari API baru
      revenue,
      profit,
      cash,
      debt,
      totalTransactions: transactions.length,
      topProducts: topProductsWithDetails,
      
      // Metadata
      date: start.toISOString().split('T')[0], // Format YYYY-MM-DD
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    });
  } catch (error: unknown) {
    console.error("[DASHBOARD ERROR]", error);
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : "Gagal mengambil data dashboard";
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}