export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DebtStatus } from "@/app/generated/prisma/client";

export async function GET() {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      salesToday,
      activeDebts,
      consignmentBalance,
    ] = await Promise.all([
      prisma.transaction.aggregate({
        _sum: { totalAmount: true },
        where: {
          createdAt: { gte: todayStart },
        },
      }),
      prisma.debt.aggregate({
        _sum: { amount: true },
        where: { status: DebtStatus.UNPAID },
      }),
      prisma.consignmentPartner.aggregate({
        _sum: { balance: true },
      }),
    ]);

    return NextResponse.json({
      salesToday: salesToday._sum.totalAmount || 0,
      activeDebts: activeDebts._sum.amount || 0,
      consignmentBalance: consignmentBalance._sum.balance || 0,
    });
  } catch (error: unknown) {
    console.error("Error fetching dashboard summary:", error);
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : "Gagal mengambil ringkasan dashboard";
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}