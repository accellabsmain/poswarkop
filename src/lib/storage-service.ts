import {
  Category,
  InventoryItem,
  Product,
  ProductStatus,
  Sale,
  SaleReceiptData,
  StockMovement,
  Store,
  UserProfile,
  PaymentMethod,
} from '@/types';
import {
  INITIAL_CATEGORIES,
  INITIAL_INVENTORY,
  INITIAL_MOVEMENTS,
  INITIAL_PRODUCTS,
  INITIAL_SALES,
  INITIAL_STORES,
  INITIAL_PROFILES,
} from './mock-data';

const STORAGE_KEYS = {
  STORES: 'pos_stores',
  PROFILES: 'pos_profiles',
  CATEGORIES: 'pos_categories',
  PRODUCTS: 'pos_products',
  INVENTORY: 'pos_inventory',
  MOVEMENTS: 'pos_movements',
  SALES: 'pos_sales',
  ACTIVE_STORE: 'pos_active_store_id',
  ACTIVE_USER: 'pos_active_user_id',
};

// Helper for local storage read/write with SSR safety
function getStoredData<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

function setStoredData<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save to localStorage:', err);
  }
}

// Data Services
export const StorageService = {
  // --- STORES & PROFILES ---
  getStores(): Store[] {
    return getStoredData<Store[]>(STORAGE_KEYS.STORES, INITIAL_STORES);
  },

  getProfiles(): UserProfile[] {
    return getStoredData<UserProfile[]>(STORAGE_KEYS.PROFILES, INITIAL_PROFILES);
  },

  getActiveUserId(): string {
    return getStoredData<string>(STORAGE_KEYS.ACTIVE_USER, 'user-owner');
  },

  setActiveUserId(id: string): void {
    setStoredData(STORAGE_KEYS.ACTIVE_USER, id);
  },

  getCurrentUser(): UserProfile {
    const userId = this.getActiveUserId();
    const profiles = this.getProfiles();
    return profiles.find((p) => p.id === userId) || INITIAL_PROFILES[0];
  },

  getActiveStoreId(): string {
    const defaultStore = INITIAL_STORES[0].id;
    return getStoredData<string>(STORAGE_KEYS.ACTIVE_STORE, defaultStore);
  },

  setActiveStoreId(storeId: string): void {
    setStoredData(STORAGE_KEYS.ACTIVE_STORE, storeId);
  },

  getActiveStore(): Store {
    const activeId = this.getActiveStoreId();
    const stores = this.getStores();
    return stores.find((s) => s.id === activeId) || stores[0];
  },

  saveProfile(profile: Omit<UserProfile, 'id'> & { id?: string }): UserProfile {
    const profiles = this.getProfiles();
    if (profile.id) {
      const idx = profiles.findIndex((p) => p.id === profile.id);
      if (idx >= 0) {
        profiles[idx] = { ...profiles[idx], ...profile };
        setStoredData(STORAGE_KEYS.PROFILES, profiles);
        return profiles[idx];
      }
    }
    const newProfile: UserProfile = {
      id: `user-${Date.now()}`,
      full_name: profile.full_name,
      role: profile.role,
      stores: profile.stores || [],
      created_at: new Date().toISOString(),
    };
    profiles.push(newProfile);
    setStoredData(STORAGE_KEYS.PROFILES, profiles);
    return newProfile;
  },

  deleteProfile(id: string): void {
    const profiles = this.getProfiles();
    const filtered = profiles.filter((p) => p.id !== id);
    setStoredData(STORAGE_KEYS.PROFILES, filtered);
  },

  // --- CATEGORIES ---
  getCategories(): Category[] {
    return getStoredData<Category[]>(STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
  },

  saveCategory(category: Omit<Category, 'id'> & { id?: string }): Category {
    const categories = this.getCategories();
    if (category.id) {
      const idx = categories.findIndex((c) => c.id === category.id);
      if (idx >= 0) {
        categories[idx] = { ...categories[idx], ...category };
        setStoredData(STORAGE_KEYS.CATEGORIES, categories);
        return categories[idx];
      }
    }
    const newCat: Category = {
      id: `cat-${Date.now()}`,
      name: category.name,
      slug: category.slug || category.name.toLowerCase().replace(/\s+/g, '-'),
      is_active: category.is_active ?? true,
      created_at: new Date().toISOString(),
    };
    categories.push(newCat);
    setStoredData(STORAGE_KEYS.CATEGORIES, categories);
    return newCat;
  },

  // --- PRODUCTS ---
  getProducts(): Product[] {
    return getStoredData<Product[]>(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
  },

  saveProduct(product: Omit<Product, 'id'> & { id?: string }): Product {
    const products = this.getProducts();
    const categories = this.getCategories();
    const catName = categories.find((c) => c.id === product.category_id)?.name;

    if (product.id) {
      const idx = products.findIndex((p) => p.id === product.id);
      if (idx >= 0) {
        const updated: Product = {
          ...products[idx],
          ...product,
          category_name: catName || products[idx].category_name,
          updated_at: new Date().toISOString(),
        };
        products[idx] = updated;
        setStoredData(STORAGE_KEYS.PRODUCTS, products);
        return updated;
      }
    }

    const newProd: Product = {
      id: `prod-${Date.now()}`,
      name: product.name,
      sku: product.sku || `SKU-${Date.now().toString().slice(-6)}`,
      barcode: product.barcode || null,
      category_id: product.category_id || null,
      category_name: catName || 'Uncategorized',
      unit: product.unit || 'pcs',
      purchase_price: Number(product.purchase_price) || 0,
      selling_price: Number(product.selling_price) || 0,
      minimum_stock: Number(product.minimum_stock) || 5,
      image_url: product.image_url || null,
      is_active: product.is_active ?? true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    products.push(newProd);
    setStoredData(STORAGE_KEYS.PRODUCTS, products);

    // Initialize inventory 0 for all stores for new product
    const stores = this.getStores();
    const inventory = this.getInventoryAll();
    stores.forEach((s) => {
      if (!inventory.some((i) => i.store_id === s.id && i.product_id === newProd.id)) {
        inventory.push({
          id: `inv-${s.id}-${newProd.id}`,
          store_id: s.id,
          product_id: newProd.id,
          quantity: 0,
        });
      }
    });
    setStoredData(STORAGE_KEYS.INVENTORY, inventory);

    return newProd;
  },

  // --- INVENTORY PER STORE ---
  getInventoryAll(): InventoryItem[] {
    return getStoredData<InventoryItem[]>(STORAGE_KEYS.INVENTORY, INITIAL_INVENTORY);
  },

  getStoreInventory(storeId: string): (InventoryItem & { product: Product; status: ProductStatus })[] {
    const products = this.getProducts();
    const inventory = this.getInventoryAll();

    return products.map((prod) => {
      const invItem = inventory.find(
        (i) => i.store_id === storeId && i.product_id === prod.id
      );
      const qty = invItem ? invItem.quantity : 0;

      let status: ProductStatus = 'NORMAL';
      if (qty <= 0) {
        status = 'OUT_OF_STOCK';
      } else if (qty <= prod.minimum_stock) {
        status = 'LOW_STOCK';
      }

      return {
        id: invItem?.id || `inv-${storeId}-${prod.id}`,
        store_id: storeId,
        product_id: prod.id,
        quantity: qty,
        updated_at: invItem?.updated_at || new Date().toISOString(),
        product: prod,
        status,
      };
    });
  },

  // Stock Adjustment Foundation
  adjustStock(params: {
    storeId: string;
    productId: string;
    newQuantity: number;
    notes?: string;
    userId?: string;
  }): InventoryItem {
    if (params.newQuantity < 0) {
      throw new Error('Stok tidak boleh negatif!');
    }

    const inventory = this.getInventoryAll();
    const idx = inventory.findIndex(
      (i) => i.store_id === params.storeId && i.product_id === params.productId
    );

    const oldQty = idx >= 0 ? inventory[idx].quantity : 0;
    const diff = params.newQuantity - oldQty;

    let updatedItem: InventoryItem;

    if (idx >= 0) {
      inventory[idx].quantity = params.newQuantity;
      inventory[idx].updated_at = new Date().toISOString();
      updatedItem = inventory[idx];
    } else {
      updatedItem = {
        id: `inv-${params.storeId}-${params.productId}`,
        store_id: params.storeId,
        product_id: params.productId,
        quantity: params.newQuantity,
        updated_at: new Date().toISOString(),
      };
      inventory.push(updatedItem);
    }

    setStoredData(STORAGE_KEYS.INVENTORY, inventory);

    // Record Stock Movement if quantity changed
    if (diff !== 0) {
      const products = this.getProducts();
      const stores = this.getStores();
      const prod = products.find((p) => p.id === params.productId);
      const store = stores.find((s) => s.id === params.storeId);
      const user = this.getCurrentUser();

      this.addStockMovement({
        product_id: params.productId,
        product_name: prod?.name || 'Unknown Product',
        store_id: params.storeId,
        store_name: store?.name || 'Unknown Store',
        type: 'ADJUSTMENT',
        quantity: diff,
        notes: params.notes || 'Penyesuaian stok manual',
        user_id: params.userId || user.id,
        user_name: user.full_name,
      });
    }

    return updatedItem;
  },

  // Inter-Store Stock Transfer
  transferStock(params: {
    fromStoreId: string;
    toStoreId: string;
    productId: string;
    quantity: number;
    notes?: string;
    userId?: string;
  }): void {
    if (params.quantity <= 0) {
      throw new Error('Jumlah transfer harus lebih dari 0.');
    }
    if (params.fromStoreId === params.toStoreId) {
      throw new Error('Toko tujuan tidak boleh sama dengan toko asal.');
    }

    const inventory = this.getInventoryAll();
    const fromIdx = inventory.findIndex(
      (i) => i.store_id === params.fromStoreId && i.product_id === params.productId
    );
    const availableQty = fromIdx >= 0 ? inventory[fromIdx].quantity : 0;

    if (availableQty < params.quantity) {
      throw new Error(
        `Stok di toko asal tidak mencukupi! (Tersedia: ${availableQty}, Diminta: ${params.quantity})`
      );
    }

    // Deduct from source store
    inventory[fromIdx].quantity -= params.quantity;
    inventory[fromIdx].updated_at = new Date().toISOString();

    // Add to target store
    const toIdx = inventory.findIndex(
      (i) => i.store_id === params.toStoreId && i.product_id === params.productId
    );
    if (toIdx >= 0) {
      inventory[toIdx].quantity += params.quantity;
      inventory[toIdx].updated_at = new Date().toISOString();
    } else {
      inventory.push({
        id: `inv-${params.toStoreId}-${params.productId}`,
        store_id: params.toStoreId,
        product_id: params.productId,
        quantity: params.quantity,
        updated_at: new Date().toISOString(),
      });
    }

    setStoredData(STORAGE_KEYS.INVENTORY, inventory);

    // Record 2 audit movements: TRANSFER_OUT & TRANSFER_IN
    const products = this.getProducts();
    const stores = this.getStores();
    const prod = products.find((p) => p.id === params.productId);
    const fromStore = stores.find((s) => s.id === params.fromStoreId);
    const toStore = stores.find((s) => s.id === params.toStoreId);
    const user = this.getCurrentUser();
    const refId = `trf-${Date.now()}`;

    this.addStockMovement({
      product_id: params.productId,
      product_name: prod?.name || 'Unknown Product',
      store_id: params.fromStoreId,
      store_name: fromStore?.name || 'Unknown Store',
      type: 'TRANSFER_OUT',
      quantity: -params.quantity,
      reference_id: refId,
      notes: params.notes || `Transfer stok ke ${toStore?.name}`,
      user_id: params.userId || user.id,
      user_name: user.full_name,
    });

    this.addStockMovement({
      product_id: params.productId,
      product_name: prod?.name || 'Unknown Product',
      store_id: params.toStoreId,
      store_name: toStore?.name || 'Unknown Store',
      type: 'TRANSFER_IN',
      quantity: params.quantity,
      reference_id: refId,
      notes: params.notes || `Transfer stok dari ${fromStore?.name}`,
      user_id: params.userId || user.id,
      user_name: user.full_name,
    });
  },

  // --- STOCK MOVEMENTS ---
  getStockMovements(storeId?: string): StockMovement[] {
    const movements = getStoredData<StockMovement[]>(STORAGE_KEYS.MOVEMENTS, INITIAL_MOVEMENTS);
    if (storeId) {
      return movements.filter((m) => m.store_id === storeId);
    }
    return movements;
  },

  addStockMovement(movement: Omit<StockMovement, 'id' | 'created_at'>): StockMovement {
    const movements = this.getStockMovements();
    const newMovement: StockMovement = {
      ...movement,
      id: `sm-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      created_at: new Date().toISOString(),
    };
    movements.unshift(newMovement);
    setStoredData(STORAGE_KEYS.MOVEMENTS, movements);
    return newMovement;
  },

  // --- SALES & POS ATOMIC TRANSACTIONS ---
  getSales(storeId?: string): Sale[] {
    const sales = getStoredData<Sale[]>(STORAGE_KEYS.SALES, INITIAL_SALES);
    if (storeId) {
      return sales.filter((s) => s.store_id === storeId);
    }
    return sales;
  },

  getSaleById(saleId: string): SaleReceiptData | null {
    const sales = this.getSales();
    const sale = sales.find((s) => s.id === saleId);
    if (!sale) return null;

    const stores = this.getStores();
    const store = stores.find((s) => s.id === sale.store_id) || stores[0];

    return {
      sale,
      store,
      items: sale.items || [],
      payment: sale.payment || {
        id: `pay-${sale.id}`,
        sale_id: sale.id,
        payment_method: sale.payment_method,
        amount_paid: sale.total_amount,
        amount_change: 0,
        payment_status: 'COMPLETED',
      },
      cashier_name: sale.cashier_name || 'Kasir',
    };
  },

  // ATOMIC SALE TRANSACTION LOGIC
  createSale(params: {
    store_id: string;
    cashier_id: string;
    payment_method: PaymentMethod;
    amount_paid: number;
    notes?: string;
    items: {
      product_id: string;
      quantity: number;
      unit_price: number; // Captured historical price
    }[];
  }): SaleReceiptData {
    // 1. Validate Store & User
    const stores = this.getStores();
    const store = stores.find((s) => s.id === params.store_id);
    if (!store) throw new Error('Toko tidak terdaftar');

    const currentUser = this.getCurrentUser();

    // 2. Validate Cart & Stock Server-Side Logic
    if (!params.items || params.items.length === 0) {
      throw new Error('Keranjang belanja kosong');
    }

    const inventory = this.getInventoryAll();
    const products = this.getProducts();

    let calculatedTotal = 0;
    const processedItems: {
      product_id: string;
      product_name: string;
      quantity: number;
      unit_price: number;
      subtotal: number;
    }[] = [];

    // Verify stock availability for each item
    for (const item of params.items) {
      const prod = products.find((p) => p.id === item.product_id);
      if (!prod) throw new Error(`Produk tidak ditemukan: ${item.product_id}`);
      if (!prod.is_active) throw new Error(`Produk "${prod.name}" sedang tidak aktif`);

      const invIndex = inventory.findIndex(
        (i) => i.store_id === params.store_id && i.product_id === item.product_id
      );
      const availableStock = invIndex >= 0 ? inventory[invIndex].quantity : 0;

      if (availableStock < item.quantity) {
        throw new Error(
          `Stok untuk produk "${prod.name}" tidak mencukupi! (Tersedia: ${availableStock}, Diminta: ${item.quantity})`
        );
      }

      const itemSubtotal = item.unit_price * item.quantity;
      calculatedTotal += itemSubtotal;

      processedItems.push({
        product_id: item.product_id,
        product_name: prod.name,
        quantity: item.quantity,
        unit_price: item.unit_price, // Preserving historical price!
        subtotal: itemSubtotal,
      });
    }

    // Validate cash payment
    if (params.payment_method === 'CASH' && params.amount_paid < calculatedTotal) {
      throw new Error(
        `Nominal pembayaran Rp ${params.amount_paid.toLocaleString('id-ID')} kurang dari total tagihan Rp ${calculatedTotal.toLocaleString('id-ID')}`
      );
    }

    const change = Math.max(0, params.amount_paid - calculatedTotal);

    // 3. Begin Transaction Commit
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randStr = Math.floor(100 + Math.random() * 900).toString();
    const transactionNumber = `TRX-${dateStr}-${randStr}`;

    const saleId = `sale-${Date.now()}`;

    // A. Deduct Inventory & Create Stock Movement for each item
    for (const item of params.items) {
      const invIndex = inventory.findIndex(
        (i) => i.store_id === params.store_id && i.product_id === item.product_id
      );
      if (invIndex >= 0) {
        inventory[invIndex].quantity -= item.quantity;
        inventory[invIndex].updated_at = now.toISOString();
      }

      const prod = products.find((p) => p.id === item.product_id);
      this.addStockMovement({
        product_id: item.product_id,
        product_name: prod?.name || 'Unknown',
        store_id: params.store_id,
        store_name: store.name,
        type: 'SALE',
        quantity: -item.quantity, // Negative for stock reduction
        reference_id: saleId,
        notes: `Penjualan Kasir POS (${transactionNumber})`,
        user_id: params.cashier_id,
        user_name: currentUser.full_name,
      });
    }

    setStoredData(STORAGE_KEYS.INVENTORY, inventory);

    // B. Build Sale Object
    const saleItems = processedItems.map((pi, idx) => ({
      id: `si-${saleId}-${idx}`,
      sale_id: saleId,
      product_id: pi.product_id,
      product_name: pi.product_name,
      unit_price: pi.unit_price,
      quantity: pi.quantity,
      subtotal: pi.subtotal,
    }));

    const payment = {
      id: `pay-${saleId}`,
      sale_id: saleId,
      payment_method: params.payment_method,
      amount_paid: params.amount_paid,
      amount_change: change,
      payment_status: 'COMPLETED',
      created_at: now.toISOString(),
    };

    const newSale: Sale = {
      id: saleId,
      transaction_number: transactionNumber,
      store_id: params.store_id,
      store_name: store.name,
      cashier_id: params.cashier_id,
      cashier_name: currentUser.full_name,
      total_amount: calculatedTotal,
      payment_method: params.payment_method,
      status: 'COMPLETED',
      notes: params.notes || null,
      created_at: now.toISOString(),
      items: saleItems,
      payment,
    };

    const salesList = this.getSales();
    salesList.unshift(newSale);
    setStoredData(STORAGE_KEYS.SALES, salesList);

    return {
      sale: newSale,
      store,
      items: saleItems,
      payment,
      cashier_name: currentUser.full_name,
    };
  },
};
