export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PaymentType } from "@/app/generated/prisma/client";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date");

    const date = dateParam ? new Date(dateParam) : new Date();

    const start = new Date(date);
    start.setHours(0, 0, 0, 0);

    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const transactions = await prisma.transaction.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      include: {
        items: true,
      },
    });

    let revenue = 0;
    let profit = 0;
    let cash = 0;
    let debt = 0;

    for (const trx of transactions) {
      revenue += trx.totalAmount;

      if (trx.paymentType === PaymentType.CASH) cash += trx.totalAmount;
      if (trx.paymentType === PaymentType.DEBT) debt += trx.totalAmount;

      for (const item of trx.items) {
        profit += item.profit ?? 0;
      }
    }

    return NextResponse.json({
      date: start.toISOString().slice(0, 10),
      totalTransactions: transactions.length,
      revenue,
      profit,
      cash,
      debt,
    });
  } catch (error) {
    console.error("[DAILY REPORT ERROR]", error);
    return NextResponse.json(
      { error: "Gagal mengambil laporan harian" },
      { status: 500 }
    );
  }
}
