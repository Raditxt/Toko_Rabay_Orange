# Toko Rabay Orange System — MVP v1

Operational system for family/home store (MVP v1) with focus on:

* Product inventory
* Sales (cash / credit)
* Consignment
* Concise dashboard for critical stock, consignment balance, active credits
* Simple but scalable data structure & workflow

> Built with **Next.js 15 + TypeScript + Prisma + PostgreSQL**

---

## ⚡ MVP v1 Features

1. **Product Master**

   * Name, category, selling price, stock, ownership type

2. **Quick Sales**

   * Input qty → automatic stock update
   * Choose CASH / CREDIT

3. **Credit / Debt**

   * Automatically recorded from transactions

4. **Consignment**

   * Partner + separate balance

5. **Concise Dashboard**

   * Critical stock, today's sales, consignment balance, active credits

---

## 🛠️ Setup & Development

1. **Clone repository:**

```bash
git clone <repo-url>
cd toko-system
```

2. **Install dependencies:**

```bash
npm install
```

3. **Setup environment:**

   Create `.env` file:

   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/toko_db"
   ```

4. **Database migration:**

```bash
npx prisma migrate dev --name init
```

5. **Run development server:**

```bash
npm run dev
```

6. **Open** [http://localhost:3000](http://localhost:3000)

---

## 🗂️ Folder Structure

```text
app/
  ├─ page.tsx          // Dashboard
  ├─ products/         // Product Master CRUD
  ├─ sales/            // Transaction input
  └─ api/              // API endpoints
lib/
  └─ prisma.ts         // Prisma client
prisma/
  └─ schema.prisma     // Database schema
```

---

## 🔧 Tech Stack

* **Frontend / Fullstack**: Next.js 15 + TypeScript
* **Database**: PostgreSQL
* **ORM**: Prisma
* **Deployment**: Vercel / Supabase / Railway

---

## 🏁 Roadmap Next Steps

* [x] Implement Product Master CRUD API
* [x] Implement Sales + automatic stock update
* [x] Implement Credit / Consignment
* [x] Minimal UI for daily transactions
* [x] Concise dashboard
* [ ] **Phase 2**: analytical reports, expiration tracking, purchase price, notifications

---

## 📝 Changelog

* **January 8, 2026**: Implemented API endpoints for products, transactions, debts, and consignment partners. Added pages for products and sales management. Updated README to reflect completed MVP v1 features.
* **January 9, 2026**: Added mobile-first sales page UI and concise dashboard for critical stock, consignment balance, active credits.

---

## 📌 Notes

* **MVP Focus**: used daily, not complete features
* Data structure & flow already adjusted for safety & scalability
* **Do not modify transaction flow without DB migration**

---

## 🚀 Quick Start (For Daily Users)

### Opening the App

1. Open browser and go to: `http://localhost:3000`
2. You'll see the main dashboard

### Recording a Sale

1. Click **"New Sale"** or **"Sales"** menu
2. Select product from list
3. Enter quantity
4. Choose payment method:

   * **CASH** - customer pays immediately
   * **CREDIT** - customer pays later (recorded as debt)
5. Click **"Save"**
6. Stock will automatically decrease

### Checking Stock

1. Go to **"Products"** menu
2. Red/orange colored items = low stock
3. Add new products by clicking **"Add Product"**

### Checking Customer Credits

1. Go to **"Credits"** menu
2. You can see who owes money and how much
3. When customer pays, click **"Record Payment"**

### Consignment Products

1. Products owned by partners/suppliers
2. When sold, profit goes to consignment balance
3. Check balance in **"Consignment"** menu

---

**That's it! The system is designed to be simple for daily use. For technical questions, contact the developer.**
