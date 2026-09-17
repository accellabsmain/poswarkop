import React from 'react';
import { SaleReceiptData } from '@/types';

interface ReceiptPrintProps {
  data: SaleReceiptData;
}

export function ReceiptPrint({ data }: ReceiptPrintProps) {
  const { sale, store, items, payment, cashier_name } = data;
  const formattedDate = new Date(sale.created_at).toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <div className="receipt-container bg-white text-black font-mono text-xs p-4 max-w-[80mm] mx-auto leading-tight">
      {/* Store Header */}
      <div className="text-center mb-3">
        <h2 className="text-base font-bold uppercase">{store.name}</h2>
        {store.address && <p className="text-[10px]">{store.address}</p>}
        {store.phone && <p className="text-[10px]">Telp: {store.phone}</p>}
      </div>

      <div className="border-b border-dashed border-black my-2" />

      {/* Info Transaction */}
      <div className="space-y-0.5 text-[11px]">
        <div className="flex justify-between">
          <span>No TRX:</span>
          <span className="font-bold">{sale.transaction_number}</span>
        </div>
        <div className="flex justify-between">
          <span>Tgl:</span>
          <span>{formattedDate}</span>
        </div>
        <div className="flex justify-between">
          <span>Kasir:</span>
          <span>{cashier_name}</span>
        </div>
      </div>

      <div className="border-b border-dashed border-black my-2" />

      {/* Items List */}
      <div className="space-y-1.5 my-2">
        {items.map((item, idx) => (
          <div key={idx} className="space-y-0.5">
            <p className="font-bold text-[11px]">{item.product_name}</p>
            <div className="flex justify-between text-[10px] pl-2">
              <span>
                {item.quantity} x Rp {item.unit_price.toLocaleString('id-ID')}
              </span>
              <span>Rp {item.subtotal.toLocaleString('id-ID')}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="border-b border-dashed border-black my-2" />

      {/* Totals & Payment */}
      <div className="space-y-1 text-[11px]">
        <div className="flex justify-between font-bold text-sm">
          <span>TOTAL:</span>
          <span>Rp {sale.total_amount.toLocaleString('id-ID')}</span>
        </div>
        <div className="flex justify-between">
          <span>Metode Bayar:</span>
          <span className="font-bold">{sale.payment_method}</span>
        </div>

        {sale.payment_method === 'CASH' && (
          <>
            <div className="flex justify-between">
              <span>Bayar (Tunai):</span>
              <span>Rp {payment.amount_paid.toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between">
              <span>Kembali:</span>
              <span>Rp {payment.amount_change.toLocaleString('id-ID')}</span>
            </div>
          </>
        )}
      </div>

      <div className="border-b border-dashed border-black my-3" />

      {/* Footer message */}
      <div className="text-center text-[10px] space-y-1">
        <p>*** TERIMA KASIH ***</p>
        <p>Barang yang sudah dibeli tidak dapat ditukar/dikembalikan.</p>
      </div>

      {/* Print Stylesheet overlay for thermal printers */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .receipt-container,
          .receipt-container * {
            visibility: visible;
          }
          .receipt-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            max-width: 80mm;
            padding: 0;
            margin: 0;
          }
          @page {
            size: auto;
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
}
