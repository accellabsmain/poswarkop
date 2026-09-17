'use client';

import React, { useState, useCallback } from 'react';
import { StorageService } from '@/lib/storage-service';
import { Product } from '@/types';
import { ProductModal } from '@/components/products/product-modal';
import { useAuth } from '@/context/auth-context';
import { Search, Plus, Edit, Package, Layers } from 'lucide-react';

export default function ProductsPage() {
  const { isManager } = useAuth();

  const getProductsData = useCallback(() => {
    return {
      products: StorageService.getProducts(),
      categories: StorageService.getCategories(),
    };
  }, []);

  const [data, setData] = useState(getProductsData);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const loadData = useCallback(() => {
    setData(getProductsData());
  }, [getProductsData]);

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (prod: Product) => {
    setEditingProduct(prod);
    setIsModalOpen(true);
  };

  const { products, categories } = data;

  const filteredProducts = products.filter((p) => {
    const matchesCategory =
      selectedCategory === 'all' || p.category_id === selectedCategory;

    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      p.name.toLowerCase().includes(query) ||
      p.sku.toLowerCase().includes(query) ||
      (p.barcode && p.barcode.toLowerCase().includes(query));

    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Package className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            <span>Katalog Produk Master</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Data produk master bersifat global dan dapat digunakan oleh 3 toko.
          </p>
        </div>

        {isManager && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 active:scale-[0.98] transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Tambah Produk Baru</span>
          </button>
        )}
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari berdasarkan nama produk, SKU, atau barcode..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Layers className="h-4 w-4 text-slate-400 shrink-0" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full sm:w-auto rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm font-semibold text-slate-800 focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <option value="all">Semua Kategori</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Products Table / Cards */}
      <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3">Produk</th>
                <th className="px-4 py-3">SKU & Barcode</th>
                <th className="px-4 py-3">Kategori</th>
                <th className="px-4 py-3 text-right">Harga Modal</th>
                <th className="px-4 py-3 text-right">Harga Jual</th>
                <th className="px-4 py-3 text-center">Min Stok</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Tidak ada produk ditemukan.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((prod) => (
                  <tr
                    key={prod.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-900 dark:text-white">
                        {prod.name}
                      </p>
                      <p className="text-xs text-slate-400">Satuan: {prod.unit}</p>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <p className="font-mono font-bold text-slate-700 dark:text-slate-300">
                        {prod.sku}
                      </p>
                      {prod.barcode && (
                        <p className="text-slate-400">{prod.barcode}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold">
                      {prod.category_name || 'Uncategorized'}
                    </td>
                    <td className="px-4 py-3 text-right text-xs font-mono">
                      Rp {prod.purchase_price.toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-3 text-right font-extrabold text-indigo-600 dark:text-indigo-400 font-mono">
                      Rp {prod.selling_price.toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-xs">
                      {prod.minimum_stock} {prod.unit}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          prod.is_active
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                            : 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
                        }`}
                      >
                        {prod.is_active ? 'Aktif' : 'Non-Aktif'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isManager && (
                        <button
                          onClick={() => handleOpenEdit(prod)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        >
                          <Edit className="h-3.5 w-3.5" />
                          <span>Edit</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product Modal */}
      <ProductModal
        isOpen={isModalOpen}
        product={editingProduct}
        categories={categories}
        onClose={() => setIsModalOpen(false)}
        onSave={loadData}
      />
    </div>
  );
}
