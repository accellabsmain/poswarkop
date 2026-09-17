'use client';

import React from 'react';
import { SaleReceiptData } from '@/types';
import { ReceiptPrint } from './receipt-print';
import { X, Printer, CheckCircle } from 'lucide-react';

interface ReceiptModalProps {
  isOpen: boolean;
  receiptData: SaleReceiptData | null;
  onClose: () => void;
}

export function ReceiptModal({ isOpen, receiptData, onClose }: ReceiptModalProps) {
  if (!isOpen || !receiptData) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-100 dark:border-slate-800 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <CheckCircle className="h-5 w-5" />
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
              Transaksi Berhasil!
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Receipt Container */}
        <div className="flex-1 overflow-y-auto py-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
            <ReceiptPrint data={receiptData} />
          </div>
        </div>

        {/* Actions */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Tutup
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-extrabold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 active:scale-[0.98]"
          >
            <Printer className="h-4 w-4" />
            <span>Cetak Struk (Print)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
