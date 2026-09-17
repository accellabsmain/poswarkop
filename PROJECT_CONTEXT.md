# POS & Inventory Management — Project Context

## 1. Project Overview

Project ini adalah aplikasi web **POS (Point of Sale) dan Pengelolaan Stok** untuk membantu operasional 3 toko dalam satu sistem.

### Toko

1. **Toko Mas Budi** — Toko Sembako
2. **Warkop Ngombeku** — Warkop
3. **Warkop Kakak** — Warkop

Aplikasi harus sederhana, cepat digunakan, responsive, dan mudah dipahami oleh pengguna non-teknis.

Fokus utama MVP:

* Kasir / penjualan
* Pengelolaan produk
* Stok per toko
* Transfer barang antar toko
* Pembelian / barang masuk
* Pemasukan
* Pengeluaran
* Rekap penjualan
* Dashboard sederhana
* Peringatan stok menipis

---

# 2. Business Context

Toko Mas Budi merupakan toko sembako yang dalam banyak kasus menjadi sumber barang untuk kedua warkop.

Namun, Warkop Ngombeku dan Warkop Kakak juga dapat:

* Memiliki produk sendiri
* Membeli barang langsung dari supplier eksternal
* Menjual produk yang tidak berasal dari Toko Mas Budi

Oleh karena itu:

> Toko Mas Budi bukan warehouse pusat secara mutlak.

Setiap toko harus memiliki inventory sendiri.

---

# 3. Store Structure

Sistem memiliki 3 store:

```text
Toko Mas Budi
├── Inventory
├── Sales
├── Purchases
├── Income
└── Expenses

Warkop Ngombeku
├── Inventory
├── Sales
├── Purchases
├── Income
└── Expenses

Warkop Kakak
├── Inventory
├── Sales
├── Purchases
├── Income
└── Expenses
```

Owner/admin dapat melihat data semua toko.

User biasa hanya dapat mengakses toko yang diberikan kepadanya.

---

# 4. Core Business Rules

## 4.1 Inventory

Stok harus selalu terpisah berdasarkan toko.

Contoh:

```text
Aqua 600ml

Toko Mas Budi      100
Warkop Ngombeku     20
Warkop Kakak        15
```

Jangan membuat satu nilai stock global untuk seluruh bisnis.

---

## 4.2 Stock Movement

Perubahan stok harus dapat dilacak.

Setiap perubahan stok berasal dari salah satu aktivitas:

```text
PURCHASE
SALE
TRANSFER_IN
TRANSFER_OUT
ADJUSTMENT
```

Contoh:

```text
Purchase:
+100

Sale:
-5

Transfer Out:
-20

Transfer In:
+20

Adjustment:
-2
```

`stock_movements` menjadi histori perubahan stok.

Current stock dapat disimpan pada inventory balance untuk query cepat, tetapi setiap perubahan harus menghasilkan stock movement.

---

# 5. Sales / POS

POS digunakan oleh ketiga toko.

Flow:

```text
Select Product
      ↓
Add to Cart
      ↓
Checkout
      ↓
Payment
      ↓
Create Sale
      ↓
Reduce Stock
      ↓
Record Income
```

POS harus cepat dan mudah digunakan.

### Minimum POS Features

* Search product
* Pilih produk
* Tambahkan ke cart
* Ubah quantity
* Hapus item
* Total otomatis
* Metode pembayaran
* Checkout
* Riwayat transaksi
* Print receipt

### Payment Methods MVP

Gunakan pilihan sederhana:

```text
CASH
QRIS
TRANSFER
OTHER
```

Payment Gateway otomatis belum menjadi bagian MVP.

Tetapi struktur database harus memungkinkan payment gateway ditambahkan nanti.

---

# 6. Product

Product bersifat global, sedangkan inventory bersifat per-store.

Contoh:

```text
Product:
Aqua 600ml

Inventory:
Toko Mas Budi → 100
Warkop Ngombeku → 20
Warkop Kakak → 15
```

### Product Fields

Minimum:

```text
id
name
sku
barcode
category_id
unit
purchase_price
selling_price
minimum_stock
is_active
created_at
updated_at
```

