'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { useStore } from '@/context/store-context';
import { useAuth } from '@/context/auth-context';
import { StorageService } from '@/lib/storage-service';
import { StatusBadge } from '@/components/ui/badge';
import {
  Banknote,
  Receipt,
  AlertTriangle,
  Package,
  ShoppingCart,
  ArrowRight,
  Boxes,
} from 'lucide-react';

export default function DashboardPage() {
  const { activeStore } = useStore();
  const { user } = useAuth();

  const getDashboardData = useCallback(() => {
    const sales = StorageService.getSales(activeStore.id);
    const todayStr = new Date().toISOString().slice(0, 10);
    const todaySales = sales.filter((s) => s.created_at.slice(0, 10) === todayStr);

    const inventory = StorageService.getStoreInventory(activeStore.id);
    const lowStock = inventory.filter(
      (item) => item.status === 'LOW_STOCK' || item.status === 'OUT_OF_STOCK'
    );

    const prodsCount = StorageService.getProducts().length;

    return {
      salesToday: todaySales,
      totalRevenueToday: todaySales.reduce((acc, s) => acc + s.total_amount, 0),
      lowStockItems: lowStock,
      allProductsCount: prodsCount,
    };
  }, [activeStore.id]);

  const [data, setData] = useState(getDashboardData);

  // Sync state when activeStore changes
  const currentData = getDashboardData();
  if (
    data.salesToday.length !== currentData.salesToday.length ||
    data.lowStockItems.length !== currentData.lowStockItems.length ||
    data.allProductsCount !== currentData.allProductsCount
  ) {
    setData(currentData);
  }

  const { salesToday, totalRevenueToday, lowStockItems, allProductsCount } = data;

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
            Sistem Ringkasan Penjualan dan Pengelolaan Stok Terintegrasi Toko Mas Budi, Warkop Ngombeku & Warkop Kakak.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/pos"
            className="flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-extrabold text-indigo-900 shadow-md hover:bg-indigo-50 active:scale-[0.98] transition-all"
          >
            <ShoppingCart className="h-5 w-5 text-indigo-600" />
            <span>Buka POS Kasir</span>
          </Link>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Revenue Today */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Penjualan Hari Ini
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <Banknote className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900 dark:text-white">
            Rp {totalRevenueToday.toLocaleString('id-ID')}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Hasil transaksi di {activeStore.name}
          </p>
        </div>

        {/* Card 2: Transactions Today */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Transaksi Hari Ini
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <Receipt className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900 dark:text-white">
            {salesToday.length} <span className="text-sm font-semibold text-slate-400">transaksi</span>
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Riwayat checkout kasir
          </p>
        </div>

        {/* Card 3: Low Stock Alert */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Peringatan Stok Menipis
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-amber-600 dark:text-amber-400">
            {lowStockItems.length} <span className="text-sm font-semibold text-slate-400">produk</span>
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Stok &le; batas minimum di {activeStore.name}
          </p>
        </div>

        {/* Card 4: Total Master Products */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Katalog Produk Master
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <Package className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900 dark:text-white">
            {allProductsCount} <span className="text-sm font-semibold text-slate-400">produk</span>
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Global Master Catalog
          </p>
        </div>
      </div>

      {/* Main Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Low Stock Alerts */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <span>Peringatan Stok Menipis ({activeStore.name})</span>
            </h2>
            <Link
              href="/inventory"
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-1"
            >
              <span>Lihat Stok</span>
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
                  Semua persediaan produk di {activeStore.name} berada di atas batas minimum.
                </p>
              </div>
            ) : (
              lowStockItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-800/40"
                >
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white text-sm">
                      {item.product.name}
                    </p>
                    <p className="text-xs text-slate-400">
                      SKU: {item.product.sku} | Min Stok: {item.product.minimum_stock} {item.product.unit}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xs text-slate-400">Stok Toko</p>
                      <p className="text-sm font-extrabold text-amber-600 dark:text-amber-400">
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

        {/* Right Column: Quick Links & Recent Sales */}
        <div className="space-y-4">
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
            Penjualan Terakhir
          </h2>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-sm space-y-3">
            {salesToday.length === 0 ? (
              <p className="text-center py-6 text-xs text-slate-400">
                Belum ada transaksi di {activeStore.name} hari ini.
              </p>
            ) : (
              salesToday.slice(0, 5).map((sale) => (
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
