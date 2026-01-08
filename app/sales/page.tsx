"use client";

import { useEffect, useMemo, useState } from "react";

type Product = {
  id: string;
  name: string;
  sellPrice: number;
  stock: number;
};

type CartItem = {
  product: Product;
  qty: number;
};

type PaymentType = "CASH" | "DEBT";

type TransactionPayload = {
  paymentType: PaymentType;
  customerName?: string;
  items: Array<{
    productId: string;
    qty: number;
  }>;
};

export default function SalesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentType, setPaymentType] = useState<PaymentType>("CASH");
  const [customerName, setCustomerName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // ===== FETCH PRODUCTS =====
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch("/api/products");
        
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const data = await res.json();
        
        // Ensure data is an array
        if (Array.isArray(data)) {
          setProducts(data);
        } else {
          console.error("Expected array but got:", data);
          setMessage("Format data produk tidak valid");
          setProducts([]); // Set to empty array to prevent filter error
        }
      } catch (error) {
        console.error("Error fetching products:", error);
        setMessage("Gagal mengambil data barang");
        setProducts([]); // Set to empty array to prevent filter error
      }
    };

    fetchProducts();
  }, []);

  // ===== FILTER =====
  const filteredProducts = useMemo(() => {
    // Ensure products is always an array
    if (!Array.isArray(products)) {
      return [];
    }
    
    return products.filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [products, search]);

  // ===== CART LOGIC =====
  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        if (existing.qty + 1 > product.stock) return prev;
        return prev.map((i) =>
          i.product.id === product.id
            ? { ...i, qty: i.qty + 1 }
            : i
        );
      }
      return [...prev, { product, qty: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) =>
      prev
        .map((i) =>
          i.product.id === productId
            ? { ...i, qty: i.qty - 1 }
            : i
        )
        .filter((i) => i.qty > 0)
    );
  };

  const total = cart.reduce(
    (sum, i) => sum + i.product.sellPrice * i.qty,
    0
  );

  // ===== SUBMIT =====
  const submitTransaction = async () => {
    if (cart.length === 0) {
      setMessage("Keranjang kosong");
      return;
    }

    if (paymentType === "DEBT" && !customerName) {
      setMessage("Nama pelanggan wajib untuk bon");
      return;
    }

    setLoading(true);
    setMessage(null);

    const payload: TransactionPayload = {
      paymentType,
      items: cart.map((i) => ({
        productId: i.product.id,
        qty: i.qty,
      })),
    };

    // Only add customerName if it's a DEBT transaction
    if (paymentType === "DEBT" && customerName) {
      payload.customerName = customerName;
    }

    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Transaksi gagal");
      }

      // reset
      setCart([]);
      setCustomerName("");
      setPaymentType("CASH");
      setMessage("✅ Transaksi berhasil");

      // refresh stock
      try {
        const refreshRes = await fetch("/api/products");
        if (refreshRes.ok) {
          const refreshed = await refreshRes.json();
          if (Array.isArray(refreshed)) {
            setProducts(refreshed);
          }
        }
      } catch (refreshError) {
        console.error("Error refreshing products:", refreshError);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : "Terjadi kesalahan yang tidak diketahui";
      setMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // ===== UI =====
  return (
    <div style={{ padding: 16, maxWidth: 480, margin: "0 auto" }}>
      <h2>🛒 Jual Barang</h2>

      {message && (
        <div style={{ 
          marginBottom: 8, 
          color: message.includes("✅") || message.includes("berhasil") ? "green" : "red" 
        }}>
          {message}
        </div>
      )}

      {/* SEARCH */}
      <input
        placeholder="Cari barang..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ width: "100%", padding: 8, marginBottom: 12 }}
      />

      {/* PRODUCT LIST */}
      <div style={{ maxHeight: 240, overflowY: "auto", marginBottom: 12 }}>
        {filteredProducts.length === 0 ? (
          <div style={{ textAlign: "center", padding: 12, color: "#666" }}>
            {products.length === 0 ? "Tidak ada produk" : "Tidak ditemukan"}
          </div>
        ) : (
          filteredProducts.map((p) => (
            <div
              key={p.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 6,
              }}
            >
              <div>
                <strong>{p.name}</strong>
                <div style={{ fontSize: 12 }}>
                  Rp {p.sellPrice.toLocaleString()} | stok {p.stock}
                </div>
              </div>
              <button onClick={() => addToCart(p)}>+</button>
            </div>
          ))
        )}
      </div>

      {/* CART */}
      <div style={{ borderTop: "1px solid #ccc", paddingTop: 8 }}>
        <h4>Keranjang</h4>
        {cart.length === 0 ? (
          <div style={{ textAlign: "center", padding: 8, color: "#666" }}>
            Keranjang kosong
          </div>
        ) : (
          <>
            {cart.map((i) => (
              <div
                key={i.product.id}
                style={{ display: "flex", justifyContent: "space-between" }}
              >
                <span>
                  {i.product.name} x{i.qty}
                </span>
                <button onClick={() => removeFromCart(i.product.id)}>-</button>
              </div>
            ))}
            <div style={{ marginTop: 8 }}>
              <strong>Total: Rp {total.toLocaleString()}</strong>
            </div>
          </>
        )}
      </div>

      {/* PAYMENT */}
      <div style={{ marginTop: 12 }}>
        <select
          value={paymentType}
          onChange={(e) => setPaymentType(e.target.value as PaymentType)}
        >
          <option value="CASH">Cash</option>
          <option value="DEBT">Bon</option>
        </select>

        {paymentType === "DEBT" && (
          <input
            placeholder="Nama pelanggan"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            style={{ width: "100%", marginTop: 6, padding: 8 }}
          />
        )}
      </div>

      {/* SUBMIT */}
      <button
        onClick={submitTransaction}
        disabled={loading || cart.length === 0}
        style={{
          width: "100%",
          marginTop: 16,
          padding: 12,
          fontSize: 16,
          backgroundColor: cart.length === 0 ? "#ccc" : undefined,
        }}
      >
        {loading ? "Memproses..." : "SELESAI"}
      </button>
    </div>
  );
}