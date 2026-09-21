'use client';

import React, { useState, useCallback } from 'react';
import { useStore } from '@/context/store-context';
import { StorageService } from '@/lib/storage-service';
import { Sale, SaleReceiptData } from '@/types';
import { StatusBadge } from '@/components/ui/badge';
import { ReceiptModal } from '@/components/pos/receipt-modal';
import { Receipt, Search, Printer, Download } from 'lucide-react';
import { exportSalesToCSV } from '@/lib/export-utils';

export default function SalesHistoryPage() {
  const { activeStore } = useStore();

  const getSalesForStore = useCallback(
    () => StorageService.getSales(activeStore.id),
    [activeStore.id]
  );

  const [sales, setSales] = useState<Sale[]>(getSalesForStore);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Sale for Details & Print
  const [receiptData, setReceiptData] = useState<SaleReceiptData | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  // Sync state when activeStore changes
  React.useEffect(() => {
    setSales(getSalesForStore());
  }, [getSalesForStore]);

  const handleOpenReceipt = (saleId: string) => {
    const data = StorageService.getSaleById(saleId);
    if (data) {
      setReceiptData(data);
      setIsReceiptOpen(true);
    }
  };

  const handleExportCSV = () => {
    exportSalesToCSV(sales, activeStore.name);
  };

  const filteredSales = sales.filter((s) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      s.transaction_number.toLowerCase().includes(query) ||
      (s.cashier_name && s.cashier_name.toLowerCase().includes(query)) ||
      s.payment_method.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 mb-1">
            Toko: {activeStore.name} ({activeStore.code})
          </span>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Receipt className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            <span>Riwayat Penjualan & Struk</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Daftar seluruh transaksi yang terjadi di toko {activeStore.name}.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 active:scale-95 transition-all"
        >
          <Download className="h-4 w-4" />
          <span>Ekspor Penjualan (CSV)</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari berdasarkan No TRX, nama kasir, atau metode bayar..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>
      </div>

      {/* Sales Table */}
      <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3">No Transaction</th>
                <th className="px-4 py-3">Tanggal & Waktu</th>
                <th className="px-4 py-3">Kasir</th>
                <th className="px-4 py-3 text-center">Metode Bayar</th>
                <th className="px-4 py-3 text-right">Total Transaksi</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Cetak Struk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Belum ada riwayat transaksi penjualan.
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => (
                  <tr
                    key={sale.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-white">
                      {sale.transaction_number}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {new Date(sale.created_at).toLocaleString('id-ID', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {sale.cashier_name || 'Kasir'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-0.5 text-xs font-extrabold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {sale.payment_method}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-extrabold text-indigo-600 dark:text-indigo-400">
                      Rp {sale.total_amount.toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={sale.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleOpenReceipt(sale.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      >
                        <Printer className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span>Cetak Struk</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Receipt Modal */}
      <ReceiptModal
        isOpen={isReceiptOpen}
        receiptData={receiptData}
        onClose={() => setIsReceiptOpen(false)}
      />
    </div>
  );
}
