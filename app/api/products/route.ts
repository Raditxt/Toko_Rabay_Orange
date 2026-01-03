import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      name,
      category,
      sellPrice,
      stock,
      ownershipType,
      partnerId,
    } = body;

    if (!name || !sellPrice || stock === undefined || !ownershipType) {
      return NextResponse.json(
        { error: "Field wajib belum lengkap" },
        { status: 400 }
      );
    }

    const product = await prisma.product.create({
      data: {
        name,
        category: category || "Umum",
        sellPrice,
        stock,
        ownershipType,
        partnerId: ownershipType === "CONSIGNMENT" ? partnerId : null,
      },
    });

    return NextResponse.json(product);
  } catch (error) {
    return NextResponse.json(
      { error: "Gagal menambah barang" },
      { status: 500 }
    );
  }
}
export async function GET() {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(products);
  } catch (error) {
    return NextResponse.json(
      { error: "Gagal mengambil data barang" },
      { status: 500 }
    );
  }
}
