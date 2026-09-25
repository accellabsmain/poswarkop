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
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0064e0]/10 px-3 py-1 text-xs font-semibold text-[#0064e0] mb-1.5">
            Toko: {activeStore.name} ({activeStore.code})
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-[#0a1317] flex items-center gap-2">
            <Receipt className="h-6 w-6 text-[#0064e0]" />
            <span>Riwayat Penjualan & Struk</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Daftar seluruh transaksi yang terjadi di toko {activeStore.name}.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0064e0] px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-[#0052b8] active:scale-[0.98] transition-all"
        >
          <Download className="h-4 w-4" />
          <span>Ekspor Penjualan (CSV)</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="rounded-3xl border border-[#dee3e9] bg-white p-4 shadow-sm">
        <div className="relative max-w-md">
          <Search className="absolute left-4 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari berdasarkan No TRX, nama kasir, atau metode bayar..."
            className="w-full rounded-full border border-[#dee3e9] bg-[#f1f4f7] pl-11 pr-4 py-2.5 text-xs text-[#0a1317] placeholder:text-slate-400 focus:bg-white focus:border-[#0064e0] focus:outline-none transition-all"
          />
        </div>
      </div>

      {/* Sales Table */}
      <div className="rounded-3xl border border-[#dee3e9] bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-[#0a1317]">
            <thead className="bg-[#f1f4f7] text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-[#dee3e9]">
              <tr>
                <th className="px-5 py-3.5">No Transaction</th>
                <th className="px-5 py-3.5">Tanggal & Waktu</th>
                <th className="px-5 py-3.5">Kasir</th>
                <th className="px-5 py-3.5 text-center">Metode Bayar</th>
                <th className="px-5 py-3.5 text-right">Total Transaksi</th>
                <th className="px-5 py-3.5 text-center">Status</th>
                <th className="px-5 py-3.5 text-right">Cetak Struk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#dee3e9]">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-slate-400">
                    Belum ada riwayat transaksi penjualan.
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => (
                  <tr
                    key={sale.id}
                    className="hover:bg-[#f1f4f7]/60 transition-colors"
                  >
                    <td className="px-5 py-3.5 font-mono font-bold text-xs text-[#0a1317]">
                      {sale.transaction_number}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-500">
                      {new Date(sale.created_at).toLocaleString('id-ID', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </td>
                    <td className="px-5 py-3.5 text-xs font-medium text-slate-700">
                      {sale.cashier_name || 'Kasir'}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className="inline-flex items-center rounded-full bg-[#f1f4f7] px-3 py-1 text-xs font-semibold text-slate-700 border border-[#dee3e9]">
                        {sale.payment_method}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-bold text-xs text-[#0064e0]">
                      Rp {sale.total_amount.toLocaleString('id-ID')}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <StatusBadge status={sale.status} />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => handleOpenReceipt(sale.id)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[#dee3e9] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#0a1317] hover:bg-[#f1f4f7] transition-colors"
                      >
                        <Printer className="h-3.5 w-3.5 text-[#0064e0]" />
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
