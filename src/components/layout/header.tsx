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
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-[#dee3e9] bg-white/95 px-4 backdrop-blur transition-all sm:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="flex items-center gap-2 rounded-full border border-[#dee3e9] bg-[#f1f4f7] px-3.5 py-1.5 text-[#0a1317] hover:bg-white transition-all shadow-xs"
          aria-label="Toggle Navigation Menu"
          title="Buka Menu Navigasi"
        >
          <Menu className="h-4 w-4 text-[#0064e0]" />
          <span className="text-xs font-bold hidden sm:inline text-[#0a1317]">Menu</span>
        </button>

        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0064e0] text-white shadow-sm">
            <ShoppingBag className="h-5 w-5" />
          </div>
          <span className="text-lg font-black tracking-tight text-[#0a1317] hidden md:inline">
            POS Warkop
          </span>
        </div>
      </div>

      {/* Center/Right Controls: Store Selector & User Account */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Store Access Selector Dropdown */}
        <div className="relative flex items-center gap-2 rounded-full border border-[#dee3e9] bg-[#f1f4f7] px-3 py-1.5 sm:px-3.5">
          <StoreIcon className="h-4 w-4 text-[#0064e0] shrink-0" />
          <span className="text-xs font-bold text-[#5d6c7b] hidden md:inline">
            Toko:
          </span>
          <select
            value={activeStore.id}
            onChange={(e) => setActiveStore(e.target.value)}
            className="bg-transparent text-xs font-bold text-[#0a1317] focus:outline-none cursor-pointer max-w-[130px] sm:max-w-xs truncate"
          >
            {availableStores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
        </div>

        {/* Demo Role Switcher Badge (Desktop only, mobile moved to Sidebar Drawer) */}
        <div className="hidden lg:flex items-center gap-2 rounded-full border border-[#dee3e9] bg-[#f1f4f7] px-3 py-1.5">
          <Shield className="h-4 w-4 text-[#f7b928] shrink-0" />
          <select
            value={user.id}
            onChange={(e) => switchUser(e.target.value)}
            className="bg-transparent text-xs font-bold text-[#0a1317] focus:outline-none cursor-pointer"
            title="Switch demo user profile"
          >
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name} ({p.role.toUpperCase()})
              </option>
            ))}
          </select>
        </div>

        {/* User Avatar Circle */}
        <div className="flex items-center gap-2 pl-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0a1317] font-bold text-white text-xs">
            <UserCheck className="h-4 w-4" />
          </div>
        </div>
      </div>
    </header>
  );
}
