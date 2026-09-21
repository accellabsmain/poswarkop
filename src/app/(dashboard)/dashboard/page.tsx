'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { useStore } from '@/context/store-context';
import { useAuth } from '@/context/auth-context';
import { StorageService } from '@/lib/storage-service';
import { StatusBadge } from '@/components/ui/badge';
import { exportSalesToCSV } from '@/lib/export-utils';
import { Store, Sale } from '@/types';
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
  const { user, isOwner } = useAuth();

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
    allProductsCount,
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
      {/* Top Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-950 p-6 text-white shadow-xl">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-700/60 px-3 py-1 text-xs font-bold text-indigo-200 backdrop-blur mb-2">
            Toko Aktif: {activeStore.name} ({activeStore.code})
          </span>
          <h1 className="text-2xl font-black tracking-tight">
            Selamat Datang, {user.full_name}!
          </h1>
          <p className="text-xs text-indigo-200 mt-1 max-w-xl">
            Ringkasan Performa Bisnis & Penjualan Multi-Toko (Toko Mas Budi, Warkop Ngombeku & Warkop Kakak).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 rounded-xl bg-indigo-700/80 hover:bg-indigo-700 px-4 py-3 text-xs font-bold text-white backdrop-blur border border-indigo-500/30 shadow-md transition-all active:scale-95"
          >
            <Download className="h-4 w-4" />
            <span>Ekspor Laporan (CSV)</span>
          </button>

          <Link
            href="/pos"
            className="flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-extrabold text-indigo-900 shadow-md hover:bg-indigo-50 active:scale-[0.98] transition-all"
          >
            <ShoppingCart className="h-5 w-5 text-indigo-600" />
            <span>Buka POS Kasir</span>
          </Link>
        </div>
      </div>

      {/* Multi-Store Scope Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
        <div className="flex items-center gap-2">
          <StoreIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Scope Ringkasan Data:
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSelectedFilterStoreId('all')}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
              selectedFilterStoreId === 'all'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            Semua Toko (Aggregated)
          </button>
          {stores.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedFilterStoreId(s.id)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                selectedFilterStoreId === s.id
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>

      {/* 4 Primary KPI Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Total Omset */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Omset Bisnis
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <Banknote className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900 dark:text-white">
            Rp {totalRevenue.toLocaleString('id-ID')}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {selectedFilterStoreId === 'all' ? 'Akumulasi seluruh toko' : 'Total omset toko terpilih'}
          </p>
        </div>

        {/* Card 2: Total Transactions */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Transaksi
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <Receipt className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900 dark:text-white">
            {totalTransactions} <span className="text-sm font-semibold text-slate-400">penjualan</span>
          </p>
          <p className="mt-1 text-xs text-slate-400">Riwayat checkout kasir</p>
        </div>

        {/* Card 3: Total Items Sold */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Item Terjual
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <Package className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900 dark:text-white">
            {totalItemsSold} <span className="text-sm font-semibold text-slate-400">pcs</span>
          </p>
          <p className="mt-1 text-xs text-slate-400">Kuantitas produk keluar</p>
        </div>

        {/* Card 4: Average Order Value */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Rata-rata Transaksi (Basket)
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900 dark:text-white">
            Rp {averageOrderValue.toLocaleString('id-ID')}
          </p>
          <p className="mt-1 text-xs text-slate-400">Nilai belanja per transaksi</p>
        </div>
      </div>

      {/* Middle Section: Store Comparison & Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Multi-Store Revenue Comparison Bar */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                Kontribusi Omset Per Toko
              </h2>
            </div>
            <span className="text-xs text-slate-400 font-semibold">3 Toko Aktif</span>
          </div>

          <div className="space-y-4 pt-2">
            {storeBreakdown.map((sb) => {
              const percent = Math.round((sb.revenue / grandTotalRevenue) * 100);
              return (
                <div key={sb.store.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <StoreIcon className="h-3.5 w-3.5 text-indigo-500" />
                      {sb.store.name} ({sb.store.code})
                    </span>
                    <div className="text-right">
                      <span className="font-black text-indigo-600 dark:text-indigo-400">
                        Rp {sb.revenue.toLocaleString('id-ID')}
                      </span>
                      <span className="text-slate-400 font-semibold ml-2">({percent}%)</span>
                    </div>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-700 transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top 5 Selling Products */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-500" />
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                Produk Terlaris (Top Selling)
              </h2>
            </div>
            <span className="text-xs text-slate-400 font-semibold">Top 5 Item</span>
          </div>

          <div className="space-y-3">
            {topProducts.length === 0 ? (
              <p className="text-center py-6 text-xs text-slate-400">
                Belum ada data penjualan produk.
              </p>
            ) : (
              topProducts.map((prod, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-800/40"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-950 font-black text-indigo-700 dark:text-indigo-300 text-xs">
                      #{idx + 1}
                    </span>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white text-xs">
                        {prod.name}
                      </p>
                      <p className="text-[11px] text-slate-400">SKU: {prod.sku}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-xs font-black text-slate-900 dark:text-white">
                      {prod.units} pcs terjual
                    </p>
                    <p className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
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
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <span>Peringatan Stok Menipis ({lowStockItems.length} produk)</span>
            </h2>
            <Link
              href="/inventory"
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-1"
            >
              <span>Kelola Stok</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-sm space-y-3">
            {lowStockItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center text-slate-400">
                <Boxes className="h-10 w-10 stroke-[1.5] mb-2 text-emerald-500" />
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  Stok Aman! Tidak Ada Produk Menipis
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Semua persediaan produk berada di atas batas minimum.
                </p>
              </div>
            ) : (
              lowStockItems.slice(0, 6).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-800/40"
                >
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white text-xs">
                      {item.product.name}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      SKU: {item.product.sku} | Min: {item.product.minimum_stock} {item.product.unit}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-[11px] text-slate-400">Stok Toko</p>
                      <p className="text-xs font-extrabold text-amber-600 dark:text-amber-400">
                        {item.quantity} {item.product.unit}
                      </p>
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
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
              Transaksi Terakhir
            </h2>
            <Link
              href="/sales"
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-1"
            >
              <span>Lihat Semua</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-sm space-y-3">
            {sales.length === 0 ? (
              <p className="text-center py-6 text-xs text-slate-400">
                Belum ada transaksi penjualan.
              </p>
            ) : (
              sales.slice(0, 5).map((sale) => (
                <div
                  key={sale.id}
                  className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5 last:border-0 last:pb-0"
                >
                  <div>
                    <p className="font-bold text-xs text-slate-800 dark:text-slate-200">
                      {sale.transaction_number}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {new Date(sale.created_at).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      • {sale.payment_method}
                    </p>
                  </div>
                  <span className="font-extrabold text-xs text-indigo-600 dark:text-indigo-400">
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
