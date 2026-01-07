export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Nama partner wajib diisi" },
        { status: 400 }
      );
    }

    const partner = await prisma.consignmentPartner.create({
      data: {
        name,
      },
    });

    return NextResponse.json(partner);
  } catch (error: unknown) {
    console.error("Error creating consignment partner:", error);
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : "Gagal membuat partner titipan";
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const partners = await prisma.consignmentPartner.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(partners);
  } catch (error: unknown) {
    console.error("Error fetching consignment partners:", error);
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : "Gagal mengambil partner titipan";
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}