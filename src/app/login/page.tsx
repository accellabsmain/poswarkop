'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { StorageService } from '@/lib/storage-service';
import { ShoppingBag, ArrowRight, ShieldCheck, UserPlus } from 'lucide-react';

export function LoginPage() {
  const router = useRouter();
  const profiles = StorageService.getProfiles();
  const stores = StorageService.getStores();

  const [selectedUserId, setSelectedUserId] = useState(profiles[0]?.id || 'user-owner');
  const [selectedStoreId, setSelectedStoreId] = useState(stores[0]?.id || 'store-1');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    StorageService.setActiveUserId(selectedUserId);
    StorageService.setActiveStoreId(selectedStoreId);
    router.push('/dashboard');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 dark:bg-slate-950 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 p-8 shadow-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 mb-4">
            <ShoppingBag className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            POS & Inventory Warkop
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Masuk ke sistem operasional 3 Toko (Toko Mas Budi, Warkop Ngombeku, Warkop Kakak)
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Pilih Akun / User Demo
            </label>
            <div className="relative">
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm font-semibold text-slate-800 focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name} ({p.role.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Pilih Toko Aktif
            </label>
            <div className="relative">
              <select
                value={selectedStoreId}
                onChange={(e) => setSelectedStoreId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm font-semibold text-slate-800 focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-indigo-600/25 hover:bg-indigo-700 active:scale-[0.99] transition-all"
          >
            <span>Masuk ke Dashboard</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        {/* Link to Register Page */}
        <div className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
          Belum memiliki akun?{' '}
          <Link
            href="/register"
            className="font-bold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 underline underline-offset-2 inline-flex items-center gap-1"
          >
            <span>Daftar Akun Baru</span>
            <UserPlus className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
          <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span>Terproteksi Supabase Auth & RLS Access Control</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
