"use client";

import { useEffect, useState } from "react";

type Summary = {
  salesToday: number;
  activeDebts: number;
  consignmentBalance: number;
};

type Product = {
  id: string;
  name: string;
  stock: number;
};

export default function DashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [lowStock, setLowStock] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/dashboard/summary").then((r) => r.json()),
      fetch("/api/dashboard/alerts").then((r) => r.json()),
    ]).then(([summaryData, alertData]) => {
      setSummary(summaryData);
      setLowStock(alertData.lowStock || []);
      setLoading(false);
    });
  }, []);

  if (loading) return <div style={{ padding: 16 }}>Loading...</div>;

  return (
    <div
      style={{
        padding: 16,
        maxWidth: 480,
        margin: "0 auto",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h2 style={{ marginBottom: 12 }}>📊 Dashboard Toko</h2>

      <div
        style={{
          background: "#111",
          color: "#fff",
          padding: 12,
          borderRadius: 8,
          marginBottom: 16,
        }}
      >
        <div>💰 Penjualan Hari Ini</div>
        <strong>Rp {summary?.salesToday.toLocaleString()}</strong>
      </div>

      <div style={{ marginBottom: 8 }}>
        🧾 Bon Aktif:{" "}
        <strong>Rp {summary?.activeDebts.toLocaleString()}</strong>
      </div>

      <div style={{ marginBottom: 16 }}>
        🤝 Saldo Titipan:{" "}
        <strong>Rp {summary?.consignmentBalance.toLocaleString()}</strong>
      </div>

      <h4>🔴 Stok Kritis</h4>

      {lowStock.length === 0 && <div>Aman 👍</div>}

      {lowStock.map((p) => (
        <div key={p.id}>
          {p.name} — sisa {p.stock}
        </div>
      ))}
    </div>
  );
}
