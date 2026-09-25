'use client';

import React, { useState, useEffect } from 'react';
import { AuthProvider } from '@/context/auth-context';
import { StoreProvider } from '@/context/store-context';
import { Header } from './header';
import { Sidebar } from './sidebar';

export function MainLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-[#0a1317]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-4 border-[#0064e0] border-t-transparent" />
          <p className="text-xs font-bold text-[#5d6c7b]">Memuat POS Warkop...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthProvider>
      <StoreProvider>
        <div className="flex min-h-screen bg-white font-sans text-[#0a1317] antialiased">
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <div className="flex flex-1 flex-col min-w-0">
            <Header onToggleSidebar={() => setSidebarOpen(true)} />
            <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
              {children}
            </main>
          </div>
        </div>
      </StoreProvider>
    </AuthProvider>
  );
}