Harga beli pada product hanya menjadi default/current reference.

Harga pembelian aktual harus disimpan pada purchase item atau stock-in transaction karena harga supplier dapat berubah.

---

# 7. Purchase / Stock In

Toko dapat membeli barang dari supplier eksternal.

Contoh:

```text
Warkop Ngombeku
Supplier: Supplier ABC

Aqua 600ml
30 × Rp3.000

Total:
Rp90.000
```

Setelah purchase disimpan:

```text
Purchase
   ↓
Stock Movement: PURCHASE
   ↓
Inventory bertambah
```

### Minimum Purchase Fields

```text
id
store_id
supplier_id
purchase_date
reference_number
total_amount
notes
created_at
```

Purchase items:

```text
purchase_id
product_id
quantity
unit_cost
subtotal
```

---

# 8. Internal Stock Transfer

Stock transfer digunakan ketika barang berpindah antar toko.

Contoh:

```text
Toko Mas Budi
       ↓
Warkop Ngombeku

Aqua 600ml
20 pcs
Harga Transfer: Rp3.200
```

Transfer harus mengurangi stok toko asal dan menambah stok toko tujuan.

```text
SOURCE STORE
Inventory -20
Stock Movement: TRANSFER_OUT

DESTINATION STORE
Inventory +20
Stock Movement: TRANSFER_IN
```

### Transfer Price

Transfer antar toko memiliki harga transfer.

Harga transfer digunakan untuk mengetahui nilai barang yang masuk ke toko tujuan.

MVP tidak perlu membuat sistem akuntansi antar cabang yang kompleks.

---

# 9. Income / Pemasukan

MVP hanya membutuhkan pencatatan pemasukan sederhana.

Contoh:

```text
Pemasukan

Toko: Warkop Ngombeku
Tanggal: 16 Sep 2026
Kategori: Penjualan
Nominal: Rp1.200.000
Keterangan: Penjualan harian
```

Penjualan dari POS dapat otomatis dianggap sebagai pemasukan.

Income manual tetap dapat dibuat jika dibutuhkan.

---

# 10. Expense / Pengeluaran

MVP membutuhkan pencatatan pengeluaran sederhana.

Contoh:

```text
Pengeluaran

Toko: Warkop Ngombeku
Kategori: Operasional
Nominal: Rp50.000
Keterangan: Beli gas
Tanggal: 16 Sep 2026
```

Kategori sederhana:

```text
BELANJA
OPERASIONAL
LISTRIK
AIR
GAS
TRANSPORT
SUPPLIES
LAINNYA
```

Tidak perlu membuat accounting double-entry pada MVP.

---

# 11. Cash Management

Cash management MVP harus sederhana.

Tujuan:

> Mengetahui uang masuk dan uang keluar setiap toko.

Minimum:

```text
Opening Cash
+
Income
-
Expense
=
Expected Balance
```

Jika diperlukan, sistem dapat memiliki cash session:

```text
OPEN
   ↓
TRANSACTIONS
   ↓
CLOSE
```

Tetapi jangan membuat sistem accounting kompleks.

---

# 12. Low Stock Alert

Setiap product dapat memiliki:

```text
minimum_stock
```

Contoh:

```text
Aqua

Current Stock: 8
Minimum Stock: 20

Status:
LOW STOCK
```

Jika:

```text
stock <= minimum_stock
```

tampilkan peringatan.

Jika:

```text
stock = 0
```

tampilkan:

```text
OUT OF STOCK
```

Pada POS, produk out-of-stock tidak boleh dijual.

MVP hanya memberikan alert.

Tidak perlu automatic purchase order.

---

# 13. Dashboard

Dashboard harus sederhana.

## Owner Dashboard

Tampilkan:

```text
Sales Today
Sales This Month
Total Transactions
Income
Expense
Low Stock Products
```

Per toko:

```text
Toko Mas Budi
Warkop Ngombeku
Warkop Kakak
```

Owner dapat melihat:

```text
All Stores
```

atau memilih toko tertentu.

---

# 14. Reports

MVP membutuhkan basic reports.

### Sales Report

Filter:

