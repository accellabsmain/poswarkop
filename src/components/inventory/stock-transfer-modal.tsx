'use client';

import React, { useState } from 'react';
import { StorageService } from '@/lib/storage-service';
import { Store, Product } from '@/types';
import { ArrowRightLeft, X, Store as StoreIcon, Package, AlertCircle } from 'lucide-react';

interface StockTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentStoreId: string;
}

export function StockTransferModal({
  isOpen,
  onClose,
  onSuccess,
  currentStoreId,
}: StockTransferModalProps) {
  const stores: Store[] = StorageService.getStores();
  const products: Product[] = StorageService.getProducts();

  const [fromStoreId, setFromStoreId] = useState(currentStoreId);
  const [toStoreId, setToStoreId] = useState(
    stores.find((s) => s.id !== currentStoreId)?.id || stores[0]?.id || ''
  );
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');
  const [quantity, setQuantity] = useState<number>(1);
  const [notes, setNotes] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  // Calculate available stock at source store
  const sourceInventory = StorageService.getStoreInventory(fromStoreId);
  const targetItem = sourceInventory.find((i) => i.product_id === selectedProductId);
  const availableStock = targetItem ? targetItem.quantity : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (fromStoreId === toStoreId) {
      setErrorMsg('Toko tujuan tidak boleh sama dengan toko asal.');
      return;
    }

    if (quantity <= 0) {
      setErrorMsg('Jumlah transfer harus minimal 1.');
      return;
    }

    if (quantity > availableStock) {
      setErrorMsg(
        `Jumlah transfer (${quantity}) melebihi stok yang tersedia (${availableStock}) di toko asal.`
      );
      return;
    }

    try {
      setIsSubmitting(true);
      StorageService.transferStock({
        fromStoreId,
        toStoreId,
        productId: selectedProductId,
        quantity,
        notes: notes.trim() || undefined,
      });

      setIsSubmitting(false);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setIsSubmitting(false);
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Gagal melakukan transfer stok.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
              <ArrowRightLeft className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Transfer Stok Antar Toko
              </h3>
              <p className="text-[11px] text-slate-400">Pindahkan stok barang antar cabang toko</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 p-3 text-xs font-semibold text-rose-600 border border-rose-200 dark:border-rose-900">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* From Store */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Toko Asal (Sumber Stok)
            </label>
            <select
              value={fromStoreId}
              onChange={(e) => {
                setFromStoreId(e.target.value);
                if (e.target.value === toStoreId) {
                  const alt = stores.find((s) => s.id !== e.target.value);
                  if (alt) setToStoreId(alt.id);
                }
              }}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-indigo-600"
            >
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>

          {/* To Store */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Toko Tujuan (Penerima Stok)
            </label>
            <select
              value={toStoreId}
              onChange={(e) => setToStoreId(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-indigo-600"
            >
              {stores
                .filter((s) => s.id !== fromStoreId)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
            </select>
          </div>

          {/* Product Selection */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Pilih Produk
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-indigo-600"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Stok tersedia di toko asal:{' '}
              <span className="font-extrabold text-indigo-600 dark:text-indigo-400">
                {availableStock}
              </span>
            </p>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Jumlah Transfer
            </label>
            <input
              type="number"
              min={1}
              max={availableStock}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-extrabold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-indigo-600"
              required
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Catatan / Keterangan (Opsional)
            </label>
            <input
              type="text"
              placeholder="misal: Pasokan mingguan dari toko pusat"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-indigo-600"
            />
          </div>

          {/* Submit */}
          <div className="pt-3 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || availableStock <= 0}
              className="flex-1 rounded-xl bg-indigo-600 py-3 text-xs font-extrabold text-white shadow-lg shadow-indigo-600/25 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Memproses...' : 'Proses Transfer Stok'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
