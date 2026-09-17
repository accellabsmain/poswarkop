import { Category, InventoryItem, Product, Store, StockMovement, Sale, UserProfile } from '@/types';

export const INITIAL_STORES: Store[] = [
  {
    id: 'store-1',
    name: 'Toko Mas Budi',
    code: 'MAS_BUDI',
    address: 'Jl. Sembako Raya No. 1, Surabaya',
    phone: '081234567890',
  },
  {
    id: 'store-2',
    name: 'Warkop Ngombeku',
    code: 'NGOMBEKU',
    address: 'Jl. Pemuda No. 12, Surabaya',
    phone: '081234567891',
  },
  {
    id: 'store-3',
    name: 'Warkop Kakak',
    code: 'KAKAK',
    address: 'Jl. Merdeka No. 45, Surabaya',
    phone: '081234567892',
  },
];

export const INITIAL_PROFILES: UserProfile[] = [
  {
    id: 'user-owner',
    full_name: 'Budi (Owner)',
    role: 'owner',
    stores: INITIAL_STORES,
  },
  {
    id: 'user-cashier-1',
    full_name: 'Siti Kasir (Warkop Ngombeku)',
    role: 'cashier',
    stores: [INITIAL_STORES[1]],
  },
  {
    id: 'user-manager-1',
    full_name: 'Agus Manager (Toko Mas Budi)',
    role: 'manager',
    stores: [INITIAL_STORES[0]],
  },
];

export const INITIAL_CATEGORIES: Category[] = [
  { id: 'cat-1', name: 'Sembako', slug: 'sembako', is_active: true },
  { id: 'cat-2', name: 'Minuman', slug: 'minuman', is_active: true },
  { id: 'cat-3', name: 'Makanan & Snack', slug: 'makanan-snack', is_active: true },
  { id: 'cat-4', name: 'Rokok', slug: 'rokok', is_active: true },
  { id: 'cat-5', name: 'Lainnya', slug: 'lainnya', is_active: true },
];

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    name: 'Aqua 600ml',
    sku: 'AQUA-600',
    barcode: '899100100001',
    category_id: 'cat-2',
    category_name: 'Minuman',
    unit: 'botol',
    purchase_price: 2500,
    selling_price: 4000,
    minimum_stock: 10,
    is_active: true,
  },
  {
    id: 'prod-2',
    name: 'Kopi Kapal Api Hitam',
    sku: 'KOPI-KA',
    barcode: '899100100002',
    category_id: 'cat-2',
    category_name: 'Minuman',
    unit: 'cangkir',
    purchase_price: 2000,
    selling_price: 5000,
    minimum_stock: 15,
    is_active: true,
  },
  {
    id: 'prod-3',
    name: 'Teh Manis Dingin',
    sku: 'TEH-ES',
    barcode: '899100100003',
    category_id: 'cat-2',
    category_name: 'Minuman',
    unit: 'gelas',
    purchase_price: 1500,
    selling_price: 4000,
    minimum_stock: 20,
    is_active: true,
  },
  {
    id: 'prod-4',
    name: 'Indomie Goreng + Telur',
    sku: 'INDOMIE-GT',
    barcode: '899100100004',
    category_id: 'cat-3',
    category_name: 'Makanan & Snack',
    unit: 'porsi',
    purchase_price: 5000,
    selling_price: 10000,
    minimum_stock: 10,
    is_active: true,
  },
  {
    id: 'prod-5',
    name: 'Minyak Goreng Kita 1L',
    sku: 'MYK-KITA-1L',
    barcode: '899100100005',
    category_id: 'cat-1',
    category_name: 'Sembako',
    unit: 'pouch',
    purchase_price: 14000,
    selling_price: 16000,
    minimum_stock: 8,
    is_active: true,
  },
  {
    id: 'prod-6',
    name: 'Beras Ramos 5kg',
    sku: 'BERAS-5KG',
    barcode: '899100100006',
    category_id: 'cat-1',
    category_name: 'Sembako',
    unit: 'karung',
    purchase_price: 65000,
    selling_price: 72000,
    minimum_stock: 5,
    is_active: true,
  },
  {
    id: 'prod-7',
    name: 'Sampoerna Mild 16',
    sku: 'RK-SAMP-16',
    barcode: '899100100007',
    category_id: 'cat-4',
    category_name: 'Rokok',
    unit: 'bungkus',
    purchase_price: 29000,
    selling_price: 33000,
    minimum_stock: 5,
    is_active: true,
  },
];