```text
Date
Store
Payment Method
```

Data:

```text
Transaction
Total
Payment Method
Cashier
Date
```

### Inventory Report

Tampilkan:

```text
Product
Store
Current Stock
Minimum Stock
Status
```

### Income / Expense Report

Tampilkan:

```text
Date
Store
Category
Amount
Description
```

Tidak perlu accounting report kompleks.

---

# 15. User Roles

Minimum role:

## Owner / Admin

Bisa:

* Melihat semua toko
* Mengelola produk
* Melihat inventory
* Melakukan transfer
* Melihat sales
* Melihat income
* Melihat expense
* Melihat report

## Cashier

Bisa:

* Menggunakan POS
* Membuat transaksi
* Melihat transaksi sesuai toko
* Print receipt

Tidak boleh mengubah data sensitif seperti harga modal atau konfigurasi sistem.

## Store Staff / Manager

Dapat:

* Melihat inventory toko
* Membuat purchase
* Membuat transfer
* Melakukan stock adjustment jika diberikan permission
* Melihat report toko

Role system harus dibuat sederhana tetapi extensible.

---

# 16. Access Control

Gunakan konsep:

```text
User
  ↓
Role
  ↓
Store Access
```

Contoh:

```text
User:
Budi

Role:
Cashier

Store:
Warkop Ngombeku
```

Budi hanya dapat mengakses Warkop Ngombeku.

Owner:

```text
Role:
Owner

Stores:
ALL
```

Authorization harus diterapkan di database menggunakan Supabase Row Level Security (RLS), bukan hanya melalui UI.

---

# 17. Audit Trail

MVP membutuhkan audit log sederhana untuk aktivitas penting.

Minimum:

```text
user_id
action
entity
entity_id
store_id
created_at
metadata
```

Aktivitas penting:

```text
CREATE SALE
CREATE PURCHASE
TRANSFER STOCK
STOCK ADJUSTMENT
CREATE EXPENSE
CREATE INCOME
UPDATE PRODUCT
```

Tujuannya agar perubahan stok dan transaksi dapat ditelusuri.

---

# 18. Database Architecture

Gunakan PostgreSQL melalui Supabase.

Core tables:

```text
profiles
roles
stores
user_stores

categories
products
suppliers

inventory
stock_movements

sales
sale_items
payments

purchases
purchase_items

stock_transfers
stock_transfer_items

income
expenses

cash_sessions
cash_transactions

audit_logs
```

Jangan membuat database terlalu kompleks untuk MVP.

---

# 19. Recommended Data Relationships

```text
stores
  │
  ├── inventory
  ├── sales
  ├── purchases
  ├── transfers
  ├── income
  └── expenses


products
  │
  ├── inventory
  ├── sale_items
  ├── purchase_items
  ├── transfer_items
  └── stock_movements


sales
  │
  ├── sale_items
  └── payments


purchases
  │
  └── purchase_items


stock_transfers
  │
  └── stock_transfer_items
```

---

# 20. Important Inventory Principle

Jangan membuat sistem hanya seperti:

```text
UPDATE products
SET stock = stock - 1
```

Inventory harus mempunyai histori.

Gunakan transaction/database function atau server-side operation untuk memastikan:

```text
Sale
 ↓
Validate stock
 ↓
Create sale
 ↓
Create sale items
 ↓
Decrease inventory
 ↓
Create stock movement
```

Semua perubahan terkait satu transaksi harus konsisten.

Jika salah satu bagian gagal, keseluruhan transaksi harus rollback.

---

# 21. Technology Stack

## Frontend

```text
Next.js
TypeScript
Tailwind CSS
shadcn/ui
```

Gunakan App Router.

## Backend

Gunakan Next.js server-side functionality:

```text
Server Actions
Route Handlers
Server Components
```

Tidak perlu membuat backend terpisah untuk MVP.

## Database

```text
Supabase PostgreSQL
```

## Authentication

```text
Supabase Auth
```

## Authorization

```text
Supabase RLS
```

## Deployment

```text
Vercel
```

---

# 22. Project Architecture

Recommended:

