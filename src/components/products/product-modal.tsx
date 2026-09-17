'use client';

import React, { useState } from 'react';
import { Category, Product } from '@/types';
import { StorageService } from '@/lib/storage-service';
import { X, Save, AlertCircle } from 'lucide-react';

interface ProductModalProps {
  isOpen: boolean;
  product?: Product | null;
  categories: Category[];
  onClose: () => void;
  onSave: () => void;
}

export function ProductModal({
  isOpen,
  product,
  categories,
  onClose,
  onSave,
}: ProductModalProps) {
  if (!isOpen) return null;

  return (
    <ProductModalForm
      product={product}
      categories={categories}
      onClose={onClose}
      onSave={onSave}
    />
  );
}

function ProductModalForm({
  product,
  categories,
  onClose,
  onSave,
}: {
  product?: Product | null;
  categories: Category[];
  onClose: () => void;
  onSave: () => void;
}) {
  const [name, setName] = useState(product?.name || '');
  const [sku, setSku] = useState(() => product?.sku || 'SKU-AUTO');
  const [barcode, setBarcode] = useState(product?.barcode || '');
  const [categoryId, setCategoryId] = useState(product?.category_id || categories[0]?.id || '');
  const [unit, setUnit] = useState(product?.unit || 'pcs');
  const [purchasePrice, setPurchasePrice] = useState<number>(product?.purchase_price || 0);
  const [sellingPrice, setSellingPrice] = useState<number>(product?.selling_price || 0);
  const [minimumStock, setMinimumStock] = useState<number>(product?.minimum_stock ?? 5);
  const [isActive, setIsActive] = useState(product?.is_active ?? true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg('Nama produk wajib diisi');
      return;
    }
    if (sellingPrice < 0 || purchasePrice < 0) {
      setErrorMsg('Harga tidak boleh negatif');
      return;
    }

    try {
      const finalSku = sku === 'SKU-AUTO' ? `SKU-${Date.now().toString().slice(-6)}` : sku;
      StorageService.saveProduct({
        id: product?.id,
        name: name.trim(),
        sku: finalSku.trim(),
        barcode: barcode.trim() || null,
        category_id: categoryId || null,
        unit: unit.trim() || 'pcs',
        purchase_price: purchasePrice,
        selling_price: sellingPrice,
        minimum_stock: minimumStock,
        is_active: isActive,
      });

      onSave();
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Gagal menyimpan produk');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
            {product ? 'Edit Produk' : 'Tambah Produk Baru'}
          </h3>
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

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Nama Produk *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Aqua 600ml"
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                SKU *
              </label>
              <input
                type="text"
                required
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Barcode (Opsional)
              </label>
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="Scan / ketik barcode"
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Kategori
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Satuan (Unit)
              </label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="pcs, botol, bungkus"
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Harga Beli (Modal Rp)
              </label>
              <input
                type="number"
                min="0"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(Number(e.target.value) || 0)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Harga Jual (Rp) *
              </label>
              <input
                type="number"
                min="0"
                required
                value={sellingPrice}
                onChange={(e) => setSellingPrice(Number(e.target.value) || 0)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Minimum Stock (Alert)
              </label>
              <input
                type="number"
                min="0"
                value={minimumStock}
                onChange={(e) => setMinimumStock(Number(e.target.value) || 0)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Produk Aktif (Bisa Dijual)</span>
              </label>
            </div>
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
              <Save className="h-4 w-4" />
              <span>Simpan Produk</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
