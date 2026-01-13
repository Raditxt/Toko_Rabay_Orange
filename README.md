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

   * Name, category, selling price, stock, ownership type, product batches

2. **Quick Sales**

   * Input qty → automatic stock update
   * Choose CASH / CREDIT
   * Profit calculation per transaction

3. **Credit / Debt**

   * Automatically recorded from transactions
   * Debt management API

4. **Consignment**

   * Partner management + separate balance
   * Consignment reports

5. **Concise Dashboard**

   * Critical stock alerts, today's sales, consignment balance, active credits
   * Dashboard summary and alerts API

6. **Reports**

   * Daily sales reports
   * Consignment partner reports

7. **Alerts**

   * Stock alerts (low/critical stock levels)
   * Expired product alerts (products expiring soon)

8. **Export**

   * Daily sales report export in CSV format

9. **Audit Logging**

   * Automatic logging of key actions (transactions, product updates, etc.)

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
  ├─ page.tsx              // Main Dashboard
  ├─ products/             // Product Master CRUD Page
  ├─ sales/                // Transaction Input Page
  └─ api/                  // API Endpoints
      ├─ alerts/
      │   ├─ expired/
      │   └─ stock/
      ├─ consignment-partners/
      ├─ dashboard/
      │   ├─ alerts/
      │   └─ summary/
      ├─ debts/
      ├─ export/
      │   └─ daily/
      ├─ products/
      ├─ reports/
      │   ├─ consignment/
      │   └─ daily/
      └─ transactions/
lib/
  ├─ constants.ts          // App constants
  └─ prisma.ts             // Prisma client
prisma/
  ├─ schema.prisma         // Database schema
  └─ migrations/           // Database migrations
public/                    // Static assets
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
* [x] Basic reports (daily sales, consignment)
* [x] Product batch tracking
* [x] Profit calculation
* [ ] **Phase 2**: Advanced analytical reports, expiration tracking, purchase price, notifications

---

## 📝 Changelog

* **January 13, 2026**: Added Alerts API for stock (low/critical) and expired products. Implemented Export API for daily sales reports in CSV format. Added Audit Logging for key actions and updated the database schema with the AuditLog table.
* **January 12, 2026**: Added product batch tracking for better inventory management. Implemented profit calculation for transaction items. Enhanced API endpoints for reports (daily and consignment).
* **January 9, 2026**: Added mobile-first sales page UI and concise dashboard for critical stock, consignment balance, active credits.
* **January 8, 2026**: Implemented API endpoints for products, transactions, debts, and consignment partners. Added pages for products and sales management. Updated README to reflect completed MVP v1 features.


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

### Checking Reports

1. Go to **"Reports"** menu
2. View **Daily Sales** report for today's transactions
3. View **Consignment** report for partner balances and profits

---

**That's it! The system is designed to be simple for daily use. For technical questions, contact the developer.**
