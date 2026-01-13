export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Ambil semua produk yang aktif
    const products = await prisma.product.findMany({
      where: {
        stock: {
          gt: 0, // Hanya produk yang masih ada stoknya
        },
      },
      orderBy: { stock: "asc" },
    });

    // Kategorikan berdasarkan level stok
    const lowStockThreshold = 10; // Batas stok rendah
    const criticalStockThreshold = 5; // Batas stok kritis

    const categorizedProducts = products.map(product => {
      let status: 'NORMAL' | 'LOW' | 'CRITICAL' = 'NORMAL';
      let message = '';
      
      if (product.stock <= criticalStockThreshold) {
        status = 'CRITICAL';
        message = `Stok kritis! Hanya tersisa ${product.stock} unit`;
      } else if (product.stock <= lowStockThreshold) {
        status = 'LOW';
        message = `Stok rendah! Hanya tersisa ${product.stock} unit`;
      } else {
        message = `Stok aman: ${product.stock} unit`;
      }

      return {
        ...product,
        status,
        message,
      };
    });

    // Filter hanya yang low atau critical
    const alertProducts = categorizedProducts.filter(
      p => p.status === 'LOW' || p.status === 'CRITICAL'
    );

    // Hitung summary
    const summary = {
      totalProducts: products.length,
      lowStock: categorizedProducts.filter(p => p.status === 'LOW').length,
      criticalStock: categorizedProducts.filter(p => p.status === 'CRITICAL').length,
      normalStock: categorizedProducts.filter(p => p.status === 'NORMAL').length,
      thresholds: {
        low: lowStockThreshold,
        critical: criticalStockThreshold,
      }
    };

    return NextResponse.json({
      success: true,
      summary,
      alerts: alertProducts,
      // Opsional: semua produk dengan status
      allProducts: categorizedProducts,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    // Perbaikan: error sekarang digunakan
    console.error("[STOCK ALERT ERROR]", error);
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : "Gagal mengambil alert stok";
    
    return NextResponse.json(
      { 
        success: false,
        error: errorMessage,
        summary: {
          totalProducts: 0,
          lowStock: 0,
          criticalStock: 0,
          normalStock: 0,
        },
        alerts: [],
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}