'use client';

import React, { useState, useCallback } from 'react';
import { useStore } from '@/context/store-context';
import { useAuth } from '@/context/auth-context';
import { StorageService } from '@/lib/storage-service';
import { InventoryItem, Product } from '@/types';
import { StatusBadge } from '@/components/ui/badge';
import { StockAdjustModal } from '@/components/inventory/stock-adjust-modal';
import { StockTransferModal } from '@/components/inventory/stock-transfer-modal';
import { Boxes, Sliders, History, Search, RefreshCw, ArrowRightLeft, Download } from 'lucide-react';
import { exportInventoryToCSV } from '@/lib/export-utils';

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

  const handleExportCSV = () => {
    exportInventoryToCSV(data.inventory, activeStore.name);
  };

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
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f1f4f7] border border-[#dee3e9] px-3.5 py-1 text-xs font-bold text-[#0a1317] mb-2">
            Toko: {activeStore.name} ({activeStore.code})
          </span>
          <h1 className="text-2xl font-black tracking-tight text-[#0a1317] flex items-center gap-2.5">
            <Boxes className="h-7 w-7 text-[#0064e0]" />
            <span>Manajemen Stok & Inventory</span>
          </h1>
          <p className="text-xs font-semibold text-[#5d6c7b] mt-1">
            Stok tersimpan terpisah per toko. Setiap perubahan menghasilkan catatan audit histori.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="flex items-center justify-center gap-2 rounded-full bg-[#0a1317] hover:bg-[#1c1e21] px-5 py-2.5 text-xs font-extrabold text-white shadow-sm transition-all"
          >
            <Download className="h-4 w-4" />
            <span>Ekspor Stok (CSV)</span>
          </button>

          {isManager && (
            <button
              onClick={() => setIsTransferOpen(true)}
              className="flex items-center justify-center gap-2 rounded-full bg-[#0064e0] hover:bg-[#0457cb] px-5 py-2.5 text-xs font-extrabold text-white shadow-md shadow-[#0064e0]/20 transition-all"
            >
              <ArrowRightLeft className="h-4 w-4" />
              <span>Transfer Stok Antar Toko</span>
            </button>
          )}

          <button
            onClick={loadData}
            className="flex items-center justify-center gap-2 rounded-full border border-[#dee3e9] bg-[#f1f4f7] hover:bg-white px-4 py-2.5 text-xs font-bold text-[#0a1317] transition-all"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh Data</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[#dee3e9] pb-3">
        <button
          onClick={() => setActiveTab('balance')}
          className={`flex items-center gap-2 rounded-full px-5 py-2 text-xs font-extrabold transition-all ${
            activeTab === 'balance'
              ? 'bg-[#0a1317] text-white shadow-sm'
              : 'bg-white text-[#5d6c7b] border border-[#dee3e9] hover:bg-[#f1f4f7]'
          }`}
        >
          <Boxes className="h-4 w-4" />
          <span>Saldo Stok Toko ({filteredInventory.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('movements')}
          className={`flex items-center gap-2 rounded-full px-5 py-2 text-xs font-extrabold transition-all ${
            activeTab === 'movements'
              ? 'bg-[#0a1317] text-white shadow-sm'
              : 'bg-white text-[#5d6c7b] border border-[#dee3e9] hover:bg-[#f1f4f7]'
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
            <Search className="absolute left-4 top-3.5 h-4 w-4 text-[#8595a4]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari produk di inventory toko ini..."
              className="w-full max-w-md rounded-full border border-[#dee3e9] bg-[#f1f4f7] pl-11 pr-4 py-2.5 text-sm font-medium text-[#0a1317] focus:border-[#0064e0] focus:bg-white focus:outline-none transition-all shadow-xs"
            />
          </div>

          <div className="rounded-3xl border border-[#dee3e9] bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-[#1c1e21]">
                <thead className="bg-[#f1f4f7] text-xs font-black uppercase tracking-wider text-[#0a1317] border-b border-[#dee3e9]">
                  <tr>
                    <th className="px-5 py-4">Produk</th>
                    <th className="px-5 py-4">SKU</th>
                    <th className="px-5 py-4 text-center">Batas Min Stok</th>
                    <th className="px-5 py-4 text-right">Stok Toko Saat Ini</th>
                    <th className="px-5 py-4 text-center">Status Stok</th>
                    <th className="px-5 py-4 text-right">Aksi Penyesuaian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#dee3e9]">
                  {filteredInventory.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-xs font-bold text-[#8595a4]">
                        Tidak ada data stok produk.
                      </td>
                    </tr>
                  ) : (
                    filteredInventory.map((item) => (
                      <tr
                        key={item.id}
                        className="hover:bg-[#f1f4f7]/70 transition-colors"
                      >
                        <td className="px-5 py-4">
                          <p className="font-extrabold text-[#0a1317]">
                            {item.product.name}
                          </p>
                          <p className="text-xs font-medium text-[#5d6c7b]">
                            {item.product.category_name || 'Umum'}
                          </p>
                        </td>
                        <td className="px-5 py-4 font-mono text-xs font-bold text-[#0a1317]">
                          {item.product.sku}
                        </td>
                        <td className="px-5 py-4 text-center font-bold text-xs text-[#0a1317]">
                          {item.product.minimum_stock} {item.product.unit}
                        </td>
                        <td className="px-5 py-4 text-right font-black text-base text-[#0a1317]">
                          {item.quantity} {item.product.unit}
                        </td>
                        <td className="px-5 py-4 text-center">
                          <StatusBadge status={item.status} />
                        </td>
                        <td className="px-5 py-4 text-right">
                          {isManager && (
                            <button
                              onClick={() => handleOpenAdjust(item)}
                              className="inline-flex items-center gap-1.5 rounded-full border border-[#dee3e9] bg-[#f1f4f7] hover:bg-white px-3.5 py-1.5 text-xs font-extrabold text-[#0a1317] transition-all"
                            >
                              <Sliders className="h-3.5 w-3.5 text-[#0064e0]" />
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
        <div className="rounded-3xl border border-[#dee3e9] bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-[#1c1e21]">
              <thead className="bg-[#f1f4f7] text-xs font-black uppercase tracking-wider text-[#0a1317] border-b border-[#dee3e9]">
                <tr>
                  <th className="px-5 py-4">Tanggal / Waktu</th>
                  <th className="px-5 py-4">Produk</th>
                  <th className="px-5 py-4 text-center">Tipe Aktivitas</th>
                  <th className="px-5 py-4 text-right">Jumlah Perubahan</th>
                  <th className="px-5 py-4">Catatan / Keterangan</th>
                  <th className="px-5 py-4">Petugas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#dee3e9]">
                {data.movements.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-xs font-bold text-[#8595a4]">
                      Belum ada histori gerakan stok di toko ini.
                    </td>
                  </tr>
                ) : (
                  data.movements.map((mov) => (
                    <tr key={mov.id} className="hover:bg-[#f1f4f7]/70 transition-colors">
                      <td className="px-5 py-4 text-xs font-medium text-[#5d6c7b]">
                        {new Date(mov.created_at).toLocaleString('id-ID', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </td>
                      <td className="px-5 py-4 font-extrabold text-[#0a1317]">
                        {mov.product_name}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-0.5 text-xs font-extrabold ${
                            mov.type === 'SALE'
                              ? 'bg-[#e41e3f] text-white'
                              : mov.type === 'PURCHASE' || mov.type === 'TRANSFER_IN'
                              ? 'bg-[#31a24c] text-white'
                              : 'bg-[#f7b928] text-[#0a1317]'
                          }`}
                        >
                          {mov.type}
                        </span>
                      </td>
                      <td
                        className={`px-5 py-4 text-right font-black ${
                          mov.quantity > 0
                            ? 'text-[#31a24c]'
                            : 'text-[#e41e3f]'
                        }`}
                      >
                        {mov.quantity > 0 ? `+${mov.quantity}` : mov.quantity}
                      </td>
                      <td className="px-5 py-4 text-xs font-medium text-[#5d6c7b]">
                        {mov.notes || '-'}
                      </td>
                      <td className="px-5 py-4 text-xs font-bold text-[#0a1317]">
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
