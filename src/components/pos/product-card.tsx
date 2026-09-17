'use client';

import React from 'react';
import { Product, ProductStatus } from '@/types';
import { StatusBadge } from '@/components/ui/badge';
import { Plus, PackageX } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  storeStock: number;
  status: ProductStatus;
  onAddToCart: (product: Product, storeStock: number) => void;
}

export function ProductCard({
  product,
  storeStock,
  status,
  onAddToCart,
}: ProductCardProps) {
  const isOutOfStock = storeStock <= 0 || !product.is_active;

  return (
    <div
      className={`group relative flex flex-col justify-between rounded-2xl border p-4 transition-all duration-200 shadow-sm ${
        isOutOfStock
          ? 'border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-900/40 opacity-75'
          : 'border-slate-200 bg-white hover:border-indigo-400 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500'
      }`}
    >
      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            {product.category_name || 'Umum'}
          </span>
          <StatusBadge status={status} />
        </div>

        <h3 className="font-bold text-slate-900 dark:text-white line-clamp-2 text-base group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
          {product.name}
        </h3>

        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          SKU: {product.sku}
        </p>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-400 dark:text-slate-500">Stok Toko</p>
          <p
            className={`text-sm font-bold ${
              isOutOfStock ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200'
            }`}
          >
            {storeStock} {product.unit}
          </p>
        </div>

        <div className="text-right">
          <p className="text-xs text-slate-400 dark:text-slate-500">Harga</p>
          <p className="text-base font-extrabold text-indigo-600 dark:text-indigo-400">
            Rp {product.selling_price.toLocaleString('id-ID')}
          </p>
        </div>
      </div>

      <button
        onClick={() => onAddToCart(product, storeStock)}
        disabled={isOutOfStock}
        className={`mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 px-3 text-sm font-bold transition-all ${
          isOutOfStock
            ? 'bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed'
            : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-[0.98] shadow-sm shadow-indigo-600/20'
        }`}
      >
        {isOutOfStock ? (
          <>
            <PackageX className="h-4 w-4" />
            <span>Stok Habis</span>
          </>
        ) : (
          <>
            <Plus className="h-4 w-4" />
            <span>Tambah</span>
          </>
        )}
      </button>
    </div>
  );
}
