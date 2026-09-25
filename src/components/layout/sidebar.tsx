'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Boxes,
  Receipt,
  Users,
  LogOut,
  X,
  Shield,
  UserCheck,
  Store as StoreIcon,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useStore } from '@/context/store-context';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, profiles, switchUser, isManager, isOwner, logout } = useAuth();
  const { activeStore, availableStores, setActiveStore } = useStore();

  const navItems = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      show: true,
    },
    {
      label: 'POS Kasir',
      href: '/pos',
      icon: ShoppingCart,
      show: true,
    },
    {
      label: 'Produk Katalog',
      href: '/products',
      icon: Package,
      show: isManager,
    },
    {
      label: 'Stok Inventory',
      href: '/inventory',
      icon: Boxes,
      show: isManager,
    },
    {
      label: 'Riwayat Penjualan',
      href: '/sales',
      icon: Receipt,
      show: true,
    },
    {
      label: 'Manajemen Pegawai',
      href: '/users',
      icon: Users,
      show: isOwner,
    },
  ];

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-100 text-purple-700';
      case 'manager':
        return 'bg-blue-100 text-[#0064e0]';
      case 'cashier':
      default:
        return 'bg-emerald-100 text-emerald-700';
    }
  };

  return (
    <>
      {/* Backdrop Overlay for Hamburger Drawer */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#0a1317]/40 backdrop-blur-xs transition-opacity"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-72 flex-col border-r border-[#dee3e9] bg-white shadow-2xl transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header inside Sidebar */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-[#dee3e9]">
          <span className="text-lg font-black tracking-tight text-[#0a1317]">
            POS Warkop
          </span>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-[#5d6c7b] hover:bg-[#f1f4f7] transition-colors"
            aria-label="Tutup Menu Navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Profile & Demo Role Switcher Section (Prominent in Mobile Drawer) */}
        <div className="p-4 border-b border-[#dee3e9] bg-[#f1f4f7]">
          <div className="flex items-center gap-3 mb-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0a1317] font-bold text-white text-xs shrink-0">
              <UserCheck className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-[#0a1317] truncate">
                {user.full_name}
              </p>
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${getRoleBadgeStyle(
                  user.role
                )}`}
              >
                {user.role}
              </span>
            </div>
          </div>

          {/* Role Switcher Select */}
          <div className="mt-2 space-y-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[#5d6c7b]">
              Ganti Role (Demo Mode):
            </label>
            <div className="flex items-center gap-2 rounded-2xl border border-[#dee3e9] bg-white px-3 py-2 text-xs font-bold text-[#0a1317]">
              <Shield className="h-4 w-4 text-[#f7b928] shrink-0" />
              <select
                value={user.id}
                onChange={(e) => switchUser(e.target.value)}
                className="w-full bg-transparent text-xs font-bold text-[#0a1317] focus:outline-none cursor-pointer"
              >
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name} ({p.role.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <div>
            <p className="px-4 text-[11px] font-extrabold uppercase tracking-wider text-[#8595a4] mb-2">
              Menu Utama
            </p>
            <nav className="space-y-1">
              {navItems
                .filter((item) => item.show)
                .map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={`flex items-center gap-3.5 rounded-full px-4 py-2.5 text-xs font-bold transition-all ${
                        isActive
                          ? 'bg-[#0a1317] text-white shadow-sm'
                          : 'text-[#1c1e21] hover:bg-[#f1f4f7] hover:text-[#0a1317]'
                      }`}
                    >
                      <Icon className={`h-4.5 w-4.5 ${isActive ? 'text-white' : 'text-[#5d6c7b]'}`} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
            </nav>
          </div>
        </div>

        {/* Always Available Logout Button */}
        <div className="border-t border-[#dee3e9] p-4">
          <button
            onClick={() => {
              onClose?.();
              logout();
            }}
            className="flex w-full items-center justify-center gap-2.5 rounded-full bg-[#e41e3f] hover:bg-[#c31835] px-4 py-3 text-xs font-extrabold text-white shadow-sm transition-all active:scale-98"
          >
            <LogOut className="h-4 w-4" />
            <span>Keluar / Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