```text
src/
├── app/
│   ├── login/
│   ├── dashboard/
│   ├── pos/
│   ├── products/
│   ├── inventory/
│   ├── transfers/
│   ├── purchases/
│   ├── income/
│   ├── expenses/
│   ├── reports/
│   └── settings/
│
├── components/
│   ├── ui/
│   ├── pos/
│   ├── inventory/
│   ├── products/
│   └── shared/
│
├── lib/
│   ├── supabase/
│   ├── validations/
│   ├── permissions/
│   └── utils/
│
├── actions/
│   ├── sales/
│   ├── inventory/
│   ├── purchases/
│   ├── transfers/
│   ├── income/
│   └── expenses/
│
└── types/
```

Agent boleh menyesuaikan struktur jika ada alasan teknis yang jelas, tetapi jangan membuat architecture yang jauh lebih kompleks dari kebutuhan MVP.

---

# 23. UX Principles

Aplikasi ditujukan untuk pengguna toko, bukan developer.

Prioritas:

```text
Simple
Fast
Clear
Responsive
```

## POS

POS harus menjadi halaman paling cepat digunakan.

Target:

```text
Search
→ Add
→ Checkout
```

Sesedikit mungkin klik.

## Mobile

Semua halaman utama harus usable di mobile.

## Desktop

Dashboard dan inventory harus nyaman digunakan di desktop/tablet.

## Language

Gunakan bahasa Indonesia.

Contoh:

```text
Tambah Produk
Barang Masuk
Transfer Barang
Stok Menipis
Penjualan Hari Ini
Pemasukan
Pengeluaran
Simpan Transaksi
```

Hindari istilah teknis seperti:

```text
Inventory Ledger
COGS
Journal Entry
Accounts Receivable
```

kecuali memang diperlukan secara internal.

---

# 24. Responsive Design

Breakpoints minimal:

```text
Mobile
Tablet
Desktop
```

POS harus tetap usable pada layar kecil.

Table pada mobile dapat berubah menjadi card/list jika diperlukan.

Jangan membuat tabel desktop yang hanya bisa di-scroll horizontal pada mobile jika informasi dapat ditampilkan dengan layout yang lebih baik.

---

# 25. UI Style

Gunakan desain yang:

* Bersih
* Modern
* Tidak terlalu ramai
* Mudah dibaca
* Button jelas
* Form sederhana
* Feedback transaksi jelas

Gunakan komponen UI yang konsisten.

Status harus menggunakan visual yang mudah dipahami:

```text
NORMAL
LOW STOCK
OUT OF STOCK
PENDING
COMPLETED
CANCELLED
```

---

# 26. MVP Scope

## INCLUDED

```text
✓ 3 Stores
✓ Authentication
✓ Basic Roles
✓ Product Management
✓ Category
✓ Inventory per Store
✓ Stock Movement
✓ POS
✓ Sales
✓ Payment Method
✓ Purchase / Stock In
✓ Internal Stock Transfer
✓ Transfer Price
✓ Income
✓ Expense
✓ Basic Cash Management
✓ Low Stock Alert
✓ Dashboard
✓ Basic Reports
✓ Print Receipt
✓ Responsive UI
✓ Supabase
✓ Vercel Deployment
```

---

# 27. OUT OF SCOPE — MVP

Jangan implementasikan fitur berikut kecuali diminta secara eksplisit:

```text
✗ Payment Gateway Integration
✗ Automatic QRIS
✗ Offline POS
✗ Recipe / BOM
✗ Ingredient Management
✗ Advanced WMS
✗ Warehouse Location
✗ Batch Tracking
✗ Expiry Tracking
✗ Purchase Order
✗ Complex Approval Workflow
✗ Accounting Double Entry
✗ Payroll
✗ CRM
✗ Loyalty
✗ WhatsApp Automation
✗ Marketplace Integration
✗ Advanced Analytics
```

Jika user/client meminta fitur di luar scope, treat it as **future development / add-on**.

---

# 28. Future Development

Architecture harus memungkinkan penambahan:

### Payment Gateway

Range:
**Rp750.000 – Rp1.500.000**

### Warkop Recipe / Ingredient

