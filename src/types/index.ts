export type UserRole = 'owner' | 'cashier' | 'manager';

export type PaymentMethod = 'CASH' | 'QRIS' | 'TRANSFER' | 'OTHER';

export type SaleStatus = 'COMPLETED' | 'CANCELLED' | 'PENDING';

export type StockMovementType =
  | 'PURCHASE'
  | 'SALE'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT'
  | 'ADJUSTMENT';

export type ProductStatus = 'NORMAL' | 'LOW_STOCK' | 'OUT_OF_STOCK';

export interface Store {
  id: string;
  name: string;
  code: string;
  address?: string;
  phone?: string;
  created_at?: string;
}

export interface UserProfile {
  id: string;
  full_name: string;
  role: UserRole;
  created_at?: string;
  stores?: Store[];
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  created_at?: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode?: string | null;
  category_id?: string | null;
  category_name?: string;
  unit: string;
  purchase_price: number;
  selling_price: number;
  minimum_stock: number;
  image_url?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface InventoryItem {
  id: string;
  store_id: string;
  product_id: string;
  quantity: number;
  product?: Product;
  status?: ProductStatus;
  updated_at?: string;
}

export interface StockMovement {
  id: string;
  product_id: string;
  product_name?: string;
  store_id: string;
  store_name?: string;
  type: StockMovementType;
  quantity: number;
  reference_id?: string | null;
  notes?: string | null;
  user_id?: string | null;
  user_name?: string;
  created_at: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  unit_price: number; // Historical price when added to cart
  store_stock: number;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  product_name?: string;
  unit_price: number; // Historical price captured at checkout
  quantity: number;
  subtotal: number;
}

export interface Payment {
  id: string;
  sale_id: string;
  payment_method: PaymentMethod;
  amount_paid: number;
  amount_change: number;
  payment_status: string;
  created_at?: string;
}

export interface Sale {
  id: string;
  transaction_number: string;
  store_id: string;
  store_name?: string;
  cashier_id: string;
  cashier_name?: string;
  total_amount: number;
  payment_method: PaymentMethod;
  status: SaleStatus;
  notes?: string | null;
  created_at: string;
  items?: SaleItem[];
  payment?: Payment;
}

export interface SaleReceiptData {
  sale: Sale;
  store: Store;
  items: SaleItem[];
  payment: Payment;
  cashier_name: string;
}
