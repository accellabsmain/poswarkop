import { createClient } from './client';
import {
  Category,
  InventoryItem,
  PaymentMethod,
  Product,
  ProductStatus,
  Sale,
  StockMovement,
  StockTransfer,
  LowStockProduct,
  Store,
  UserProfile,
} from '@/types';

// Browser client instance
export const supabase = createClient();

/**
 * ============================================================================
 * SUPABASE QUERY SERVICE
 * Kumpulan query langsung ke database Supabase sesuai schema poswarkop
 * ============================================================================
 */

// 1. STORES
export async function getStores(): Promise<Store[]> {
  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching stores:', error.message);
    throw error;
  }
  return data || [];
}

// 2. PROFILES & USER ACCESS
export async function getProfiles(): Promise<UserProfile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      id,
      full_name,
      role,
      created_at,
      user_stores (
        store:stores (*)
      )
    `);

  if (error) {
    console.error('Error fetching profiles:', error.message);
    throw error;
  }

  // Format mapping nested user_stores ke UserProfile
  return (data || []).map((p: any) => ({
    id: p.id,
    full_name: p.full_name,
    role: p.role,
    created_at: p.created_at,
    stores: p.user_stores?.map((us: any) => us.store).filter(Boolean) || [],
  }));
}

// 3. CATEGORIES
export async function getCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching categories:', error.message);
    throw error;
  }
  return data || [];
}

export async function upsertCategory(
  category: Partial<Category> & { name: string }
): Promise<Category> {
  const slug = category.slug || category.name.toLowerCase().replace(/\s+/g, '-');
  const payload: any = {
    name: category.name,
    slug,
    is_active: category.is_active ?? true,
  };
  if (category.id) payload.id = category.id;

  const { data, error } = await supabase
    .from('categories')
    .upsert(payload)
    .select()
    .single();

  if (error) {
    console.error('Error saving category:', error.message);
    throw error;
  }
  return data;
}

// 4. PRODUCTS
export async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      category:categories(name)
    `)
    .order('name');

  if (error) {
    console.error('Error fetching products:', error.message);
    throw error;
  }

  return (data || []).map((p: any) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    barcode: p.barcode,
    category_id: p.category_id,
    category_name: p.category?.name || 'Uncategorized',
    unit: p.unit,
    purchase_price: Number(p.purchase_price) || 0,
    selling_price: Number(p.selling_price) || 0,
    minimum_stock: Number(p.minimum_stock) || 5,
    image_url: p.image_url,
    is_active: p.is_active ?? true,
    created_at: p.created_at,
    updated_at: p.updated_at,
  }));
}

export async function upsertProduct(
  product: Partial<Product> & { name: string; selling_price: number }
): Promise<Product> {
  const payload: any = {
    name: product.name,
    sku: product.sku || `SKU-${Date.now().toString().slice(-6)}`,
    barcode: product.barcode || null,
    category_id: product.category_id || null,
    unit: product.unit || 'pcs',
    purchase_price: product.purchase_price || 0,
    selling_price: product.selling_price || 0,
    minimum_stock: product.minimum_stock ?? 5,
    image_url: product.image_url || null,
    is_active: product.is_active ?? true,
    updated_at: new Date().toISOString(),
  };
  if (product.id) payload.id = product.id;

  const { data, error } = await supabase
    .from('products')
    .upsert(payload)
    .select('*, category:categories(name)')
    .single();

  if (error) {
    console.error('Error upserting product:', error.message);
    throw error;
  }

  return {
    ...data,
    category_name: data.category?.name || 'Uncategorized',
  };
}

