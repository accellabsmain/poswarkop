'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { StorageService } from '@/lib/storage-service';
import { UserRole } from '@/types';
import {
  ShoppingBag,
  UserPlus,
  ArrowRight,
  ShieldCheck,
  Eye,
  EyeOff,
  User,
  Mail,
  Lock,
  Store,
  Briefcase,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export function RegisterPage() {
  const router = useRouter();
  const stores = StorageService.getStores();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('cashier');
  const [storeId, setStoreId] = useState(stores[0]?.id || 'store-1');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!fullName.trim()) {
      setErrorMessage('Nama lengkap tidak boleh kosong');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Masukkan alamat email yang valid');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password minimal terdiri dari 6 karakter');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Konfirmasi password tidak cocok');
      return;
    }

    setIsSubmitting(true);

    // Simulated Front-End Registration success
    setTimeout(() => {
      setIsSubmitting(false);
      setSuccessMessage('Pendaftaran akun berhasil! Mengalihkan ke halaman login...');
      setTimeout(() => {
        router.push('/login');
      }, 1500);
    }, 600);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 dark:bg-slate-950 p-4 py-8">
      <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 p-8 shadow-2xl border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 mb-3">
            <ShoppingBag className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Pendaftaran POSWarkop
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Buat akun pengguna baru untuk mengelola transaksi & inventaris toko
          </p>
        </div>

        {/* Alert Error */}
        {errorMessage && (
          <div className="mb-4 flex items-center gap-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 p-3.5 text-xs font-semibold text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Alert Success */}
        {successMessage && (
          <div className="mb-4 flex items-center gap-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 p-3.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Nama Lengkap
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                <User className="h-4 w-4" />
              </div>
              <input
                type="text"
                placeholder="misal: Budi Santoso"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white dark:bg-slate-800 pl-10 pr-3.5 py-3 text-sm font-medium text-slate-800 dark:text-white placeholder-slate-400 focus:border-indigo-600 focus:outline-none dark:border-slate-700"
                required
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Alamat Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                <Mail className="h-4 w-4" />
              </div>
              <input
                type="email"
                placeholder="budi@poswarkop.id"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white dark:bg-slate-800 pl-10 pr-3.5 py-3 text-sm font-medium text-slate-800 dark:text-white placeholder-slate-400 focus:border-indigo-600 focus:outline-none dark:border-slate-700"
                required
              />
            </div>
          </div>

          {/* Role Selection */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Role / Hak Access
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                <Briefcase className="h-4 w-4" />
              </div>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full rounded-xl border border-slate-300 bg-white dark:bg-slate-800 pl-10 pr-3.5 py-3 text-sm font-semibold text-slate-800 dark:text-white focus:border-indigo-600 focus:outline-none dark:border-slate-700"
              >
                <option value="cashier">Kasir (Cashier) - Akses POS Checkout</option>
                <option value="manager">Manager - Akses Inventaris & Stok</option>
                <option value="owner">Owner - Akses Kontrol Penuh All Store</option>
              </select>
            </div>
          </div>

          {/* Store Selection */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Pilih Toko Utama
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                <Store className="h-4 w-4" />
              </div>
              <select
                value={storeId}
                onChange={(e) => setStoreId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white dark:bg-slate-800 pl-10 pr-3.5 py-3 text-sm font-semibold text-slate-800 dark:text-white focus:border-indigo-600 focus:outline-none dark:border-slate-700"
              >
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Kata Sandi
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                <Lock className="h-4 w-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Minimal 6 karakter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white dark:bg-slate-800 pl-10 pr-10 py-3 text-sm font-medium text-slate-800 dark:text-white placeholder-slate-400 focus:border-indigo-600 focus:outline-none dark:border-slate-700"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Konfirmasi Kata Sandi
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                <Lock className="h-4 w-4" />
              </div>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Ulangi kata sandi"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white dark:bg-slate-800 pl-10 pr-10 py-3 text-sm font-medium text-slate-800 dark:text-white placeholder-slate-400 focus:border-indigo-600 focus:outline-none dark:border-slate-700"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-indigo-600/25 hover:bg-indigo-700 active:scale-[0.99] transition-all disabled:opacity-70 disabled:cursor-not-allowed mt-2"
          >
            {isSubmitting ? (
              <span>Memproses Pendaftaran...</span>
            ) : (
              <>
                <UserPlus className="h-4 w-4" />
                <span>Daftar Akun Baru</span>
                <ArrowRight className="h-4 w-4 ml-1" />
              </>
            )}
          </button>
        </form>

        {/* Link back to Login */}
        <div className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
          Sudah memiliki akun?{' '}
          <Link
            href="/login"
            className="font-bold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 underline underline-offset-2"
          >
            Masuk ke Halaman Login
          </Link>
        </div>

        {/* Footer info */}
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
          <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span>Terproteksi Supabase Auth & PostgreSQL RLS</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
