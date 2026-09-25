'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { useStore } from '@/context/store-context';
import { useAuth } from '@/context/auth-context';
import { StorageService } from '@/lib/storage-service';
import { StatusBadge } from '@/components/ui/badge';
import { exportSalesToCSV } from '@/lib/export-utils';
import { Store } from '@/types';
import {
  Banknote,
  Receipt,
  AlertTriangle,
  Package,
  ShoppingCart,
  ArrowRight,
  Boxes,
  Download,
  TrendingUp,
  Award,
  Store as StoreIcon,
  PieChart,
} from 'lucide-react';

export default function DashboardPage() {
  const { activeStore } = useStore();
  const { user } = useAuth();

  const stores: Store[] = StorageService.getStores();
  const [selectedFilterStoreId, setSelectedFilterStoreId] = useState<string>('all');

  const getDashboardData = useCallback(() => {
    const allSales = StorageService.getSales();
    const filteredSales =
      selectedFilterStoreId === 'all'
        ? allSales
        : allSales.filter((s) => s.store_id === selectedFilterStoreId);

    // Calculated metrics
    const totalRevenue = filteredSales.reduce((acc, s) => acc + s.total_amount, 0);
    const totalTransactions = filteredSales.length;

    // Total Items Sold calculation
    let totalItemsSold = 0;
    const productSalesMap: Record<
      string,
      { name: string; sku: string; units: number; revenue: number }
    > = {};

    filteredSales.forEach((sale) => {
      if (sale.items) {
        sale.items.forEach((item) => {
          totalItemsSold += item.quantity;

          if (!productSalesMap[item.product_id]) {
            productSalesMap[item.product_id] = {
              name: item.product_name || 'Produk',
              sku: item.product_id.slice(-6).toUpperCase(),
              units: 0,
              revenue: 0,
            };
          }
          productSalesMap[item.product_id].units += item.quantity;
          productSalesMap[item.product_id].revenue += item.subtotal;
        });
      }
    });

    const averageOrderValue =
      totalTransactions > 0 ? Math.round(totalRevenue / totalTransactions) : 0;

    // Top 5 Selling Products
    const topProducts = Object.values(productSalesMap)
      .sort((a, b) => b.units - a.units)
      .slice(0, 5);

    // Revenue per store breakdown (for comparison chart)
    const storeRevenueMap: Record<string, { store: Store; revenue: number; txCount: number }> = {};
    stores.forEach((s) => {
      storeRevenueMap[s.id] = { store: s, revenue: 0, txCount: 0 };
    });

    allSales.forEach((s) => {
      if (storeRevenueMap[s.store_id]) {
        storeRevenueMap[s.store_id].revenue += s.total_amount;
        storeRevenueMap[s.store_id].txCount += 1;
      }
    });

    const storeBreakdown = Object.values(storeRevenueMap);
    const grandTotalRevenue = allSales.reduce((acc, s) => acc + s.total_amount, 0) || 1;

    // Low stock items
    const inventory =
      selectedFilterStoreId === 'all'
        ? stores.flatMap((s) => StorageService.getStoreInventory(s.id))
        : StorageService.getStoreInventory(selectedFilterStoreId);

    const lowStockItems = inventory.filter(
      (item) => item.status === 'LOW_STOCK' || item.status === 'OUT_OF_STOCK'
    );

    const allProductsCount = StorageService.getProducts().length;

    return {
      sales: filteredSales,
      totalRevenue,
      totalTransactions,
      totalItemsSold,
      averageOrderValue,
      topProducts,
      storeBreakdown,
      grandTotalRevenue,
      lowStockItems,
      allProductsCount,
    };
  }, [selectedFilterStoreId, stores]);

  const [data, setData] = useState(getDashboardData);

  // Sync data on change
  React.useEffect(() => {
    setData(getDashboardData());
  }, [getDashboardData]);

  const {
    sales,
    totalRevenue,
    totalTransactions,
    totalItemsSold,
    averageOrderValue,
    topProducts,
    storeBreakdown,
    grandTotalRevenue,
    lowStockItems,
  } = data;

  const handleExportCSV = () => {
    const filterStoreName =
      selectedFilterStoreId === 'all'
        ? 'Semua Toko'
        : stores.find((s) => s.id === selectedFilterStoreId)?.name || 'Toko';
    exportSalesToCSV(sales, filterStoreName);
  };

  return (
    <div className="space-y-6">
      {/* Top Marketing Hero Banner - Meta Ink Deep Background */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 rounded-3xl bg-[#0a1317] p-8 text-white shadow-xl">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1 text-xs font-bold text-white mb-3 backdrop-blur">
            Toko Aktif: {activeStore.name} ({activeStore.code})
          </span>
          <h1 className="text-3xl font-black tracking-tight text-white">
            Selamat Datang, {user.full_name}!
          </h1>
          <p className="text-sm font-medium text-[#dee3e9] mt-2 max-w-xl">
            Ringkasan Performa Bisnis & Penjualan Multi-Toko (Toko Mas Budi, Warkop Ngombeku & Warkop Kakak).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 rounded-full border-2 border-white/20 hover:border-white bg-transparent px-5 py-3 text-xs font-extrabold text-white transition-all active:scale-98"
          >
            <Download className="h-4 w-4" />
            <span>Ekspor Laporan (CSV)</span>
          </button>

          <Link
            href="/pos"
            className="flex items-center gap-2 rounded-full bg-[#0064e0] hover:bg-[#0457cb] px-6 py-3 text-sm font-extrabold text-white shadow-lg shadow-[#0064e0]/30 transition-all active:scale-98"
          >
            <ShoppingCart className="h-4 w-4" />
            <span>Buka POS Kasir</span>
          </Link>
        </div>
      </div>

      {/* Multi-Store Scope Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-[#dee3e9] bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2.5">
          <StoreIcon className="h-5 w-5 text-[#0064e0]" />
          <span className="text-xs font-extrabold uppercase tracking-wider text-[#0a1317]">
            Scope Data Ringkasan:
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSelectedFilterStoreId('all')}
            className={`rounded-full px-4 py-2 text-xs font-bold transition-all ${
              selectedFilterStoreId === 'all'
                ? 'bg-[#0a1317] text-white shadow-sm'
                : 'bg-[#f1f4f7] text-[#1c1e21] border border-[#dee3e9] hover:bg-white'
            }`}
          >
            Semua Toko (Aggregated)
          </button>
          {stores.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedFilterStoreId(s.id)}
              className={`rounded-full px-4 py-2 text-xs font-bold transition-all ${
                selectedFilterStoreId === s.id
                  ? 'bg-[#0a1317] text-white shadow-sm'
                  : 'bg-[#f1f4f7] text-[#1c1e21] border border-[#dee3e9] hover:bg-white'
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>

      {/* 4 Primary KPI Metric Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Total Omset */}
        <div className="rounded-3xl border border-[#dee3e9] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-[#5d6c7b]">
              Total Omset Bisnis
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#31a24c]/10 text-[#31a24c]">
              <Banknote className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-4 text-2xl font-black text-[#0a1317]">
            Rp {totalRevenue.toLocaleString('id-ID')}
          </p>
          <p className="mt-1 text-xs text-[#5d6c7b] font-medium">
            {selectedFilterStoreId === 'all' ? 'Akumulasi seluruh toko' : 'Total omset toko terpilih'}
          </p>
        </div>

        {/* Card 2: Total Transactions */}
        <div className="rounded-3xl border border-[#dee3e9] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-[#5d6c7b]">
              Total Transaksi
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0064e0]/10 text-[#0064e0]">
              <Receipt className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-4 text-2xl font-black text-[#0a1317]">
            {totalTransactions} <span className="text-sm font-bold text-[#5d6c7b]">penjualan</span>
          </p>
          <p className="mt-1 text-xs text-[#5d6c7b] font-medium">Riwayat checkout kasir</p>
        </div>

        {/* Card 3: Total Items Sold */}
        <div className="rounded-3xl border border-[#dee3e9] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-[#5d6c7b]">
              Item Terjual
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f7b928]/20 text-[#0a1317]">
              <Package className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-4 text-2xl font-black text-[#0a1317]">
            {totalItemsSold} <span className="text-sm font-bold text-[#5d6c7b]">pcs</span>
          </p>
          <p className="mt-1 text-xs text-[#5d6c7b] font-medium">Kuantitas produk keluar</p>
        </div>

        {/* Card 4: Average Order Value */}
        <div className="rounded-3xl border border-[#dee3e9] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-[#5d6c7b]">
              Rata-rata Transaksi
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0a1317] text-white">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-4 text-2xl font-black text-[#0a1317]">
            Rp {averageOrderValue.toLocaleString('id-ID')}
          </p>
          <p className="mt-1 text-xs text-[#5d6c7b] font-medium">Nilai belanja per transaksi</p>
        </div>
      </div>

      {/* Middle Section: Store Comparison & Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Multi-Store Revenue Comparison Bar */}
        <div className="rounded-3xl border border-[#dee3e9] bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <PieChart className="h-5 w-5 text-[#0064e0]" />
              <h2 className="text-lg font-black text-[#0a1317]">
                Kontribusi Omset Per Toko
              </h2>
            </div>
            <span className="text-xs text-[#5d6c7b] font-bold">3 Toko Aktif</span>
          </div>

          <div className="space-y-4 pt-2">
            {storeBreakdown.map((sb) => {
              const percent = Math.round((sb.revenue / grandTotalRevenue) * 100);
              return (
                <div key={sb.store.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold text-[#0a1317] flex items-center gap-1.5">
                      <StoreIcon className="h-3.5 w-3.5 text-[#0064e0]" />
                      {sb.store.name} ({sb.store.code})
                    </span>
                    <div className="text-right">
                      <span className="font-black text-[#0064e0]">
                        Rp {sb.revenue.toLocaleString('id-ID')}
                      </span>
                      <span className="text-[#5d6c7b] font-bold ml-2">({percent}%)</span>
                    </div>
                  </div>
                  <div className="h-3 w-full rounded-full bg-[#f1f4f7] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#0064e0] transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top 5 Selling Products */}
        <div className="rounded-3xl border border-[#dee3e9] bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Award className="h-5 w-5 text-[#f7b928]" />
              <h2 className="text-lg font-black text-[#0a1317]">
                Produk Terlaris (Top Selling)
              </h2>
            </div>
            <span className="text-xs text-[#5d6c7b] font-bold">Top 5 Item</span>
          </div>

          <div className="space-y-3">
            {topProducts.length === 0 ? (
              <p className="text-center py-6 text-xs text-[#5d6c7b] font-bold">
                Belum ada data penjualan produk.
              </p>
            ) : (
              topProducts.map((prod, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3.5 rounded-2xl border border-[#dee3e9] bg-[#f1f4f7]"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0a1317] font-black text-white text-xs">
                      #{idx + 1}
                    </span>
                    <div>
                      <p className="font-bold text-[#0a1317] text-xs">
                        {prod.name}
                      </p>
                      <p className="text-[11px] text-[#5d6c7b]">SKU: {prod.sku}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-xs font-black text-[#0a1317]">
                      {prod.units} pcs terjual
                    </p>
                    <p className="text-[11px] font-extrabold text-[#0064e0]">
                      Rp {prod.revenue.toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Lower Section: Low Stock Warning & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Low Stock Alerts */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-[#0a1317] flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-[#f7b928]" />
              <span>Peringatan Stok Menipis ({lowStockItems.length} produk)</span>
            </h2>
            <Link
              href="/inventory"
              className="text-xs font-extrabold text-[#0064e0] hover:underline flex items-center gap-1"
            >
              <span>Kelola Stok</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="rounded-3xl border border-[#dee3e9] bg-white p-5 shadow-sm space-y-3">
            {lowStockItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center text-[#5d6c7b]">
                <Boxes className="h-10 w-10 stroke-[1.5] mb-2 text-[#31a24c]" />
                <p className="text-sm font-bold text-[#0a1317]">
                  Stok Aman! Tidak Ada Produk Menipis
                </p>
                <p className="text-xs text-[#5d6c7b] mt-1">
                  Semua persediaan produk berada di atas batas minimum.
                </p>
              </div>
            ) : (
              lowStockItems.slice(0, 6).map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border border-[#dee3e9] bg-[#f1f4f7] hover:bg-white transition-all"
                >
                  <div className="space-y-0.5">
                    <p className="font-bold text-[#0a1317] text-xs sm:text-sm">
                      {item.product.name}
                    </p>
                    <p className="text-[11px] text-[#5d6c7b] flex flex-wrap items-center gap-x-2">
                      <span>SKU: <code className="font-mono font-bold text-[#0a1317]">{item.product.sku}</code></span>
                      <span className="hidden sm:inline">•</span>
                      <span>Min: <strong className="text-[#0a1317]">{item.product.minimum_stock} {item.product.unit}</strong></span>
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2.5 sm:pt-0 border-t border-[#dee3e9] sm:border-t-0">
                    <div className="text-left sm:text-right">
                      <span className="text-[10px] uppercase font-bold text-[#8595a4] block sm:inline mr-1">Stok Toko:</span>
                      <span className="text-xs font-black text-[#0a1317]">
                        {item.quantity} {item.product.unit}
                      </span>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Sales History */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-[#0a1317]">
              Transaksi Terakhir
            </h2>
            <Link
              href="/sales"
              className="text-xs font-extrabold text-[#0064e0] hover:underline flex items-center gap-1"
            >
              <span>Lihat Semua</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="rounded-3xl border border-[#dee3e9] bg-white p-5 shadow-sm space-y-3">
            {sales.length === 0 ? (
              <p className="text-center py-6 text-xs text-[#5d6c7b] font-bold">
                Belum ada transaksi penjualan.
              </p>
            ) : (
              sales.slice(0, 5).map((sale) => (
                <div
                  key={sale.id}
                  className="flex items-center justify-between border-b border-[#dee3e9] pb-3 last:border-0 last:pb-0"
                >
                  <div>
                    <p className="font-bold text-xs text-[#0a1317]">
                      {sale.transaction_number}
                    </p>
                    <p className="text-[11px] text-[#5d6c7b]">
                      {new Date(sale.created_at).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      • {sale.payment_method}
                    </p>
                  </div>
                  <span className="font-extrabold text-xs text-[#0064e0]">
                    Rp {sale.total_amount.toLocaleString('id-ID')}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