// 5. INVENTORY PER STORE
export async function getStoreInventory(
  storeId: string
): Promise<(InventoryItem & { product: Product; status: ProductStatus })[]> {
  const { data, error } = await supabase
    .from('inventory')
    .select(`
      id,
      store_id,
      product_id,
      quantity,
      updated_at,
      product:products(
        *,
        category:categories(name)
      )
    `)
    .eq('store_id', storeId);

  if (error) {
    console.error('Error fetching inventory:', error.message);
    throw error;
  }

  return (data || []).map((item: any) => {
    const prodRaw = item.product;
    const prod: Product = {
      id: prodRaw.id,
      name: prodRaw.name,
      sku: prodRaw.sku,
      barcode: prodRaw.barcode,
      category_id: prodRaw.category_id,
      category_name: prodRaw.category?.name || 'Uncategorized',
      unit: prodRaw.unit,
      purchase_price: Number(prodRaw.purchase_price) || 0,
      selling_price: Number(prodRaw.selling_price) || 0,
      minimum_stock: Number(prodRaw.minimum_stock) || 5,
      image_url: prodRaw.image_url,
      is_active: prodRaw.is_active,
      created_at: prodRaw.created_at,
      updated_at: prodRaw.updated_at,
    };

    const qty = Number(item.quantity) || 0;
    let status: ProductStatus = 'NORMAL';
    if (qty <= 0) {
      status = 'OUT_OF_STOCK';
    } else if (qty <= prod.minimum_stock) {
      status = 'LOW_STOCK';
    }

    return {
      id: item.id,
      store_id: item.store_id,
      product_id: item.product_id,
      quantity: qty,
      updated_at: item.updated_at,
      product: prod,
      status,
    };
  });
}

// 6. ADJUST STOCK (Memanggil stored procedure atomic adjust_store_stock)
export async function adjustStock(params: {
  storeId: string;
  productId: string;
  newQuantity: number;
  notes?: string;
  userId?: string;
}) {
  const { data, error } = await supabase.rpc('adjust_store_stock', {
    p_store_id: params.storeId,
    p_product_id: params.productId,
    p_new_quantity: params.newQuantity,
    p_notes: params.notes || 'Penyesuaian stok manual',
    p_user_id: params.userId || null,
  });

  if (error) {
    console.error('Error adjusting stock:', error.message);
    throw error;
  }
  return data;
}

// 7. TRANSAKSI POS (Memanggil atomic RPC process_sale_transaction)
export async function processSale(params: {
  storeId: string;
  cashierId: string;
  paymentMethod: PaymentMethod;
  amountPaid: number;
  items: Array<{
    product_id: string;
    quantity: number;
    unit_price: number;
  }>;
}) {
  const { data, error } = await supabase.rpc('process_sale_transaction', {
    p_store_id: params.storeId,
    p_cashier_id: params.cashierId,
    p_payment_method: params.paymentMethod,
    p_amount_paid: params.amountPaid,
    p_items: params.items,
  });

  if (error) {
    console.error('Error processing sale:', error.message);
    throw error;
  }
  return data;
}

// 8. SALES HISTORY
export async function getSales(storeId?: string): Promise<Sale[]> {
  let query = supabase
    .from('sales')
    .select(`
      *,
      sale_items (*),
      payments (*)
    `)
    .order('created_at', { ascending: false });

  if (storeId) {
    query = query.eq('store_id', storeId);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching sales:', error.message);
    throw error;
  }

  return (data || []).map((s: any) => {
    const payment = s.payments?.[0];
    return {
      id: s.id,
      store_id: s.store_id,
      cashier_id: s.cashier_id,
      cashier_name: s.cashier_name || 'Kasir',
      transaction_number: s.transaction_number,
      total_amount: Number(s.total_amount),
      payment_method: (payment?.payment_method || 'CASH') as PaymentMethod,
      status: s.status,
      items: s.sale_items || [],
      payment: payment || undefined,
      created_at: s.created_at,
    };
  });
}

