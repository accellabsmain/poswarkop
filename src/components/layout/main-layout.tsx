'use client';

import React, { useState } from 'react';
import { AuthProvider } from '@/context/auth-context';
import { StoreProvider } from '@/context/store-context';
import { Header } from './header';
import { Sidebar } from './sidebar';

export function MainLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <AuthProvider>
      <StoreProvider>
        <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 antialiased">
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
