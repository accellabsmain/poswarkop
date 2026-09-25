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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-[#dee3e9]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#dee3e9]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0064e0]/10 text-[#0064e0]">
              <ArrowRightLeft className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#0a1317]">
                Transfer Stok Antar Toko
              </h3>
              <p className="text-xs text-slate-500">Pindahkan stok barang antar cabang toko</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-[#f1f4f7] hover:text-[#0a1317] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-rose-50 p-3 text-xs font-semibold text-rose-600 border border-rose-200">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* From Store */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
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
              className="w-full rounded-2xl border border-[#dee3e9] bg-[#f1f4f7] px-4 py-2.5 text-xs font-semibold text-[#0a1317] focus:bg-white focus:outline-none focus:border-[#0064e0] transition-colors"
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
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Toko Tujuan (Penerima Stok)
            </label>
            <select
              value={toStoreId}
              onChange={(e) => setToStoreId(e.target.value)}
              className="w-full rounded-2xl border border-[#dee3e9] bg-[#f1f4f7] px-4 py-2.5 text-xs font-semibold text-[#0a1317] focus:bg-white focus:outline-none focus:border-[#0064e0] transition-colors"
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
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Pilih Produk
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full rounded-2xl border border-[#dee3e9] bg-[#f1f4f7] px-4 py-2.5 text-xs font-semibold text-[#0a1317] focus:bg-white focus:outline-none focus:border-[#0064e0] transition-colors"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs font-medium text-slate-500">
              Stok tersedia di toko asal:{' '}
              <span className="font-bold text-[#0064e0]">
                {availableStock}
              </span>
            </p>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Jumlah Transfer
            </label>
            <input
              type="number"
              min={1}
              max={availableStock}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="w-full rounded-2xl border border-[#dee3e9] bg-[#f1f4f7] px-4 py-2.5 text-sm font-bold text-[#0a1317] focus:bg-white focus:outline-none focus:border-[#0064e0] transition-colors"
              required
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Catatan / Keterangan (Opsional)
            </label>
            <input
              type="text"
              placeholder="misal: Pasokan mingguan dari toko pusat"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-2xl border border-[#dee3e9] bg-[#f1f4f7] px-4 py-2.5 text-xs font-medium text-[#0a1317] focus:bg-white focus:outline-none focus:border-[#0064e0] transition-colors"
            />
          </div>

          {/* Submit */}
          <div className="pt-3 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-full border border-[#dee3e9] bg-white py-3 text-xs font-semibold text-slate-700 hover:bg-[#f1f4f7] transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || availableStock <= 0}
              className="flex-1 rounded-full bg-[#0064e0] py-3 text-xs font-semibold text-white shadow-sm hover:bg-[#0052b8] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Memproses...' : 'Proses Transfer Stok'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
