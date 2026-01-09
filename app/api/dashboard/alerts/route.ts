export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const MIN_STOCK = 5;

export async function GET() {
  try {
    const lowStock = await prisma.product.findMany({
      where: {
        stock: { lte: MIN_STOCK },
      },
      orderBy: { stock: "asc" },
    });

    return NextResponse.json({
      lowStock,
    });
  } catch (error: unknown) {
    console.error("Error fetching low stock alerts:", error);
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : "Gagal mengambil alert stok";
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}