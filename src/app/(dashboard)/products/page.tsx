'use client';

import React, { useState, useCallback } from 'react';
import { StorageService } from '@/lib/storage-service';
import { Product } from '@/types';
import { ProductModal } from '@/components/products/product-modal';
import { useAuth } from '@/context/auth-context';
import { Search, Plus, Edit, Package, Layers, ShieldAlert } from 'lucide-react';

export default function ProductsPage() {
  const { isManager } = useAuth();

  if (!isManager) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#e41e3f]/10 text-[#e41e3f] mb-4">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-black text-[#0a1317]">Akses Dibatasi</h2>
        <p className="mt-1 text-sm font-medium text-[#5d6c7b] max-w-md">
          Halaman Katalog Produk hanya dapat diakses oleh role <strong>Manager</strong> atau <strong>Owner</strong>.
        </p>
      </div>
    );
  }

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
          <h1 className="text-2xl font-black tracking-tight text-[#0a1317] flex items-center gap-2.5">
            <Package className="h-7 w-7 text-[#0064e0]" />
            <span>Katalog Produk Master</span>
          </h1>
          <p className="text-xs font-semibold text-[#5d6c7b] mt-1">
            Data produk master bersifat global dan dapat digunakan oleh 3 toko.
          </p>
        </div>

        {isManager && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center justify-center gap-2 rounded-full bg-[#0064e0] hover:bg-[#0457cb] px-5 py-3 text-xs font-extrabold text-white shadow-md shadow-[#0064e0]/20 active:scale-98 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Tambah Produk Baru</span>
          </button>
        )}
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center gap-4 rounded-3xl border border-[#dee3e9] bg-white p-5 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-3.5 h-4 w-4 text-[#8595a4]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari berdasarkan nama produk, SKU, atau barcode..."
            className="w-full rounded-full border border-[#dee3e9] bg-[#f1f4f7] pl-11 pr-4 py-3 text-sm font-medium text-[#0a1317] focus:border-[#0064e0] focus:bg-white focus:outline-none transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Layers className="h-4 w-4 text-[#8595a4] shrink-0" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full sm:w-auto rounded-full border border-[#dee3e9] bg-[#f1f4f7] px-4 py-3 text-xs font-extrabold text-[#0a1317] focus:border-[#0064e0] focus:outline-none cursor-pointer"
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

      {/* Products Table */}
      <div className="rounded-3xl border border-[#dee3e9] bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-[#1c1e21]">
            <thead className="bg-[#f1f4f7] text-xs font-black uppercase tracking-wider text-[#0a1317] border-b border-[#dee3e9]">
              <tr>
                <th className="px-5 py-4">Produk</th>
                <th className="px-5 py-4">SKU & Barcode</th>
                <th className="px-5 py-4">Kategori</th>
                <th className="px-5 py-4 text-right">Harga Modal</th>
                <th className="px-5 py-4 text-right">Harga Jual</th>
                <th className="px-5 py-4 text-center">Min Stok</th>
                <th className="px-5 py-4 text-center">Status</th>
                <th className="px-5 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#dee3e9]">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-xs font-bold text-[#8595a4]">
                    Tidak ada produk ditemukan.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((prod) => (
                  <tr
                    key={prod.id}
                    className="hover:bg-[#f1f4f7]/70 transition-colors"
                  >
                    <td className="px-5 py-4">
                      <p className="font-extrabold text-[#0a1317]">
                        {prod.name}
                      </p>
                      <p className="text-xs font-medium text-[#5d6c7b]">Satuan: {prod.unit}</p>
                    </td>
                    <td className="px-5 py-4 text-xs">
                      <p className="font-mono font-bold text-[#0a1317]">
                        {prod.sku}
                      </p>
                      {prod.barcode && (
                        <p className="text-[#5d6c7b]">{prod.barcode}</p>
                      )}
                    </td>
                    <td className="px-5 py-4 text-xs font-bold text-[#5d6c7b]">
                      {prod.category_name || 'Uncategorized'}
                    </td>
                    <td className="px-5 py-4 text-right text-xs font-mono font-medium text-[#5d6c7b]">
                      Rp {prod.purchase_price.toLocaleString('id-ID')}
                    </td>
                    <td className="px-5 py-4 text-right font-black text-[#0064e0] font-mono text-sm">
                      Rp {prod.selling_price.toLocaleString('id-ID')}
                    </td>
                    <td className="px-5 py-4 text-center font-bold text-xs text-[#0a1317]">
                      {prod.minimum_stock} {prod.unit}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-0.5 text-xs font-bold ${
                          prod.is_active
                            ? 'bg-[#31a24c] text-white'
                            : 'bg-[#e41e3f] text-white'
                        }`}
                      >
                        {prod.is_active ? 'Aktif' : 'Non-Aktif'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      {isManager && (
                        <button
                          onClick={() => handleOpenEdit(prod)}
                          className="inline-flex items-center gap-1.5 rounded-full border border-[#dee3e9] bg-[#f1f4f7] hover:bg-white px-3 py-1.5 text-xs font-extrabold text-[#0a1317] transition-all"
                        >
                          <Edit className="h-3.5 w-3.5 text-[#0064e0]" />
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
