export const runtime = "nodejs";

import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");

  const target = date ? new Date(date) : new Date();
  const start = new Date(target.setHours(0, 0, 0, 0));
  const end = new Date(target.setHours(23, 59, 59, 999));

  const transactions = await prisma.transaction.findMany({
    where: {
      createdAt: { gte: start, lte: end },
    },
  });

  let csv = "Tanggal,Payment,Total\n";

  for (const t of transactions) {
    csv += `${t.createdAt.toISOString()},${t.paymentType},${t.totalAmount}\n`;
  }

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="laporan-${date ?? "today"}.csv"`,
    },
  });
}
