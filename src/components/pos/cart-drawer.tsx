'use client';

import React from 'react';
import { CartItem } from '@/types';
import { Trash2, Plus, Minus, ShoppingBag } from 'lucide-react';

interface CartDrawerProps {
  cart: CartItem[];
  onUpdateQuantity: (productId: string, newQty: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  onOpenCheckout: () => void;
}

export function CartDrawer({
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onOpenCheckout,
}: CartDrawerProps) {
  const totalAmount = cart.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          <h2 className="font-bold text-slate-900 dark:text-white text-base">
            Keranjang Kasir
          </h2>
          <span className="rounded-full bg-indigo-100 dark:bg-indigo-950 px-2.5 py-0.5 text-xs font-bold text-indigo-600 dark:text-indigo-300">
            {totalItems} item
          </span>
        </div>

        {cart.length > 0 && (
          <button
            onClick={onClearCart}
            className="text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 transition-colors"
          >
            Kosongkan
          </button>
        )}
      </div>

      {/* Cart Item List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center p-4">
            <ShoppingBag className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-2 stroke-[1.5]" />
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
              Keranjang masih kosong
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Pilih produk di samping untuk ditambahkan
            </p>
          </div>
        ) : (
          cart.map((item) => (
            <div
              key={item.product.id}
              className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/50 gap-3"
            >
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-800 dark:text-slate-200 text-sm truncate">
                  {item.product.name}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Rp {item.unit_price.toLocaleString('id-ID')} / {item.product.unit}
                </p>
                <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                  Subtotal: Rp {(item.unit_price * item.quantity).toLocaleString('id-ID')}
                </p>
              </div>

              {/* Quantity controls */}
              <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-1">
                <button
                  onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                  className="rounded p-1 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <input
                  type="number"
                  min="1"
                  max={item.store_stock}
                  value={item.quantity}
                  onChange={(e) =>
                    onUpdateQuantity(item.product.id, parseInt(e.target.value) || 1)
                  }
                  className="w-10 text-center text-xs font-bold bg-transparent focus:outline-none text-slate-900 dark:text-white"
                />
                <button
                  onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                  disabled={item.quantity >= item.store_stock}
                  className="rounded p-1 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 disabled:opacity-40"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>

              <button
                onClick={() => onRemoveItem(item.product.id)}
                className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                title="Hapus produk"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Footer Total & Checkout */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">
            Total Tagihan
          </span>
          <span className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400">
            Rp {totalAmount.toLocaleString('id-ID')}
          </span>
        </div>

        <button
          onClick={onOpenCheckout}
          disabled={cart.length === 0}
          className="w-full flex items-center justify-between px-4 rounded-xl bg-indigo-600 py-3 text-sm font-extrabold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 active:scale-[0.99] disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-slate-800 dark:disabled:text-slate-600 disabled:shadow-none transition-all"
        >
          <span>Bayar & Checkout</span>
          <span className="rounded bg-indigo-500/80 px-2 py-0.5 text-[11px] font-mono font-bold text-indigo-100">
            F2
          </span>
        </button>
      </div>
    </div>
  );
}
