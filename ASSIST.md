# 📋 Project Roadmap & Execution Plan — POSWarkop

**Role**: Senior Project Manager  
**Proyek**: POSWarkop (Multi-Store POS & Inventory System)  
**Alokasi Tim**:
- 🛠️ **Lintang** — *Backend & Database Engineer* (Supabase, RLS Policies, PostgreSQL RPC Functions, Server Actions)
- 🎨 **Nares** — *Frontend & UI/UX Engineer* (Next.js App Router, React 19, Tailwind CSS v4, Supabase Client SDK, State Management)

---

## 💡 Arsitektur Komunikasi Backend (RPC vs Supabase SDK vs Server Actions)

Untuk efisiensi dan keamanan tinggi, tim **TIDAK PERLU** membuat REST API Route (`/api/...`) manual satu-per-satu. Kita menggunakan 3 metode standar Supabase:

1. ⚡ **Supabase RPC (Remote Procedure Call)** — *Utama untuk Transaksi Kompleks*:
   - Digunakan untuk operasi multi-tabel & atomic (misal: `process_sale_transaction` & `transfer_store_stock`).
   - Dipanggil oleh Nares via `supabase.rpc('nama_fungsi', { ... })`.
2. 🔒 **Direct Supabase SDK + RLS** — *Utama untuk CRUD Sederhana*:
   - Digunakan untuk membaca/menampilkan data produk, kategori, inventaris, dan riwayat penjualan.
   - Keamanan dijamin otomatis di level DB oleh RLS Policy buatan Lintang.
3. 🔑 **Next.js Server Actions** — *Khusus Fitur Admin (Service Role Key)*:
   - Digunakan khusus untuk manajemen akun user (tambah kasir baru / ubah password) yang butuh `SUPABASE_SERVICE_ROLE_KEY`.

---

## ⚠️ Checklist Khusus: Apa yang MASIH KURANG untuk MVP

Berikut adalah 4 poin krusial yang saat ini **belum ada/masih mock** dan wajib diselesaikan untuk memenuhi kebutuhan MVP:

