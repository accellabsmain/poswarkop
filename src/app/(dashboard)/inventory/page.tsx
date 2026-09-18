'use client';

import React, { useState, useCallback } from 'react';
import { useStore } from '@/context/store-context';
import { useAuth } from '@/context/auth-context';
import { StorageService } from '@/lib/storage-service';
import { InventoryItem, Product } from '@/types';
import { StatusBadge } from '@/components/ui/badge';
import { StockAdjustModal } from '@/components/inventory/stock-adjust-modal';
import { StockTransferModal } from '@/components/inventory/stock-transfer-modal';
import { Boxes, Sliders, History, Search, RefreshCw, ArrowRightLeft } from 'lucide-react';

export default function InventoryPage() {
  const { activeStore } = useStore();
  const { isManager } = useAuth();

  const [activeTab, setActiveTab] = useState<'balance' | 'movements'>('balance');

  const getInventoryData = useCallback(() => {
    return {
      inventory: StorageService.getStoreInventory(activeStore.id),
      movements: StorageService.getStockMovements(activeStore.id),
    };
  }, [activeStore.id]);

  const [data, setData] = useState(getInventoryData);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected item for modal
  const [selectedItem, setSelectedItem] = useState<
    (InventoryItem & { product: Product }) | null
  >(null);
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);

  const loadData = useCallback(() => {
    setData(getInventoryData());
  }, [getInventoryData]);

  // Sync when active store changes
  React.useEffect(() => {
    setData(getInventoryData());
  }, [getInventoryData]);

  const handleOpenAdjust = (item: InventoryItem & { product: Product }) => {
    setSelectedItem(item);
    setIsAdjustOpen(true);
  };

  const filteredInventory = data.inventory.filter((item) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      item.product.name.toLowerCase().includes(query) ||
      item.product.sku.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 mb-1">
            Toko: {activeStore.name} ({activeStore.code})
          </span>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Boxes className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            <span>Manajemen Stok & Inventory</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Stok tersimpan terpisah per toko. Setiap perubahan menghasilkan catatan audit histori.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isManager && (
            <button
              onClick={() => setIsTransferOpen(true)}
              className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 active:scale-95 transition-all"
            >
              <ArrowRightLeft className="h-4 w-4" />
              <span>Transfer Stok Antar Toko</span>
            </button>
          )}

          <button
            onClick={loadData}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh Data</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('balance')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-extrabold transition-all ${
            activeTab === 'balance'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Boxes className="h-4 w-4" />
          <span>Saldo Stok Toko ({filteredInventory.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('movements')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-extrabold transition-all ${
            activeTab === 'movements'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <History className="h-4 w-4" />
          <span>Histori Stock Movements ({data.movements.length})</span>
        </button>
      </div>

      {/* TAB 1: INVENTORY BALANCE */}
      {activeTab === 'balance' && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari produk di inventory toko ini..."
              className="w-full max-w-md rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white shadow-sm"
            />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Produk</th>
                    <th className="px-4 py-3">SKU</th>
                    <th className="px-4 py-3 text-center">Batas Min Stok</th>
                    <th className="px-4 py-3 text-right">Stok Toko Saat Ini</th>
                    <th className="px-4 py-3 text-center">Status Stok</th>
                    <th className="px-4 py-3 text-right">Aksi Penyesuaian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredInventory.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        Tidak ada data stok produk.
                      </td>
                    </tr>
                  ) : (
                    filteredInventory.map((item) => (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <p className="font-bold text-slate-900 dark:text-white">
                            {item.product.name}
                          </p>
                          <p className="text-xs text-slate-400">
                            {item.product.category_name || 'Umum'}
                          </p>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                          {item.product.sku}
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-xs">
                          {item.product.minimum_stock} {item.product.unit}
                        </td>
                        <td className="px-4 py-3 text-right font-black text-base text-slate-900 dark:text-white">
                          {item.quantity} {item.product.unit}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <StatusBadge status={item.status} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          {isManager && (
                            <button
                              onClick={() => handleOpenAdjust(item)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                            >
                              <Sliders className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                              <span>Adjust Stok</span>
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
        </div>
      )}

      {/* TAB 2: STOCK MOVEMENTS AUDIT LOG */}
      {activeTab === 'movements' && (
        <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Tanggal / Waktu</th>
                  <th className="px-4 py-3">Produk</th>
                  <th className="px-4 py-3 text-center">Tipe Aktivitas</th>
                  <th className="px-4 py-3 text-right">Jumlah Perubahan</th>
                  <th className="px-4 py-3">Catatan / Keterangan</th>
                  <th className="px-4 py-3">Petugas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.movements.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      Belum ada histori gerakan stok di toko ini.
                    </td>
                  </tr>
                ) : (
                  data.movements.map((mov) => (
                    <tr key={mov.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 text-xs font-medium text-slate-500">
                        {new Date(mov.created_at).toLocaleString('id-ID', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                        {mov.product_name}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-extrabold ${
                            mov.type === 'SALE'
                              ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
                              : mov.type === 'PURCHASE' || mov.type === 'TRANSFER_IN'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                          }`}
                        >
                          {mov.type}
                        </span>
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-black ${
                          mov.quantity > 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {mov.quantity > 0 ? `+${mov.quantity}` : mov.quantity}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">
                        {mov.notes || '-'}
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold">
                        {mov.user_name || 'Sistem'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      <StockAdjustModal
        isOpen={isAdjustOpen}
        item={selectedItem}
        onClose={() => setIsAdjustOpen(false)}
        onSuccess={loadData}
      />

      {/* Stock Transfer Modal */}
      <StockTransferModal
        isOpen={isTransferOpen}
        currentStoreId={activeStore.id}
        onClose={() => setIsTransferOpen(false)}
        onSuccess={loadData}
      />
    </div>
  );
}
