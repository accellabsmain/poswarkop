# 🏪 POSWarkop - Multi-Store POS & Inventory System

![Next.js](https://img.shields.io/badge/Next.js-16.3.5-black?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React-19.2.8-blue?style=for-the-badge&logo=react)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?style=for-the-badge&logo=supabase)
![Bun](https://img.shields.io/badge/Bun-1.3.13-black?style=for-the-badge&logo=bun)

Aplikasi Kasir (Point of Sale) & Manajemen Stok Multi-Toko berbasis Web yang dirancang khusus untuk operasional bisnis terintegrasi antara toko sembako dan warkop:
- 🏪 **Toko Mas Budi** (Toko Sembako / Supplier Utama)
- ☕ **Warkop Ngombeku** (Warkop / Modern Coffee)
- ☕ **Warkop Kakak** (Warkop / Traditional & Snacks)

---

## ✨ Fitur Utama

- 🛒 **Point of Sale (Kasir Fast-Checkout)**:
  - Antarmuka transaksi cepat dan responsif.
  - Pencarian & filter produk berdasarkan kategori.
  - Manajemen keranjang belanja dengan kalkulasi otomatis.
  - Dukungan beragam metode pembayaran (Cash, QRIS, Transfer Bank, DLL).
  - Cetak & preview struk transaksi.

- 📦 **Manajemen Stok Multi-Toko (Multi-Store Inventory)**:
  - Isolasi stok mandiri untuk tiap cabang toko.
  - Indikator & peringatan stok menipis (*Low Stock Alert*).
  - Log pergerakan stok (*Stock Movements*: Purchase, Sale, Transfer In/Out, Adjustment).
  - Fitur transfer barang antar toko (misalnya dari Toko Mas Budi ke Warkop).

- 🏷️ **Manajemen Produk & Kategori**:
  - Pengelolaan katalog produk (SKU, Barcode, Kategori, Unit).
  - Pengaturan harga beli (*Purchase Price*) & harga jual (*Selling Price*).
  - Ambang batas minimum stok per produk.

- 📊 **Riwayat Penjualan & Laporan**:
  - Monitoring transaksi penjualan real-time.
  - Filter riwayat transaksi berdasarkan toko, tanggal, dan status.
  - Rincian detail item dan metode pembayaran per transaksi.

- 🔐 **Multi-User & Hak Akses (RBAC)**:
  - Role **Owner**: Akses penuh ke seluruh toko, laporan global, dan pengaturan sistem.
  - Role **Manager / Kasir**: Akses terbatas pada toko yang ditugaskan.

- 🔄 **Offline-First & Hybrid Storage**:
  - Mode default dengan Mock Storage (Local Storage) untuk kemudahan pengujian & demo tanpa setup database.
  - Integrasi native dengan **Supabase Database** untuk penyimpanan data cloud real-time.

---

## 🛠️ Tech Stack

| Kategori | Teknologi |
| :--- | :--- |
| **Framework** | [Next.js 16 (App Router)](https://nextjs.org/) |
| **UI Library** | [React 19](https://react.dev/) |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) |
| **Icons** | [Lucide React](https://lucide.dev/) |
| **Language** | [TypeScript 5](https://www.typescriptlang.org/) |
| **Database & Auth** | [Supabase](https://supabase.com/) (`@supabase/supabase-js`, `@supabase/ssr`) |
| **Validation** | [Zod](https://zod.dev/) |
| **Package Manager** | [Bun](https://bun.sh/) (dapat juga menggunakan `npm` / `pnpm` / `yarn`) |

---

## 📁 Struktur Direktori

```text
poswarkop/
├── public/                 # Asset statis
├── src/
│   ├── app/                # Next.js App Router Pages
│   │   ├── (dashboard)/    # Layout & halaman utama (POS, Inventory, Sales, Products)
│   │   ├── login/          # Halaman login autentikasi
│   │   ├── globals.css     # Styling global Tailwind CSS
│   │   └── layout.tsx      # Root Layout
│   ├── components/         # Komponen UI modular
│   │   ├── inventory/      # Komponen manajemen stok & transfer
│   │   ├── layout/         # Header, Sidebar, Store Switcher
│   │   ├── pos/            # Komponen transaksi kasir & Cart Drawer
│   │   ├── products/       # Komponen katalog & form produk
│   │   └── ui/             # Reusable UI primitives
│   ├── context/            # Context state global (StoreContext, CartContext)
│   ├── lib/                # Storage Service, Utility & Client Supabase
│   └── types/              # TypeScript Interfaces & Types
├── supabase/
│   └── schema.sql          # Schema SQL & Tabel Supabase Database
├── PROJECT_CONTEXT.md      # Dokumentasi aturan bisnis & arsitektur sistem
└── package.json
```

---

## 🚀 Cara Menjalankan Project

### 1. Prasyarat
Pastikan sistem Anda sudah terinstall:
- [Node.js](https://nodejs.org/) (v18+) atau [Bun](https://bun.sh/)

### 2. Kloning Repository & Install Dependensi

```bash
# Clone repository
git clone https://github.com/username/poswarkop.git
cd poswarkop

# Install dependensi menggunakan Bun
bun install

# Atau menggunakan NPM
npm install
```

### 3. Konfigurasi Environment Variables (Opsional)
Jika ingin mengaktifkan backend Supabase, buat file `.env.local` di direktori utama:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

> **Catatan:** Jika file `.env.local` tidak diisi, aplikasi secara otomatis berjalan menggunakan **Mock Data / LocalStorage Service**, sehingga cocok untuk demo atau pengembangan offline.

### 4. Menjalankan Server Development

```bash
bun dev
# atau
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) pada browser Anda.

---

## 🗄️ Setup Database Supabase

Untuk menjalankan aplikasi dengan backend database Supabase:
1. Buat project baru di [Supabase Dashboard](https://database.new).
2. Masuk ke menu **SQL Editor** pada dashboard Supabase Anda.
3. Salin dan jalankan skrip SQL dari file [`supabase/schema.sql`](file:///home/xynerva/project/poswarkop/supabase/schema.sql).
4. Salin `URL` dan `Anon Key` dari Supabase ke file `.env.local`.

---

## 📜 Skrip Perintah

| Perintah | Deskripsi |
| :--- | :--- |
| `bun dev` | Menjalankan server pengembangan (`http://localhost:3000`) |
| `bun build` | Membuat build produksi teroptimasi |
| `bun start` | Menjalankan server produksi hasil build |
| `bun lint` | Menjalankan pemeriksaan linter koding (ESLint) |

---

## 📄 Lisensi

Aplikasi ini dikembangkan untuk kebutuhan manajemen internal toko dan warkop.