1. 🔑 **Integrasi Supabase Auth Nyata**:
   - Halaman [src/app/login/page.tsx](file:///home/xynerva/project/poswarkop/src/app/login/page.tsx) saat ini masih menggunakan dropdown pilih user demo (mock). Perlu dihubungkan secara nyata ke `supabase.auth.signInWithPassword`.
2. 🛡️ **Pembatasan Tombol UI berdasarkan Role (RBAC Frontend)**:
   - Jika role yang login adalah **Kasir**, tombol *Edit Produk*, *Hapus Produk*, dan *Adjust Stok* harus disembunyikan/di-disable di tampilan UI.
3. 📦 **Modal UI Transfer Stok Antar Toko**:
   - Fungsi transfer barang dari Toko Mas Budi ke Warkop belum memiliki antarmuka modal di frontend.
4. 🖼️ **Pengunggahan Gambar Produk ke Supabase Storage**:
   - Form tambah/edit produk belum terhubung ke Supabase Storage Bucket untuk mengunggah berkas foto (saat ini masih berupa input URL teks biasa).

---

## 🚀 Panduan Optimasi Performa & Gambar (Agar Kilat & Enteng)

### 1. State Management (Tanpa Dependency Tambahan)
- Cukup gunakan React 19 State (`useState`, `useContext`) + Supabase SDK bawaan. Ini menjaga *bundle size* aplikasi tetap sangat kecil & cepat dimuat.

### 2. Penanganan Gambar Produk (Enteng & Fast Loading)
- **Dilarang simpan Base64 di DB**: Tabel `products` hanya menyimpan String URL (`image_url`).
- **Gunakan Supabase Storage Bucket**: Upload gambar produk ke Supabase Bucket publik.
- **Kompresi & Ukuran**:
  - Ukuran gambar maksimal **50 KB - 100 KB** per foto.
  - Dimensi gambar cukup **300x300 px** (thumbnail kasir).
  - Format disarankan **WebP** / **JPEG**.
- **Gunakan Next.js `<Image />`**: Komponen ini otomatis menangani *lazy loading* & optimasi format gambar di browser.

### 3. Rahasia Query Cepat & Respon Kilat (< 100ms)
- ⚡ **Database Indexing (Lintang)**: Buat index di PostgreSQL pada kolom yang sering dicari:
  ```sql
  CREATE INDEX idx_inventory_store_product ON inventory(store_id, product_id);
  CREATE INDEX idx_sales_store_created ON sales(store_id, created_at DESC);
  CREATE INDEX idx_products_category ON products(category_id) WHERE is_active = true;
  ```
- ⚡ **In-Memory Filtering di Kasir (Nares)**:
  - Saat kasir membuka POS, ambil katalog produk sekali ke React Context/State.
  - Pencarian barang (search bar) & filter kategori dilakukan di **RAM Browser (Client-side)**. Hasilnya **0ms (Instant)** tanpa hit network ulang setiap ketik huruf!
- ⚡ **Selective Query Columns**:
  - Hindari `SELECT *` jika tidak perlu. Cukup minta kolom yang akan di-render (`id, name, selling_price, image_url`).
- ⚡ **Pagination**:
  - Riwayat penjualan & audit log wajib dibatasi (`LIMIT 20` atau `LIMIT 50`) dengan tombol *Load More* / *Paging*.

---

## 📊 Ringkasan Phase & Milestones

| Phase | Nama Phase | Fokus Utama | PIC Utama | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Phase 1** | Existing Baseline | Arsitektur Dasar, Database Schema & Mock Service | Team | ✅ Completed |
| **Phase 2** | RBAC & Authentication | Auth Supabase, RLS Policies, Navigation & Store Guard | Lintang & Nares | 🔄 In Progress |
| **Phase 3** | Inventory & Stock Transfer | Isolasi Stok Toko, Transfer Stock RPC Function & UI Modal | Lintang & Nares | ⏳ Planned |
| **Phase 4** | POS Checkout & Payment | RPC Atomic Checkout, Cart UX, Struk & Payment | Lintang & Nares | ⏳ Planned |
| **Phase 5** | Owner Dashboard & Admin | Server Action User Management, Multi-store Analytics | Lintang & Nares | ⏳ Planned |
| **Phase 6** | QA, Optimization & Launch | Integration Testing, RLS Security Audit, Performance & Deploy | Team | ⏳ Planned |

---

## ✅ Phase 1: Existing Architecture Baseline (Sudah Selesai)

Komponen pondasi yang telah terbangun di repositori saat ini:
- 🗄️ **Database Schema ([supabase/schema.sql](file:///home/xynerva/project/poswarkop/supabase/schema.sql))**: 11 tabel utama (`stores`, `profiles`, `user_stores`, `products`, `inventory`, `sales`, dll).
- 🎨 **UI Layout Baseline ([src/app/(dashboard)](file:///home/xynerva/project/poswarkop/src/app/\(dashboard\)))**: Header, Sidebar, Cart Drawer, Halaman POS & Produk.
- 🔄 **Hybrid Storage Service ([src/lib/storage-service.ts](file:///home/xynerva/project/poswarkop/src/lib/storage-service.ts))**: Dukungan Mock Data (LocalStorage) & Supabase Client.

---

## 🛡️ Phase 2: RBAC & Authentication (Prioritas Utilitas Utama)

> **Goal**: Mengamankan sistem dengan hak akses berbasis role (`owner`, `manager`, `cashier`) dari layer Database (RLS) hingga UI Navigation.

### 🛠️ Backend Tasks — [ 👤 Lintang ]
- [x] **Task 2.1**: Supabase Auth Auto-Profile Trigger
  - Buat PostgreSQL function `handle_new_user()` agar pendaftaran user baru otomatis mengisi tabel `profiles` dengan role default `'cashier'`. *(Selesai: `handle_new_user()` trigger on `auth.users`)*
- [x] **Task 2.2**: Tighten Row Level Security (RLS) Policies
  - `products` & `categories`: Kasir hanya `SELECT`, Owner/Manager bisa `INSERT/UPDATE/DELETE`.
  - `inventory` & `sales`: Validasi ketat menggunakan helper `user_has_store_access(store_id)`.
  - `profiles` & `user_stores`: Hanya role `'owner'` yang bisa mengubah role dan hak akses toko user lain. *(Selesai: RLS policies tightened di `supabase/schema.sql` & migrasi)*
- [x] **Task 2.3**: Session & Role Verification Helper
  - Sediakan helper server-side Next.js (`@supabase/ssr`) untuk mengecek role user saat ini. *(Selesai: `src/lib/supabase/server-auth.ts`)*

### 🎨 Frontend Tasks — [ 👤 Nares ]
- [ ] **Task 2.4**: Integration Login Page & Session State
  - Hubungkan form login di `/login` ke Supabase Auth (`supabase.auth.signInWithPassword`) & perbarui `StoreContext` dengan data profil user yang aktif.
- [ ] **Task 2.5**: Dynamic Sidebar & Route Guard per Role
  - Sembunyikan menu *Produk*, *Laporan*, dan *Manajemen User* jika user yang login adalah **Kasir**.
  - Sembunyikan/Disable tombol *Edit Produk*, *Hapus Produk*, dan *Adjust Stok* jika role adalah **Kasir**.
  - Buat komponen HOC / Guard untuk meredirect Kasir jika mencoba membuka URL `/products` secara manual.
- [ ] **Task 2.6**: Store Switcher Locking
  - Kasir/Manager hanya dapat memilih toko yang terdaftar di tabel `user_stores` miliknya. Role `owner` dapat memilih semua toko.

---

## 📦 Phase 3: Multi-Store Inventory & Inter-Store Stock Transfer

> **Goal**: Menjamin isolasi stok tiap toko dan menyediakan fitur transfer barang aman dari toko pusat (Toko Mas Budi) ke Warkop via Supabase RPC.

### 🛠️ Backend Tasks — [ 👤 Lintang ]
- [x] **Task 3.1**: Stored Procedure / RPC Function `transfer_store_stock()`
  - Buat atomic RPC function di PostgreSQL untuk memindahkan stok dari `store_from` ke `store_to` (mengurangi stok asal & menambah stok tujuan secara atomic). *(Selesai: `transfer_store_stock()` with row-locking)*
- [x] **Task 3.2**: Stock Movement Logging Engine
  - Otomatis mencatat 2 log entri pada `stock_movements`: `TRANSFER_OUT` pada toko asal & `TRANSFER_IN` pada toko tujuan di dalam RPC function. *(Selesai: 2 audit movement records with `reference_id`)*
- [x] **Task 3.3**: Low Stock Threshold Query Function
  - Buat query/view RPC untuk mendapatkan daftar produk yang stoknya di bawah `minimum_stock` per toko. *(Selesai: RPC `get_low_stock_products()` & view `view_low_stock_alerts`)*

### 🎨 Frontend Tasks — [ 👤 Nares ]
- [ ] **Task 3.4**: Inter-Store Transfer UI Modal
  - Buat modal form transaksi transfer: pilih produk, toko tujuan, jumlah transfer, dan panggil `supabase.rpc('transfer_store_stock', ...)`.
- [ ] **Task 3.5**: Low Stock Warning Badge & Indicator
  - Tampilkan badge indikator stok menipis pada katalog produk dan tabel inventaris toko.
- [ ] **Task 3.6**: Stock Movement History View
  - Tampilkan riwayat pergerakan stok (Purchase, Sale, Transfer, Adjustment) dengan filter jenis movement dan tanggal.

---

## 🛒 Phase 4: Advanced POS Checkout & Payment Engine

> **Goal**: Memberikan pengalaman kasir fast-checkout yang cepat via Supabase RPC `process_sale_transaction()`, serta pencetakan struk.

### 🛠️ Backend Tasks — [ 👤 Lintang ]
- [ ] **Task 4.1**: RPC Function `process_sale_transaction()` Optimization
  - Uji ketahanan fungsi atomic checkout: pembuatan `sales`, `sale_items` (penyimpanan harga historis), pemotongan stok, dan log pembayaran dalam 1 transaksi DB.
- [ ] **Task 4.2**: Receipt Data Query Function
  - Sediakan fungsi query/view berkinerja tinggi untuk mengambil detail struk lengkap (`sale`, `store`, `items`, `payment`, `cashier_name`) berdasarkan `sale_id`.
- [ ] **Task 4.3**: Payment Validation Logic di RPC
  - Tambahkan validasi pecahan kembalian uang tunai (Cash) dan penanganan transaksi non-tunai (QRIS / Transfer) langsung di dalam stored procedure.

### 🎨 Frontend Tasks — [ 👤 Nares ]
- [ ] **Task 4.4**: Fast POS Checkout UX Refinement
  - Optimalkan pencarian produk via keyboard (shortcut focus `/`), filter kategori cepat, dan penambahan quantity ke cart tanpa lag.
- [ ] **Task 4.5**: Cart Drawer & Payment Modal UX
  - Sempurnakan tampilan Cart Drawer: kalkulasi total, tombol pecahan uang cepat (Rp 10k, 20k, 50k, 100k, Uang Pas), dan panggil RPC `process_sale_transaction`.
- [ ] **Task 4.6**: Thermal Receipt Preview & Printing
  - Implementasikan modal pratinjau struk penjualan dan styling cetak CSS `@media print` untuk printer thermal.

---

## 📊 Phase 5: Owner Dashboard & User Management

> **Goal**: Memberikan kontrol penuh bagi Owner untuk memantau performa 3 toko dan mengelola hak akses seluruh staf.

### 🛠️ Backend Tasks — [ 👤 Lintang ]
- [ ] **Task 5.1**: User Management Server Actions
  - Buat Next.js Server Action `assignUserStore(userId, storeId)` dan `updateUserRole(userId, newRole)` menggunakan Supabase Service Role Key.
- [ ] **Task 5.2**: Aggregated Sales & Revenue Analytics Query
  - Buat SQL view/RPC untuk statistik: Total omset per toko, grafik penjualan harian/bulanan, dan top-selling products.
- [ ] **Task 5.3**: Audit Log Query Function
  - Query log aktivitas sistem (`audit_logs`) untuk keperluan pengawasan aktivitas kasir & manager.

### 🎨 Frontend Tasks — [ 👤 Nares ]
- [ ] **Task 5.4**: User & Role Management Dashboard UI
  - Tampilkan tabel seluruh staf, indikator role, serta modal untuk alokasi toko & ubah role.
- [ ] **Task 5.5**: Multi-Store Analytics Summary Dashboard
  - Tampilkan kartu KPI omset total bisnis vs per toko, grafik perbandingan penjualan toko, dan daftar produk terlaris.
- [ ] **Task 5.6**: Export Report Feature (CSV / PDF)
  - Fitur unduh laporan transaksi penjualan dan stok ke format CSV/PDF.

---

## 🚀 Phase 6: QA, Optimization & Finalization (Peluncuran)

> **Goal**: Pengujian menyeluruh, audit keamanan RLS, pengujian oleh user, dan deployment ke lingkungan produksi.

### 👥 Joint Team Tasks — [ 👥 Lintang & Nares ]
- [ ] **Task 6.1**: End-to-End Integration Testing
  - Pengujian alur lengkap: Login Kasir ➔ Checkout POS via RPC ➔ Pemotongan Stok ➔ Log Movement ➔ Laporan Dashboard Owner.
- [ ] **Task 6.2**: RLS Security Audit & Penetration Testing
  - Memastikan user dengan role `cashier` sama sekali tidak bisa mengubah data toko lain via Supabase SDK.
- [ ] **Task 6.3**: Mobile & Tablet UX Responsiveness Audit
  - Memastikan antarmuka kasir nyaman digunakan pada perangkat tablet / smartphone di warkop.
- [ ] **Task 6.4**: Production Deployment (Vercel & Supabase Cloud)
  - Pengaturan environment production, SSL, migrasi skema SQL final di Supabase Cloud, dan deploy Next.js di Vercel.
- [ ] **Task 6.5**: User Acceptance Testing (UAT) & Training
  - Uji coba langsung bersama staf Toko Mas Budi, Warkop Ngombeku, dan Warkop Kakak.

---

## 📌 Aturan Kerja 

1. **Standardisasi Data**: Semua interface TypeScript wajib mengacu pada [src/types/index.ts](file:///home/xynerva/project/poswarkop/src/types/index.ts).
2. **Tracking Progress**: Centang checklist `[x]` pada dokumen ini setiap kali tugas diselesaikan.
