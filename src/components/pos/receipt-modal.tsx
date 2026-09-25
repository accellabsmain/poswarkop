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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-[#dee3e9] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#dee3e9]">
          <div className="flex items-center gap-2 text-emerald-600">
            <CheckCircle className="h-5 w-5" />
            <h3 className="font-bold text-base text-[#0a1317]">
              Transaksi Berhasil!
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-[#f1f4f7] hover:text-[#0a1317] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Receipt Container */}
        <div className="flex-1 overflow-y-auto py-4">
          <div className="rounded-2xl border border-[#dee3e9] bg-[#f1f4f7] p-3">
            <ReceiptPrint data={receiptData} />
          </div>
        </div>

        {/* Actions */}
        <div className="pt-3 border-t border-[#dee3e9] flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-full border border-[#dee3e9] bg-white px-5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-[#f1f4f7] transition-colors"
          >
            Tutup
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 rounded-full bg-[#0064e0] px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-[#0052b8] active:scale-[0.98] transition-all"
          >
            <Printer className="h-4 w-4" />
            <span>Cetak Struk (Print)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