// 9. STOCK MOVEMENTS
export async function getStockMovements(storeId?: string): Promise<StockMovement[]> {
  let query = supabase
    .from('stock_movements')
    .select(`
      *,
      product:products(name),
      store:stores(name)
    `)
    .order('created_at', { ascending: false });

  if (storeId) {
    query = query.eq('store_id', storeId);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching stock movements:', error.message);
    throw error;
  }

  return (data || []).map((m: any) => ({
    id: m.id,
    product_id: m.product_id,
    product_name: m.product?.name || 'Produk',
    store_id: m.store_id,
    store_name: m.store?.name || 'Toko',
    type: m.type,
    quantity: m.quantity,
    reference_id: m.reference_id,
    notes: m.notes,
    user_id: m.user_id,
    user_name: m.user_name || 'User',
    created_at: m.created_at,
  }));
}

// ============================================================================
// PHASE 3: INTER-STORE STOCK TRANSFER & LOW STOCK ENGINE (TASKS 3.1 - 3.3)
// ============================================================================

// 10. TRANSFER STOCK ANTAR TOKO (Task 3.1 & 3.2 Atomic RPC)
export async function transferStoreStock(params: {
  fromStoreId: string;
  toStoreId: string;
  productId: string;
  quantity: number;
  transferPrice?: number;
  notes?: string;
  userId?: string;
}) {
  const { data, error } = await supabase.rpc('transfer_store_stock', {
    p_from_store_id: params.fromStoreId,
    p_to_store_id: params.toStoreId,
    p_product_id: params.productId,
    p_quantity: params.quantity,
    p_transfer_price: params.transferPrice || 0,
    p_notes: params.notes || null,
    p_user_id: params.userId || null,
  });

  if (error) {
    console.error('Error in transfer_store_stock:', error.message);
    throw error;
  }
  return data;
}

// 11. DAFTAR PRODUK STOK MENIPIS / HABIS PER TOKO (Task 3.3 RPC)
export async function getLowStockProducts(storeId: string): Promise<LowStockProduct[]> {
  const { data, error } = await supabase.rpc('get_low_stock_products', {
    p_store_id: storeId,
  });

  if (error) {
    console.error('Error fetching low stock products:', error.message);
    throw error;
  }

  return (data || []).map((item: any) => ({
    product_id: item.product_id,
    product_name: item.product_name,
    sku: item.sku,
    barcode: item.barcode,
    category_id: item.category_id,
    category_name: item.category_name,
    unit: item.unit,
    selling_price: Number(item.selling_price) || 0,
    current_stock: Number(item.current_stock) || 0,
    minimum_stock: Number(item.minimum_stock) || 0,
    status: item.status as 'LOW_STOCK' | 'OUT_OF_STOCK',
  }));
}

// 12. RIWAYAT TRANSFER STOK DENGAN DETAIL
export async function getStockTransfers(storeId?: string): Promise<StockTransfer[]> {
  let query = supabase
    .from('stock_transfers')
    .select(`
      *,
      from_store:stores!from_store_id(name),
      to_store:stores!to_store_id(name),
      user:profiles(full_name),
      stock_transfer_items (
        *,
        product:products(name)
      )
    `)
    .order('created_at', { ascending: false });

  if (storeId) {
    query = query.or(`from_store_id.eq.${storeId},to_store_id.eq.${storeId}`);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching stock transfers:', error.message);
    throw error;
  }

  return (data || []).map((t: any) => ({
    id: t.id,
    transfer_number: t.transfer_number,
    from_store_id: t.from_store_id,
    from_store_name: t.from_store?.name || 'Toko Pengirim',
    to_store_id: t.to_store_id,
    to_store_name: t.to_store?.name || 'Toko Penerima',
    user_id: t.user_id,
    user_name: t.user?.full_name || 'Staff',
    notes: t.notes,
    created_at: t.created_at,
    items: (t.stock_transfer_items || []).map((item: any) => ({
      id: item.id,
      transfer_id: item.transfer_id,
      product_id: item.product_id,
      product_name: item.product?.name || 'Produk',
      quantity: Number(item.quantity) || 0,
      transfer_price: Number(item.transfer_price) || 0,
    })),
  }));
}

