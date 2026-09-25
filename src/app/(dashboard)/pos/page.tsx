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
  React.useEffect(() => {
    setPosData(getPosData());
  }, [getPosData]);

  const { categories, inventory: storeInventory } = posData;

  // Handle Add to Cart
  const handleAddToCart = (product: Product, storeStock: number) => {
    if (storeStock <= 0) return;

    setCart((prev) => {
      const idx = prev.findIndex((item) => item.product.id === product.id);
      if (idx >= 0) {
        const currentQty = prev[idx].quantity;
        if (currentQty >= storeStock) return prev;
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
          unit_price: product.selling_price,
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
          const qty = Math.min(newQty, item.store_stock);
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
    loadData();
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

  // Keyboard Shortcuts: '/' to focus search, 'Escape' to clear/blur, 'F2' to checkout
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

      if (e.key === '/' && !isInput) {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'Escape') {
        if (isCheckoutOpen) {
          setIsCheckoutOpen(false);
        } else if (isReceiptOpen) {
          setIsReceiptOpen(false);
        } else if (searchQuery) {
          setSearchQuery('');
          searchInputRef.current?.blur();
        }
      } else if (e.key === 'F2') {
        e.preventDefault();
        if (cart.length > 0 && !isCheckoutOpen) {
          setIsCheckoutOpen(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart.length, isCheckoutOpen, isReceiptOpen, searchQuery]);

  return (
    <div className="space-y-5">
      {/* Mobile Tab Switcher */}
      <div className="flex rounded-full bg-[#f1f4f7] p-1 border border-[#dee3e9] md:hidden">
        <button
          onClick={() => setActiveTabMobile('products')}
          className={`flex-1 rounded-full py-2 text-xs font-bold transition-all ${
            activeTabMobile === 'products'
              ? 'bg-[#0a1317] text-white shadow-sm'
              : 'text-[#5d6c7b]'
          }`}
        >
          Katalog Produk
        </button>
        <button
          onClick={() => setActiveTabMobile('cart')}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-full py-2 text-xs font-bold transition-all ${
            activeTabMobile === 'cart'
              ? 'bg-[#0a1317] text-white shadow-sm'
              : 'text-[#5d6c7b]'
          }`}
        >
          <ShoppingBag className="h-4 w-4" />
          <span>Keranjang ({totalCartItems})</span>
        </button>
      </div>

      {/* Keyboard Shortcut Banner */}
      <div className="hidden sm:flex items-center justify-between rounded-2xl bg-[#f1f4f7] border border-[#dee3e9] px-5 py-2.5 text-xs text-[#0a1317]">
        <div className="flex items-center gap-4">
          <span className="font-extrabold flex items-center gap-1 text-[#0064e0]">
            ⚡ Shortcut Kasir Cepat:
          </span>
          <span className="flex items-center gap-1 font-bold">
            <kbd className="rounded-full border border-[#dee3e9] bg-white px-2 py-0.5 font-mono text-[10px] font-bold shadow-xs text-[#0a1317]">
              /
            </kbd>{' '}
            Fokus Cari Produk
          </span>
          <span className="flex items-center gap-1 font-bold">
            <kbd className="rounded-full border border-[#dee3e9] bg-white px-2 py-0.5 font-mono text-[10px] font-bold shadow-xs text-[#0a1317]">
              F2
            </kbd>{' '}
            Bayar & Checkout
          </span>
          <span className="flex items-center gap-1 font-bold">
            <kbd className="rounded-full border border-[#dee3e9] bg-white px-2 py-0.5 font-mono text-[10px] font-bold shadow-xs text-[#0a1317]">
              Esc
            </kbd>{' '}
            Reset / Tutup Modal
          </span>
        </div>
      </div>

      {/* Main Grid: Products Left (2 col), Cart Right (1 col) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* PRODUCTS CATALOG SECTION */}
        <div
          className={`md:col-span-2 space-y-5 ${
            activeTabMobile === 'cart' ? 'hidden md:block' : 'block'
          }`}
        >
          {/* Controls: Search & Category Pills */}
          <div className="space-y-3.5 rounded-3xl border border-[#dee3e9] bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-3.5 h-4 w-4 text-[#8595a4]" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari produk berdasarkan nama, SKU, atau barcode... (Tekan '/')"
                  className="w-full rounded-full border border-[#dee3e9] bg-[#f1f4f7] pl-11 pr-12 py-3 text-sm font-medium text-[#0a1317] focus:border-[#0064e0] focus:bg-white focus:outline-none transition-all"
                />
                <span className="absolute right-4 top-3 hidden sm:inline-block rounded-full border border-[#dee3e9] bg-white px-2 py-0.5 font-mono text-[10px] font-bold text-[#8595a4]">
                  /
                </span>
              </div>
              <button
                onClick={loadData}
                className="rounded-full p-3 text-[#5d6c7b] bg-[#f1f4f7] border border-[#dee3e9] hover:bg-white transition-all"
                title="Refresh Stok"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`rounded-full px-4 py-2 text-xs font-bold whitespace-nowrap transition-all ${
                  selectedCategory === 'all'
                    ? 'bg-[#0a1317] text-white shadow-sm'
                    : 'bg-[#f1f4f7] text-[#1c1e21] border border-[#dee3e9] hover:bg-white'
                }`}
              >
                Semua Kategori
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`rounded-full px-4 py-2 text-xs font-bold whitespace-nowrap transition-all ${
                    selectedCategory === cat.id
                      ? 'bg-[#0a1317] text-white shadow-sm'
                      : 'bg-[#f1f4f7] text-[#1c1e21] border border-[#dee3e9] hover:bg-white'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Product Cards Grid */}
          {filteredInventory.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-[#dee3e9] bg-white py-12 text-center p-4">
              <SlidersHorizontal className="h-10 w-10 text-[#8595a4] mb-2 stroke-[1.5]" />
              <p className="text-sm font-bold text-[#0a1317]">
                Produk Tidak Ditemukan
              </p>
              <p className="text-xs text-[#5d6c7b] mt-1">
                Coba ubah kata kunci pencarian atau kategori produk.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
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
