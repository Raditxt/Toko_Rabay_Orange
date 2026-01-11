export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { OwnershipType } from "@/app/generated/prisma/client";

export async function GET() {
  try {
    const partners = await prisma.consignmentPartner.findMany({
      include: {
        products: {
          where: {
            ownershipType: OwnershipType.CONSIGNMENT,
          },
          include: {
            items: true,
          },
        },
      },
    });

    const report = partners.map((partner) => {
      let totalQty = 0;
      let totalSales = 0;

      for (const product of partner.products) {
        for (const item of product.items) {
          totalQty += item.qty;
          totalSales += item.subtotal;
        }
      }

      return {
        partnerId: partner.id,
        partnerName: partner.name,
        totalQtySold: totalQty,
        totalSales,
        currentBalance: partner.balance,
      };
    });

    return NextResponse.json(report);
  } catch (error) {
    console.error("[CONSIGNMENT REPORT ERROR]", error);
    return NextResponse.json(
      { error: "Gagal mengambil laporan konsinyasi" },
      { status: 500 }
    );
  }
}
