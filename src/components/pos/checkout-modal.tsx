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

  React.useEffect(() => {
    if (isOpen) {
      setAmountReceived(totalAmount);
      setErrorMsg(null);
      setNotes('');
    }
  }, [isOpen, totalAmount]);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-[#dee3e9]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#dee3e9]">
          <div>
            <h3 className="text-base font-bold text-[#0a1317]">
              Pembayaran & Checkout
            </h3>
            <p className="text-xs text-slate-500">
              Toko: <span className="font-semibold text-[#0064e0]">{activeStore.name}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-[#f1f4f7] hover:text-[#0a1317] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-700">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Total Banner */}
        <div className="mt-4 rounded-2xl bg-[#f1f4f7] border border-[#dee3e9] p-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total Tagihan
          </p>
          <p className="text-3xl font-bold text-[#0064e0] mt-1">
            Rp {totalAmount.toLocaleString('id-ID')}
          </p>
        </div>

        {/* Payment Method Selector */}
        <div className="mt-5">
          <label className="block text-xs font-semibold text-slate-600 mb-2">
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
                  className={`flex items-center gap-2.5 rounded-2xl border p-3 text-xs font-semibold transition-all ${
                    isSelected
                      ? 'border-[#0064e0] bg-[#0064e0]/10 text-[#0064e0] shadow-sm'
                      : 'border-[#dee3e9] bg-white text-slate-700 hover:bg-[#f1f4f7]'
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
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Uang Diterima (Rp)
              </label>
              <input
                type="number"
                min={totalAmount}
                value={amountReceived}
                onChange={(e) => setAmountReceived(Number(e.target.value) || 0)}
                className="w-full rounded-2xl border border-[#dee3e9] bg-[#f1f4f7] px-4 py-2.5 text-base font-bold text-[#0a1317] focus:bg-white focus:outline-none focus:border-[#0064e0] transition-colors"
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
                    className="rounded-full border border-[#dee3e9] bg-[#f1f4f7] px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-[#0064e0] hover:text-white hover:border-[#0064e0] transition-colors"
                  >
                    {amt === totalAmount ? 'Uang Pas' : `Rp ${amt.toLocaleString('id-ID')}`}
                  </button>
                ))}
            </div>

            {/* Kembalian */}
            <div className="flex items-center justify-between rounded-2xl bg-[#f1f4f7] border border-[#dee3e9] p-3.5">
              <span className="text-xs font-semibold text-slate-600">
                Kembalian
              </span>
              <span className="text-base font-bold text-emerald-600">
                Rp {changeAmount.toLocaleString('id-ID')}
              </span>
            </div>
          </div>
        )}

        {/* Catatan Transaksi */}
        <div className="mt-4">
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Catatan Transaksi (Opsional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Catatan tambahan untuk struk..."
            className="w-full rounded-2xl border border-[#dee3e9] bg-[#f1f4f7] px-4 py-2.5 text-xs text-[#0a1317] focus:bg-white focus:outline-none focus:border-[#0064e0] transition-colors"
          />
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-[#dee3e9]">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[#dee3e9] bg-white px-5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-[#f1f4f7] transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleCheckout}
            disabled={isSubmitting}
            className="flex items-center gap-2 rounded-full bg-[#0064e0] px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-[#0052b8] active:scale-[0.98] transition-all disabled:opacity-50"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>{isSubmitting ? 'Memproses...' : 'Konfirmasi Transaksi'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