Range:
**Rp1.000.000 – Rp2.000.000**

### Advanced Inventory / WMS

Range:
**Rp1.500.000 – Rp3.000.000**

### Advanced Finance

Range:
**Rp1.500.000 – Rp3.000.000**

### Offline POS

Range:
**Rp2.000.000 – Rp4.000.000**

### Integration & Automation

Mulai sekitar:
**Rp750.000**

Harga final fitur tambahan ditentukan berdasarkan detail kebutuhan.

---

# 29. Important Rule for AI Agent

AI Agent harus:

1. Mengutamakan MVP.
2. Jangan menambahkan fitur yang tidak diminta.
3. Jangan over-engineer.
4. Jangan membuat microservices.
5. Jangan membuat backend terpisah.
6. Gunakan Supabase secara langsung.
7. Gunakan RLS untuk keamanan data.
8. Jangan expose Supabase service role key ke client.
9. Gunakan server-side operation untuk transaksi penting.
10. Pastikan perubahan stok atomic.
11. Jangan mengubah struktur database tanpa alasan yang jelas.
12. Jangan menghapus data transaksi secara permanen.
13. Gunakan status seperti `cancelled`/`void` jika transaksi perlu dibatalkan.
14. Semua transaksi penting harus dapat ditelusuri.
15. Prioritaskan UX daripada kompleksitas teknis.

---

# 30. Data Integrity Rules

### Sales

Saat sale dibuat:

```text
Check stock
→ Create sale
→ Create sale items
→ Reduce inventory
→ Create stock movement
→ Record payment
```

### Purchase

```text
Create purchase
→ Create purchase items
→ Increase inventory
→ Create stock movement
```

### Transfer

```text
Validate source stock
→ Create transfer
→ Decrease source inventory
→ Increase destination inventory
→ Create TRANSFER_OUT
→ Create TRANSFER_IN
```

### Expense

```text
Create expense
→ Record cash transaction
```

Semua operasi yang mempengaruhi stock atau cash harus dijalankan secara aman dan konsisten.

---

# 31. Development Priority

Implementasi harus dilakukan berdasarkan urutan:

## Phase 1

```text
Project Setup
Authentication
Database
Stores
Users
Roles
RLS
```

## Phase 2

```text
Products
Categories
Inventory
Stock Movement
```

## Phase 3

```text
POS
Sales
Payments
Receipt
```

## Phase 4

```text
Purchase
Stock In
Stock Transfer
```

## Phase 5

```text
Income
Expense
Cash Management
```

## Phase 6

```text
Dashboard
Reports
Low Stock
```

## Phase 7

```text
Responsive Polish
Validation
Error Handling
Testing
Deployment
```

---

# 32. Definition of Done

MVP dianggap selesai jika:

* User dapat login.
* Owner dapat melihat 3 toko.
* Setiap toko memiliki inventory sendiri.
* Produk dapat dibuat.
* Barang dapat masuk melalui purchase.
* Barang dapat ditransfer antar toko.
* Kasir dapat membuat transaksi.
* Transaksi mengurangi stok.
* Stok tidak boleh menjadi negatif.
* Pemasukan tercatat.
* Pengeluaran dapat dicatat.
* Low stock dapat terlihat.
* Owner dapat melihat rekap penjualan.
* User tidak dapat mengakses toko yang tidak diizinkan.
* Data penting dilindungi oleh RLS.
* Aplikasi responsive.
* Aplikasi dapat di-deploy ke Vercel.
* Database menggunakan Supabase.

---

# 33. Guiding Principle

> **Buat sesederhana mungkin, tetapi jangan sampai fondasinya salah.**

Project ini bukan ditujukan untuk menjadi ERP atau WMS besar.

Tujuan MVP adalah:

```text
JUALAN TERCATAT
       +
STOK TERKONTROL
       +
UANG MASUK & KELUAR TERCATAT
       =
OPERASIONAL 3 TOKO LEBIH RAPI
```

Fitur yang belum dibutuhkan jangan dibuat hanya karena secara teknis memungkinkan.

Jika ada kebutuhan baru, tambahkan sebagai module/phase berikutnya.
