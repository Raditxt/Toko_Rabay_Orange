export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { OwnershipType } from "@/app/generated/prisma/client";

interface ProductRequestBody {
  name: string;
  category?: string;
  buyPrice?: number;
  sellPrice: number;
  stock: number;
  ownershipType: OwnershipType;
  partnerId?: string;
}

export async function POST(req: Request) {
  try {
    const body: ProductRequestBody = await req.json();

    const {
      name,
      category,
      buyPrice,
      sellPrice,
      stock,
      ownershipType,
      partnerId,
    } = body;

    // Validasi field wajib
    if (!name || !sellPrice || stock === undefined || !ownershipType) {
      return NextResponse.json(
        { error: "Field wajib belum lengkap" },
        { status: 400 }
      );
    }

    // Validasi jika ownershipType CONSIGNMENT maka partnerId wajib
    if (ownershipType === OwnershipType.CONSIGNMENT && !partnerId) {
      return NextResponse.json(
        { error: "Partner wajib dipilih untuk produk konsinyasi" },
        { status: 400 }
      );
    }

    // Validasi jika buyPrice tidak diisi untuk produk OWN
    let finalBuyPrice = buyPrice;
    if (ownershipType === OwnershipType.OWN && buyPrice === undefined) {
      // Default buyPrice = 70% dari sellPrice jika tidak diisi
      finalBuyPrice = Math.round(sellPrice * 0.7);
    }

    // Validasi buyPrice harus lebih kecil dari sellPrice untuk produk OWN
    if (
      ownershipType === OwnershipType.OWN &&
      finalBuyPrice !== undefined &&
      finalBuyPrice >= sellPrice
    ) {
      return NextResponse.json(
        { error: "Harga beli harus lebih kecil dari harga jual" },
        { status: 400 }
      );
    }

    const product = await prisma.product.create({
      data: {
        name,
        category: category || "Umum",
        buyPrice: finalBuyPrice,
        sellPrice,
        stock,
        ownershipType,
        partnerId: ownershipType === OwnershipType.CONSIGNMENT ? partnerId : null,
      },
    });

    // Jika produk OWN dan ada buyPrice, buat ProductBatch
    if (
      ownershipType === OwnershipType.OWN && 
      finalBuyPrice !== undefined &&
      stock > 0
    ) {
      await prisma.productBatch.create({
        data: {
          productId: product.id,
          buyPrice: finalBuyPrice,
          stock: stock,
          expiredAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Default: 1 tahun dari sekarang
        },
      });
    }

    return NextResponse.json(product);
  } catch (error: unknown) {
    console.error("Error creating product:", error);
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : "Gagal menambah barang";
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      include: {
        partner: {
          select: {
            id: true,
            name: true,
          }
        },
        batches: {
          take: 1,
          orderBy: {
            createdAt: 'desc'
          }
        }
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(products);
  } catch (error: unknown) {
    console.error("Error fetching products:", error);
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : "Gagal mengambil data barang";
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}