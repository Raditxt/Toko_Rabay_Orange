export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const days = Number(searchParams.get("days") ?? 7);

    const limitDate = new Date();
    limitDate.setDate(limitDate.getDate() + days);

    const batches = await prisma.productBatch.findMany({
      where: {
        expiredAt: {
          not: null, // ⬅️ Hanya batch yang punya tanggal expired
          lte: limitDate,
        },
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            category: true,
            stock: true,
          },
        },
      },
      orderBy: { expiredAt: "asc" },
    });

    // Hitung berapa hari lagi sampai expired
    const now = new Date();
    const batchesWithRemainingDays = batches.map(batch => {
      const expiredAt = batch.expiredAt!; // Sudah dipastikan tidak null dari where clause
      const remainingMs = expiredAt.getTime() - now.getTime();
      const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));
      
      return {
        ...batch,
        remainingDays,
        isExpired: remainingDays < 0,
        willExpireSoon: remainingDays >= 0 && remainingDays <= 3,
      };
    });

    // Group by status untuk kemudahan frontend
    const expiredBatches = batchesWithRemainingDays.filter(b => b.isExpired);
    const soonBatches = batchesWithRemainingDays.filter(b => b.willExpireSoon);
    const upcomingBatches = batchesWithRemainingDays.filter(b => 
      !b.isExpired && !b.willExpireSoon
    );

    return NextResponse.json({
      summary: {
        total: batches.length,
        expired: expiredBatches.length,
        expiringSoon: soonBatches.length,
        upcoming: upcomingBatches.length,
        daysThreshold: days,
      },
      batches: batchesWithRemainingDays,
      grouped: {
        expired: expiredBatches,
        soon: soonBatches,
        upcoming: upcomingBatches,
      },
    });
  } catch (error: unknown) {
    // Perbaikan: error sekarang digunakan
    console.error("[EXPIRY ALERT ERROR]", error);
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : "Gagal mengambil alert expired";
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}