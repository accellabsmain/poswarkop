'use client';

import React, { useState } from 'react';
import { InventoryItem, Product } from '@/types';
import { StorageService } from '@/lib/storage-service';
import { useStore } from '@/context/store-context';
import { useAuth } from '@/context/auth-context';
import { X, Check, AlertCircle } from 'lucide-react';

interface StockAdjustModalProps {
  isOpen: boolean;
  item: (InventoryItem & { product: Product }) | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function StockAdjustModal({
  isOpen,
  item,
  onClose,
  onSuccess,
}: StockAdjustModalProps) {
  if (!isOpen || !item) return null;

  return (
    <StockAdjustForm
      item={item}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}

function StockAdjustForm({
  item,
  onClose,
  onSuccess,
}: {
  item: InventoryItem & { product: Product };
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { activeStore } = useStore();
  const { user } = useAuth();

  const [newQuantity, setNewQuantity] = useState<number>(item.quantity);
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (newQuantity < 0) {
      setErrorMsg('Stok tidak boleh bernilai negatif');
      return;
    }

    try {
      StorageService.adjustStock({
        storeId: activeStore.id,
        productId: item.product_id,
        newQuantity,
        notes: notes.trim() || 'Penyesuaian stok manual',
        userId: user.id,
      });

      onSuccess();
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Gagal memperbarui stok');
      }
    }
  };

  const diff = newQuantity - item.quantity;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a1317]/50 p-4 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-[#dee3e9]">
        <div className="flex items-center justify-between pb-4 border-b border-[#dee3e9]">
          <div>
            <h3 className="text-lg font-black text-[#0a1317]">
              Penyesuaian Stok (Adjustment)
            </h3>
            <p className="text-xs font-semibold text-[#5d6c7b]">
              Toko: <span className="font-extrabold text-[#0064e0]">{activeStore.name}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-[#5d6c7b] hover:bg-[#f1f4f7] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-[#e41e3f]/10 border border-[#e41e3f]/20 p-3.5 text-xs font-bold text-[#e41e3f]">
            <AlertCircle className="h-4 w-4 shrink-0 text-[#e41e3f]" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="mt-4 rounded-2xl bg-[#f1f4f7] p-4 border border-[#dee3e9]">
          <p className="text-[11px] font-extrabold text-[#5d6c7b] uppercase tracking-wider">
            {item.product.category_name || 'Produk'}
          </p>
          <p className="text-base font-black text-[#0a1317]">
            {item.product.name}
          </p>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-[#5d6c7b] font-medium">Stok Saat Ini:</span>
            <span className="font-black text-[#0a1317]">
              {item.quantity} {item.product.unit}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#0a1317] mb-1">
              Jumlah Stok Baru ({item.product.unit}) *
            </label>
            <input
              type="number"
              min="0"
              required
              value={newQuantity}
              onChange={(e) => setNewQuantity(parseInt(e.target.value) || 0)}
              className="w-full rounded-2xl border border-[#dee3e9] bg-[#f1f4f7] px-4 py-3 text-base font-black text-[#0a1317] focus:border-[#0064e0] focus:bg-white focus:outline-none transition-all"
            />
            {diff !== 0 && (
              <p
                className={`mt-1.5 text-xs font-extrabold ${
                  diff > 0 ? 'text-[#31a24c]' : 'text-[#e41e3f]'
                }`}
              >
                Perubahan: {diff > 0 ? `+${diff}` : diff} {item.product.unit}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-[#0a1317] mb-1">
              Alasan / Catatan Penyesuaian *
            </label>
            <textarea
              rows={2}
              required
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Stok opname bulanan, barang rusak, dsb."
              className="w-full rounded-2xl border border-[#dee3e9] bg-[#f1f4f7] px-4 py-3 text-xs font-medium text-[#0a1317] focus:border-[#0064e0] focus:bg-white focus:outline-none transition-all"
            />
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-[#dee3e9]">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-5 py-3 text-xs font-bold text-[#0a1317] hover:bg-[#f1f4f7] transition-all"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 rounded-full bg-[#0064e0] hover:bg-[#0457cb] px-6 py-3 text-xs font-extrabold text-white shadow-md shadow-[#0064e0]/20 active:scale-98 transition-all"
            >
              <Check className="h-4 w-4" />
              <span>Simpan Penyesuaian</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
