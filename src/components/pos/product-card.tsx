'use client';

import React from 'react';
import { Product, ProductStatus } from '@/types';
import { StatusBadge } from '@/components/ui/badge';
import { Plus, PackageX, ShoppingBag } from 'lucide-react';

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
      className={`group relative flex flex-col justify-between rounded-3xl border p-5 transition-all duration-200 ${
        isOutOfStock
          ? 'border-[#dee3e9] bg-[#f1f4f7]/60 opacity-80'
          : 'border-[#dee3e9] bg-white hover:border-[#0064e0] hover:shadow-md'
      }`}
    >
      <div>
        {/* Category & Status */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-[11px] font-extrabold text-[#5d6c7b] uppercase tracking-wider">
            {product.category_name || 'Umum'}
          </span>
          <StatusBadge status={status} />
        </div>

        {/* Product Image Thumbnail */}
        <div className="relative h-32 w-full rounded-2xl bg-[#f1f4f7] overflow-hidden mb-3.5 flex items-center justify-center border border-[#dee3e9]/60">
          {product.image_url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={product.image_url}
              alt={product.name}
              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="flex flex-col items-center gap-1 text-[#8595a4]">
              <ShoppingBag className="h-8 w-8 stroke-[1.5]" />
              <span className="text-[10px] font-bold">Produk</span>
            </div>
          )}
        </div>

        <h3 className="font-extrabold text-[#0a1317] line-clamp-2 text-sm group-hover:text-[#0064e0] transition-colors">
          {product.name}
        </h3>

        <p className="mt-1 text-[11px] font-medium text-[#5d6c7b]">
          SKU: {product.sku}
        </p>
      </div>

      <div className="mt-4 pt-3 border-t border-[#dee3e9]">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[11px] font-medium text-[#5d6c7b]">Stok Toko</p>
            <p
              className={`text-xs font-extrabold ${
                isOutOfStock ? 'text-[#e41e3f]' : 'text-[#0a1317]'
              }`}
            >
              {storeStock} {product.unit}
            </p>
          </div>

          <div className="text-right">
            <p className="text-[11px] font-medium text-[#5d6c7b]">Harga</p>
            <p className="text-base font-black text-[#0064e0]">
              Rp {product.selling_price.toLocaleString('id-ID')}
            </p>
          </div>
        </div>

        <button
          onClick={() => onAddToCart(product, storeStock)}
          disabled={isOutOfStock}
          className={`flex w-full items-center justify-center gap-2 rounded-full py-2.5 px-4 text-xs font-extrabold transition-all ${
            isOutOfStock
              ? 'bg-[#dee3e9] text-[#8595a4] cursor-not-allowed'
              : 'bg-[#0064e0] hover:bg-[#0457cb] text-white active:scale-98 shadow-sm shadow-[#0064e0]/20'
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
              <span>Tambah Ke Keranjang</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
