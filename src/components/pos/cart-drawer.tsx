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
    <div className="flex flex-col h-full bg-white rounded-3xl border border-[#dee3e9] shadow-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-[#dee3e9] bg-[#f1f4f7]">
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-5 w-5 text-[#0064e0]" />
          <h2 className="font-black text-[#0a1317] text-base">
            Keranjang Kasir
          </h2>
          <span className="rounded-full bg-[#0064e0] px-2.5 py-0.5 text-xs font-extrabold text-white">
            {totalItems} item
          </span>
        </div>

        {cart.length > 0 && (
          <button
            onClick={onClearCart}
            className="text-xs font-bold text-[#e41e3f] hover:underline transition-colors"
          >
            Kosongkan
          </button>
        )}
      </div>

      {/* Cart Item List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center p-4">
            <ShoppingBag className="h-12 w-12 text-[#8595a4] mb-2 stroke-[1.5]" />
            <p className="text-sm font-bold text-[#0a1317]">
              Keranjang masih kosong
            </p>
            <p className="text-xs text-[#5d6c7b] mt-1">
              Pilih produk di samping untuk ditambahkan
            </p>
          </div>
        ) : (
          cart.map((item) => (
            <div
              key={item.product.id}
              className="flex items-center justify-between p-3.5 rounded-2xl border border-[#dee3e9] bg-[#f1f4f7] gap-3"
            >
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[#0a1317] text-xs truncate">
                  {item.product.name}
                </p>
                <p className="text-[11px] text-[#5d6c7b]">
                  Rp {item.unit_price.toLocaleString('id-ID')} / {item.product.unit}
                </p>
                <p className="text-xs font-black text-[#0064e0] mt-0.5">
                  Subtotal: Rp {(item.unit_price * item.quantity).toLocaleString('id-ID')}
                </p>
              </div>

              {/* Quantity controls */}
              <div className="flex items-center gap-1 bg-white border border-[#dee3e9] rounded-full p-1 shadow-xs">
                <button
                  onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                  className="rounded-full p-1 text-[#0a1317] hover:bg-[#f1f4f7] transition-colors"
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
                  className="w-8 text-center text-xs font-black bg-transparent focus:outline-none text-[#0a1317]"
                />
                <button
                  onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                  disabled={item.quantity >= item.store_stock}
                  className="rounded-full p-1 text-[#0a1317] hover:bg-[#f1f4f7] disabled:opacity-40 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>

              <button
                onClick={() => onRemoveItem(item.product.id)}
                className="p-1 text-[#8595a4] hover:text-[#e41e3f] transition-colors"
                title="Hapus produk"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Footer Total & Checkout */}
      <div className="p-5 border-t border-[#dee3e9] bg-[#f1f4f7]">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-extrabold uppercase tracking-wider text-[#5d6c7b]">
            Total Tagihan
          </span>
          <span className="text-2xl font-black text-[#0064e0]">
            Rp {totalAmount.toLocaleString('id-ID')}
          </span>
        </div>

        <button
          onClick={onOpenCheckout}
          disabled={cart.length === 0}
          className="w-full flex items-center justify-between px-6 rounded-full bg-[#0064e0] hover:bg-[#0457cb] py-3.5 text-sm font-extrabold text-white shadow-lg shadow-[#0064e0]/20 active:scale-98 disabled:bg-[#dee3e9] disabled:text-[#8595a4] disabled:shadow-none transition-all"
        >
          <span>Bayar & Checkout</span>
          <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-mono font-bold text-white">
            F2
          </span>
        </button>
      </div>
    </div>
  );
}
