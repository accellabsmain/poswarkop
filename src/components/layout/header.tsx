'use client';

import React from 'react';
import { useStore } from '@/context/store-context';
import { useAuth } from '@/context/auth-context';
import { Store as StoreIcon, UserCheck, Shield, Menu, ShoppingBag } from 'lucide-react';

interface HeaderProps {
  onToggleSidebar?: () => void;
}

export function Header({ onToggleSidebar }: HeaderProps) {
  const { activeStore, availableStores, setActiveStore } = useStore();
  const { user, profiles, switchUser } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur transition-all dark:border-slate-800 dark:bg-slate-900/95 sm:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden"
          aria-label="Toggle Navigation Menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
            <ShoppingBag className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white hidden sm:inline">
            POS Warkop
          </span>
        </div>
      </div>

      {/* Center/Right Controls: Store Selector & User Account */}
      <div className="flex items-center gap-3">
        {/* Store Access Selector Dropdown */}
        <div className="relative flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 dark:border-slate-700 dark:bg-slate-800">
          <StoreIcon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 hidden md:inline">
            Toko:
          </span>
          <select
            value={activeStore.id}
            onChange={(e) => setActiveStore(e.target.value)}
            className="bg-transparent text-sm font-semibold text-slate-800 focus:outline-none dark:text-slate-100 cursor-pointer"
          >
            {availableStores.map((store) => (
              <option key={store.id} value={store.id} className="dark:bg-slate-800">
                {store.name}
              </option>
            ))}
          </select>
        </div>

        {/* Demo Role Switcher */}
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-800">
          <Shield className="h-4 w-4 text-amber-500" />
          <select
            value={user.id}
            onChange={(e) => switchUser(e.target.value)}
            className="bg-transparent text-xs font-medium text-slate-700 focus:outline-none dark:text-slate-200 cursor-pointer"
            title="Switch demo user profile"
          >
            {profiles.map((p) => (
              <option key={p.id} value={p.id} className="dark:bg-slate-800">
                {p.full_name} ({p.role.toUpperCase()})
              </option>
            ))}
          </select>
        </div>

        {/* User Badge */}
        <div className="hidden sm:flex items-center gap-2 pl-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
            <UserCheck className="h-4 w-4" />
          </div>
        </div>
      </div>
    </header>
  );
}
