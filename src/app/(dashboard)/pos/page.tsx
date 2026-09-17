'use client';

import React, { useState, useCallback } from 'react';
import { useStore } from '@/context/store-context';
import { StorageService } from '@/lib/storage-service';
import { CartItem, Product, SaleReceiptData } from '@/types';
import { ProductCard } from '@/components/pos/product-card';
import { CartDrawer } from '@/components/pos/cart-drawer';
import { CheckoutModal } from '@/components/pos/checkout-modal';
import { ReceiptModal } from '@/components/pos/receipt-modal';
import { Search, ShoppingBag, SlidersHorizontal, RefreshCw } from 'lucide-react';

export default function PosPage() {
  const { activeStore } = useStore();

  const getPosData = useCallback(() => {
    return {
      categories: StorageService.getCategories(),
      inventory: StorageService.getStoreInventory(activeStore.id),
    };
  }, [activeStore.id]);

  const [posData, setPosData] = useState(getPosData);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Receipt Modal State
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<SaleReceiptData | null>(null);

  // Mobile View Switcher (Products vs Cart)
  const [activeTabMobile, setActiveTabMobile] = useState<'products' | 'cart'>('products');

  const loadData = useCallback(() => {
    setPosData(getPosData());
  }, [getPosData]);

  // Sync state if activeStore changes
  const currentData = getPosData();
  if (posData.inventory !== currentData.inventory && posData.inventory[0]?.store_id !== activeStore.id) {
    setPosData(currentData);
  }

  const { categories, inventory: storeInventory } = posData;

  // Handle Add to Cart
  const handleAddToCart = (product: Product, storeStock: number) => {
    if (storeStock <= 0) return;

    setCart((prev) => {
      const idx = prev.findIndex((item) => item.product.id === product.id);
      if (idx >= 0) {
        const currentQty = prev[idx].quantity;
        if (currentQty >= storeStock) return prev; // Cannot exceed stock!
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          quantity: currentQty + 1,
        };
        return updated;
      }
      return [
        ...prev,
        {
          product,
          quantity: 1,
          unit_price: product.selling_price, // Capturing historical price!
          store_stock: storeStock,
        },
      ];
    });
  };

  // Handle Cart Quantity Change
  const handleUpdateQuantity = (productId: string, newQty: number) => {
    setCart((prev) => {
      if (newQty <= 0) {
        return prev.filter((item) => item.product.id !== productId);
      }
      return prev.map((item) => {
        if (item.product.id === productId) {
          const qty = Math.min(newQty, item.store_stock); // Enforce stock cap
          return { ...item, quantity: qty };
        }
        return item;
      });
    });
  };

  const handleRemoveItem = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  const handleCheckoutSuccess = (receipt: SaleReceiptData) => {
    setIsCheckoutOpen(false);
    setCart([]);
    loadData(); // Refresh store stock immediately!
    setReceiptData(receipt);
    setIsReceiptOpen(true);
  };

  // Filter products by category and search query
  const filteredInventory = storeInventory.filter((inv) => {
    const matchesCategory =
      selectedCategory === 'all' || inv.product.category_id === selectedCategory;

    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      inv.product.name.toLowerCase().includes(query) ||
      inv.product.sku.toLowerCase().includes(query) ||
      (inv.product.barcode && inv.product.barcode.toLowerCase().includes(query));

    return matchesCategory && matchesSearch;
  });

  const totalCartItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="space-y-4">
      {/* Mobile Tab Switcher */}
      <div className="flex rounded-xl bg-slate-200/80 p-1 dark:bg-slate-800 md:hidden">
        <button
          onClick={() => setActiveTabMobile('products')}
          className={`flex-1 rounded-lg py-2 text-xs font-extrabold transition-all ${
            activeTabMobile === 'products'
              ? 'bg-white text-indigo-600 shadow dark:bg-slate-900 dark:text-indigo-400'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          Katalog Produk
        </button>
        <button
          onClick={() => setActiveTabMobile('cart')}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-extrabold transition-all ${
            activeTabMobile === 'cart'
              ? 'bg-white text-indigo-600 shadow dark:bg-slate-900 dark:text-indigo-400'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          <ShoppingBag className="h-4 w-4" />
          <span>Keranjang ({totalCartItems})</span>
        </button>
      </div>

      {/* Main Grid: Products Left (2 col), Cart Right (1 col) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* PRODUCTS CATALOG SECTION */}
        <div
          className={`md:col-span-2 space-y-4 ${
            activeTabMobile === 'cart' ? 'hidden md:block' : 'block'
          }`}
        >
          {/* Controls: Search & Category Pills */}
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari produk berdasarkan nama, SKU, atau barcode..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <button
                onClick={loadData}
                className="rounded-xl p-2.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                title="Refresh Stok"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`rounded-full px-3.5 py-1.5 text-xs font-bold whitespace-nowrap transition-all ${
                  selectedCategory === 'all'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                Semua Kategori
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-bold whitespace-nowrap transition-all ${
                    selectedCategory === cat.id
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Product Cards Grid */}
          {filteredInventory.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-12 dark:border-slate-800 dark:bg-slate-900 text-center p-4">
              <SlidersHorizontal className="h-10 w-10 text-slate-300 dark:text-slate-600 mb-2 stroke-[1.5]" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                Produk Tidak Ditemukan
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Coba ubah kata kunci pencarian atau kategori produk.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredInventory.map((inv) => (
                <ProductCard
                  key={inv.product.id}
                  product={inv.product}
                  storeStock={inv.quantity}
                  status={inv.status}
                  onAddToCart={handleAddToCart}
                />
              ))}
            </div>
          )}
        </div>

        {/* CART DRAWER SECTION */}
        <div
          className={`md:sticky md:top-20 md:col-span-1 h-[calc(100vh-6rem)] ${
            activeTabMobile === 'products' ? 'hidden md:block' : 'block'
          }`}
        >
          <CartDrawer
            cart={cart}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveItem}
            onClearCart={handleClearCart}
            onOpenCheckout={() => setIsCheckoutOpen(true)}
          />
        </div>
      </div>

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        cart={cart}
        onClose={() => setIsCheckoutOpen(false)}
        onSuccess={handleCheckoutSuccess}
      />

      {/* Thermal Receipt Print Modal */}
      <ReceiptModal
        isOpen={isReceiptOpen}
        receiptData={receiptData}
        onClose={() => setIsReceiptOpen(false)}
      />
    </div>
  );
}