export const INITIAL_INVENTORY: InventoryItem[] = [
  // Toko Mas Budi (Store 1)
  { id: 'inv-1-1', store_id: 'store-1', product_id: 'prod-1', quantity: 100 },
  { id: 'inv-1-2', store_id: 'store-1', product_id: 'prod-2', quantity: 50 },
  { id: 'inv-1-3', store_id: 'store-1', product_id: 'prod-3', quantity: 40 },
  { id: 'inv-1-4', store_id: 'store-1', product_id: 'prod-4', quantity: 30 },
  { id: 'inv-1-5', store_id: 'store-1', product_id: 'prod-5', quantity: 25 },
  { id: 'inv-1-6', store_id: 'store-1', product_id: 'prod-6', quantity: 15 },
  { id: 'inv-1-7', store_id: 'store-1', product_id: 'prod-7', quantity: 20 },

  // Warkop Ngombeku (Store 2)
  { id: 'inv-2-1', store_id: 'store-2', product_id: 'prod-1', quantity: 20 },
  { id: 'inv-2-2', store_id: 'store-2', product_id: 'prod-2', quantity: 8 }, // Low stock!
  { id: 'inv-2-3', store_id: 'store-2', product_id: 'prod-3', quantity: 35 },
  { id: 'inv-2-4', store_id: 'store-2', product_id: 'prod-4', quantity: 0 }, // Out of stock!
  { id: 'inv-2-5', store_id: 'store-2', product_id: 'prod-5', quantity: 2 },
  { id: 'inv-2-6', store_id: 'store-2', product_id: 'prod-6', quantity: 1 },
  { id: 'inv-2-7', store_id: 'store-2', product_id: 'prod-7', quantity: 12 },

  // Warkop Kakak (Store 3)
  { id: 'inv-3-1', store_id: 'store-3', product_id: 'prod-1', quantity: 15 },
  { id: 'inv-3-2', store_id: 'store-3', product_id: 'prod-2', quantity: 18 },
  { id: 'inv-3-3', store_id: 'store-3', product_id: 'prod-3', quantity: 22 },
  { id: 'inv-3-4', store_id: 'store-3', product_id: 'prod-4', quantity: 12 },
  { id: 'inv-3-5', store_id: 'store-3', product_id: 'prod-5', quantity: 0 },
  { id: 'inv-3-6', store_id: 'store-3', product_id: 'prod-6', quantity: 0 },
  { id: 'inv-3-7', store_id: 'store-3', product_id: 'prod-7', quantity: 5 },
];

export const INITIAL_MOVEMENTS: StockMovement[] = [
  {
    id: 'sm-1',
    product_id: 'prod-1',
    product_name: 'Aqua 600ml',
    store_id: 'store-1',
    store_name: 'Toko Mas Budi',
    type: 'PURCHASE',
    quantity: 100,
    notes: 'Stok Awal Supplier',
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: 'sm-2',
    product_id: 'prod-2',
    product_name: 'Kopi Kapal Api Hitam',
    store_id: 'store-2',
    store_name: 'Warkop Ngombeku',
    type: 'SALE',
    quantity: -2,
    notes: 'Penjualan TRX-20260918-001',
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
];

export const INITIAL_SALES: Sale[] = [
  {
    id: 'sale-1',
    transaction_number: 'TRX-20260918-001',
    store_id: 'store-2',
    store_name: 'Warkop Ngombeku',
    cashier_id: 'user-cashier-1',
    cashier_name: 'Siti Kasir (Warkop Ngombeku)',
    total_amount: 14000,
    payment_method: 'CASH',
    status: 'COMPLETED',
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    items: [
      {
        id: 'si-1',
        sale_id: 'sale-1',
        product_id: 'prod-2',
        product_name: 'Kopi Kapal Api Hitam',
        unit_price: 5000,
        quantity: 2,
        subtotal: 10000,
      },
      {
        id: 'si-2',
        sale_id: 'sale-1',
        product_id: 'prod-1',
        product_name: 'Aqua 600ml',
        unit_price: 4000,
        quantity: 1,
        subtotal: 4000,
      },
    ],
    payment: {
      id: 'pay-1',
      sale_id: 'sale-1',
      payment_method: 'CASH',
      amount_paid: 20000,
      amount_change: 6000,
      payment_status: 'COMPLETED',
    },
  },
];
