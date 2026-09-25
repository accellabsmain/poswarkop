'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { StorageService } from '@/lib/storage-service';
import {
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  Clock,
  AlertTriangle,
} from 'lucide-react';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const profiles = StorageService.getProfiles();
  const stores = StorageService.getStores();

  const [selectedUserId, setSelectedUserId] = useState(profiles[0]?.id || 'user-owner');
  const [selectedStoreId, setSelectedStoreId] = useState(stores[0]?.id || 'store-1');
  const [sessionExpiredNotice, setSessionExpiredNotice] = useState(false);

  useEffect(() => {
    if (searchParams.get('expired') === '1') {
      setSessionExpiredNotice(true);
    }
  }, [searchParams]);

  const handleDemoLogin = (e: React.FormEvent) => {
    e.preventDefault();
    StorageService.setActiveUserId(selectedUserId);
    StorageService.setActiveStoreId(selectedStoreId);
    StorageService.createSession();
    router.push('/dashboard');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f1f4f7] p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl border border-[#dee3e9]">
        {/* Logo & Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#0064e0] text-white shadow-lg shadow-[#0064e0]/20 mb-3">
            <ShoppingBag className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-[#0a1317]">
            POS & Inventory Warkop
          </h1>
          <p className="text-xs font-semibold text-[#5d6c7b] mt-1">
            Masuk ke sistem operasional 3 Toko (Toko Mas Budi, Warkop Ngombeku, Warkop Kakak)
          </p>
        </div>

        {/* Demo Phase 1 Badge */}
        <div className="flex items-center justify-between rounded-2xl bg-[#f1f4f7] p-3.5 mb-6 border border-[#dee3e9]">
          <div className="flex items-center gap-2 text-xs font-extrabold text-[#0a1317]">
            <UserCheck className="h-4 w-4 text-[#0064e0]" />
            <span>Demo Phase 1 — Instant Access</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-bold bg-[#f7b928] text-[#0a1317] rounded-full px-2.5 py-0.5">
            <Clock className="h-3 w-3" />
            <span>Sesi 1x24 Jam</span>
          </div>
        </div>

        {/* Expired Session Notice */}
        {sessionExpiredNotice && (
          <div className="mb-4 flex items-center gap-2.5 rounded-2xl bg-[#e41e3f]/10 p-3.5 text-xs font-bold text-[#e41e3f] border border-[#e41e3f]/20">
            <AlertTriangle className="h-4 w-4 shrink-0 text-[#e41e3f]" />
            <span>Sesi login Anda telah berakhir setelah 24 jam. Silakan masuk kembali.</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleDemoLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#5d6c7b] mb-1.5">
              Pilih Akun / User (Role)
            </label>
            <div className="relative">
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full rounded-2xl border border-[#dee3e9] bg-[#f1f4f7] px-4 py-3 text-sm font-bold text-[#0a1317] focus:border-[#0064e0] focus:outline-none cursor-pointer"
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
            <label className="block text-xs font-bold uppercase tracking-wider text-[#5d6c7b] mb-1.5">
              Pilih Toko Utama
            </label>
            <div className="relative">
              <select
                value={selectedStoreId}
                onChange={(e) => setSelectedStoreId(e.target.value)}
                className="w-full rounded-2xl border border-[#dee3e9] bg-[#f1f4f7] px-4 py-3 text-sm font-bold text-[#0a1317] focus:border-[#0064e0] focus:outline-none cursor-pointer"
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
            className="w-full flex items-center justify-center gap-2 rounded-full bg-[#0064e0] hover:bg-[#0457cb] py-3.5 text-sm font-extrabold text-white shadow-lg shadow-[#0064e0]/20 active:scale-[0.99] transition-all"
          >
            <span>Masuk ke Dashboard / POS</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        {/* Footer info */}
        <div className="mt-8 pt-4 border-t border-[#dee3e9] text-center">
          <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-[#5d6c7b]">
            <ShieldCheck className="h-4 w-4 text-[#31a24c]" />
            <span>Multi-Store POS & Inventory System</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[#f1f4f7]">
        <p className="text-xs text-[#5d6c7b] font-bold">Memuat Halaman Login...</p>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}

export default LoginPage;
