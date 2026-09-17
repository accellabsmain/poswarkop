'use client';

import React, { useState } from 'react';
import { CartItem, PaymentMethod, SaleReceiptData } from '@/types';
import { StorageService } from '@/lib/storage-service';
import { useStore } from '@/context/store-context';
import { useAuth } from '@/context/auth-context';
import { X, Banknote, QrCode, CreditCard, Wallet, AlertCircle, CheckCircle2 } from 'lucide-react';

interface CheckoutModalProps {
  isOpen: boolean;
  cart: CartItem[];
  onClose: () => void;
  onSuccess: (receiptData: SaleReceiptData) => void;
}

export function CheckoutModal({
  isOpen,
  cart,
  onClose,
  onSuccess,
}: CheckoutModalProps) {
  const { activeStore } = useStore();
  const { user } = useAuth();

  const totalAmount = cart.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [amountReceived, setAmountReceived] = useState<number>(totalAmount);
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const changeAmount = Math.max(0, amountReceived - totalAmount);

  const handleQuickCash = (amount: number) => {
    setAmountReceived(amount);
  };

  const handleCheckout = () => {
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      if (paymentMethod === 'CASH' && amountReceived < totalAmount) {
        throw new Error(
          `Uang pembayaran (Rp ${amountReceived.toLocaleString('id-ID')}) kurang dari total tagihan!`
        );
      }

      // Execute Atomic Sale Transaction
      const receipt = StorageService.createSale({
        store_id: activeStore.id,
        cashier_id: user.id,
        payment_method: paymentMethod,
        amount_paid: paymentMethod === 'CASH' ? amountReceived : totalAmount,
        notes,
        items: cart.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
          unit_price: item.unit_price, // Historical price!
        })),
      });

      setIsSubmitting(false);
      onSuccess(receipt);
    } catch (err: unknown) {
      setIsSubmitting(false);
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Gagal memproses transaksi penjualan');
      }
    }
  };

  const paymentOptions: { id: PaymentMethod; label: string; icon: React.ElementType }[] = [
    { id: 'CASH', label: 'Tunai (Cash)', icon: Banknote },
    { id: 'QRIS', label: 'QRIS', icon: QrCode },
    { id: 'TRANSFER', label: 'Bank Transfer', icon: CreditCard },
    { id: 'OTHER', label: 'Lainnya', icon: Wallet },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-100 dark:border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
              Pembayaran & Checkout
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Toko: <span className="font-semibold text-indigo-600 dark:text-indigo-400">{activeStore.name}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-700 dark:bg-rose-950/50 dark:border-rose-800 dark:text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Total Banner */}
        <div className="mt-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 p-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Total Tagihan
          </p>
          <p className="text-3xl font-black text-indigo-700 dark:text-indigo-300 mt-1">
            Rp {totalAmount.toLocaleString('id-ID')}
          </p>
        </div>

        {/* Payment Method Selector */}
        <div className="mt-5">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            Metode Pembayaran
          </label>
          <div className="grid grid-cols-2 gap-2">
            {paymentOptions.map((opt) => {
              const Icon = opt.icon;
              const isSelected = paymentMethod === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => {
                    setPaymentMethod(opt.id);
                    if (opt.id !== 'CASH') setAmountReceived(totalAmount);
                  }}
                  className={`flex items-center gap-2.5 rounded-xl border p-3 text-xs font-bold transition-all ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm dark:bg-indigo-950/60 dark:text-indigo-300'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Cash Payment Details */}
        {paymentMethod === 'CASH' && (
          <div className="mt-5 space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Uang Diterima (Rp)
              </label>
              <input
                type="number"
                min={totalAmount}
                value={amountReceived}
                onChange={(e) => setAmountReceived(Number(e.target.value) || 0)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-base font-bold text-slate-900 focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            {/* Quick cash buttons */}
            <div className="flex flex-wrap gap-2">
              {[totalAmount, 10000, 20000, 50000, 100000]
                .filter((amt, i, arr) => arr.indexOf(amt) === i && amt >= totalAmount)
                .map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => handleQuickCash(amt)}
                    className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-indigo-100 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  >
                    {amt === totalAmount ? 'Uang Pas' : `Rp ${amt.toLocaleString('id-ID')}`}
                  </button>
                ))}
            </div>

            {/* Kembalian */}
            <div className="flex items-center justify-between rounded-xl bg-slate-100 dark:bg-slate-800 p-3">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                Kembalian
              </span>
              <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                Rp {changeAmount.toLocaleString('id-ID')}
              </span>
            </div>
          </div>
        )}

        {/* Catatan Transaksi */}
        <div className="mt-4">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Catatan Transaksi (Opsional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Catatan tambahan untuk struk..."
            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleCheckout}
            disabled={isSubmitting}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-extrabold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 disabled:opacity-50"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>{isSubmitting ? 'Memproses...' : 'Konfirmasi Transaksi'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
