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
  const [imageUrl, setImageUrl] = useState(product?.image_url || '');
  const [isActive, setIsActive] = useState(product?.is_active ?? true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setErrorMsg('Ukuran gambar maksimal 2 MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

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
        image_url: imageUrl.trim() || null,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a1317]/50 p-4 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-[#dee3e9]">
        <div className="flex items-center justify-between pb-4 border-b border-[#dee3e9]">
          <h3 className="text-lg font-black text-[#0a1317]">
            {product ? 'Edit Produk Master' : 'Tambah Produk Baru'}
          </h3>
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

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-[#0a1317] mb-1">
              Nama Produk *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Aqua 600ml"
              className="w-full rounded-2xl border border-[#dee3e9] bg-[#f1f4f7] px-4 py-3 text-sm font-medium text-[#0a1317] focus:border-[#0064e0] focus:bg-white focus:outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#0a1317] mb-1">
                SKU *
              </label>
              <input
                type="text"
                required
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="w-full rounded-2xl border border-[#dee3e9] bg-[#f1f4f7] px-4 py-3 text-sm font-bold text-[#0a1317] focus:border-[#0064e0] focus:bg-white focus:outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#0a1317] mb-1">
                Barcode (Opsional)
              </label>
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="Scan / ketik barcode"
                className="w-full rounded-2xl border border-[#dee3e9] bg-[#f1f4f7] px-4 py-3 text-sm font-medium text-[#0a1317] focus:border-[#0064e0] focus:bg-white focus:outline-none transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#0a1317] mb-1">
                Kategori
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-2xl border border-[#dee3e9] bg-[#f1f4f7] px-4 py-3 text-xs font-extrabold text-[#0a1317] focus:border-[#0064e0] focus:bg-white focus:outline-none cursor-pointer transition-all"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#0a1317] mb-1">
                Satuan (Unit)
              </label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="pcs, botol, bungkus"
                className="w-full rounded-2xl border border-[#dee3e9] bg-[#f1f4f7] px-4 py-3 text-sm font-medium text-[#0a1317] focus:border-[#0064e0] focus:bg-white focus:outline-none transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#0a1317] mb-1">
                Harga Beli (Modal Rp)
              </label>
              <input
                type="number"
                min="0"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(Number(e.target.value) || 0)}
                className="w-full rounded-2xl border border-[#dee3e9] bg-[#f1f4f7] px-4 py-3 text-sm font-bold text-[#0a1317] focus:border-[#0064e0] focus:bg-white focus:outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#0a1317] mb-1">
                Harga Jual (Rp) *
              </label>
              <input
                type="number"
                min="0"
                required
                value={sellingPrice}
                onChange={(e) => setSellingPrice(Number(e.target.value) || 0)}
                className="w-full rounded-2xl border border-[#dee3e9] bg-[#f1f4f7] px-4 py-3 text-sm font-black text-[#0064e0] focus:border-[#0064e0] focus:bg-white focus:outline-none transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#0a1317] mb-1">
                Minimum Stock (Alert)
              </label>
              <input
                type="number"
                min="0"
                value={minimumStock}
                onChange={(e) => setMinimumStock(Number(e.target.value) || 0)}
                className="w-full rounded-2xl border border-[#dee3e9] bg-[#f1f4f7] px-4 py-3 text-sm font-bold text-[#0a1317] focus:border-[#0064e0] focus:bg-white focus:outline-none transition-all"
              />
            </div>

            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-extrabold text-[#0a1317]">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-[#dee3e9] text-[#0064e0] focus:ring-[#0064e0]"
                />
                <span>Produk Aktif (Bisa Dijual)</span>
              </label>
            </div>
          </div>

          {/* Upload Foto Produk */}
          <div>
            <label className="block text-xs font-bold text-[#0a1317] mb-1">
              Foto / Gambar Produk
            </label>
            <div className="flex items-center gap-3">
              {imageUrl ? (
                <div className="relative h-12 w-12 rounded-2xl overflow-hidden border border-[#dee3e9] bg-[#f1f4f7] shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageUrl} alt="Preview" className="h-full w-full object-cover" />
                </div>
              ) : (
                <div className="h-12 w-12 rounded-2xl border border-dashed border-[#ced0d4] bg-[#f1f4f7] flex items-center justify-center text-[10px] text-[#8595a4] font-bold shrink-0">
                  No Pic
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="w-full text-xs text-[#5d6c7b] file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-extrabold file:bg-[#0a1317] file:text-white hover:file:bg-[#1c1e21] cursor-pointer"
              />
            </div>
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
              <Save className="h-4 w-4" />
              <span>Simpan Produk</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
