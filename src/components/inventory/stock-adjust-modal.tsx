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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
              Penyesuaian Stok (Adjustment)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Toko: <span className="font-semibold text-indigo-600 dark:text-indigo-400">{activeStore.name}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-700 dark:bg-rose-950/50 dark:border-rose-800 dark:text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="mt-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3.5 border border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold">
            {item.product.category_name || 'Produk'}
          </p>
          <p className="text-base font-extrabold text-slate-900 dark:text-white">
            {item.product.name}
          </p>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">Stok Saat Ini:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {item.quantity} {item.product.unit}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Jumlah Stok Baru ({item.product.unit}) *
            </label>
            <input
              type="number"
              min="0"
              required
              value={newQuantity}
              onChange={(e) => setNewQuantity(parseInt(e.target.value) || 0)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-base font-bold text-slate-900 focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
            {diff !== 0 && (
              <p
                className={`mt-1 text-xs font-bold ${
                  diff > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                Perubahan: {diff > 0 ? `+${diff}` : diff} {item.product.unit}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Alasan / Catatan Penyesuaian *
            </label>
            <textarea
              rows={2}
              required
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Stok opname bulanan, barang rusak, dsb."
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-extrabold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700"
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
