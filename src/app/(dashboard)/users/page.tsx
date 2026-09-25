'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { StorageService } from '@/lib/storage-service';
import { UserProfile, UserRole, Store } from '@/types';
import { updateUserProfile, deleteUser } from '@/app/actions/user-management';
import {
  Users,
  UserPlus,
  ShieldAlert,
  ShieldCheck,
  Search,
  Plus,
  Edit,
  Trash2,
  X,
  Check,
  Store as StoreIcon,
  Briefcase,
  User,
} from 'lucide-react';

export default function UsersManagementPage() {
  const { isOwner } = useAuth();

  const [profiles, setProfiles] = useState<UserProfile[]>(() => StorageService.getProfiles());
  const stores: Store[] = StorageService.getStores();

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<UserProfile | null>(null);

  // Form State
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('cashier');
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Access Guard: If not owner, deny access
  if (!isOwner) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 mb-4">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-[#0a1317]">Akses Dibatasi</h2>
        <p className="mt-1 text-sm text-slate-500 max-w-md">
          Halaman Manajemen Pegawai hanya dapat diakses oleh pengguna dengan hak akses <strong>Owner</strong>.
        </p>
      </div>
    );
  }

  const refreshProfiles = () => {
    setProfiles(StorageService.getProfiles());
  };

  const openAddModal = () => {
    setEditingProfile(null);
    setFullName('');
    setRole('cashier');
    setSelectedStoreIds(stores[0] ? [stores[0].id] : []);
    setErrorMessage('');
    setIsModalOpen(true);
  };

  const openEditModal = (profile: UserProfile) => {
    setEditingProfile(profile);
    setFullName(profile.full_name);
    setRole(profile.role);
    setSelectedStoreIds(profile.stores?.map((s) => s.id) || []);
    setErrorMessage('');
    setIsModalOpen(true);
  };

  const handleToggleStore = (storeId: string) => {
    if (selectedStoreIds.includes(storeId)) {
      setSelectedStoreIds(selectedStoreIds.filter((id) => id !== storeId));
    } else {
      setSelectedStoreIds([...selectedStoreIds, storeId]);
    }
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!fullName.trim()) {
      setErrorMessage('Nama lengkap pegawai wajib diisi.');
      return;
    }

    if (selectedStoreIds.length === 0) {
      setErrorMessage('Pilih setidaknya 1 toko untuk alokasi akses pegawai.');
      return;
    }

    const assignedStores = stores.filter((s) => selectedStoreIds.includes(s.id));

    // 1. Simpan di StorageService untuk instant UI update & offline mock support
    const saved = StorageService.saveProfile({
      id: editingProfile?.id,
      full_name: fullName.trim(),
      role,
      stores: assignedStores,
    });

    // 2. Sinkronkan ke Supabase Cloud via Server Action (Task 5.1)
    if (editingProfile?.id) {
      updateUserProfile({
        userId: editingProfile.id,
        fullName: fullName.trim(),
        role,
        storeIds: selectedStoreIds,
      }).catch((err) => {
        console.warn('Notice: Supabase server action skipped/offline:', err?.message || err);
      });
    }

    refreshProfiles();
    setIsModalOpen(false);
    setSuccessMessage(
      editingProfile
        ? `Berhasil memperbarui data pegawai "${fullName}"`
        : `Berhasil menambahkan akun pegawai baru "${fullName}"`
    );

    setTimeout(() => setSuccessMessage(''), 4000);
  };

  const handleDeleteUser = (profile: UserProfile) => {
    if (profile.role === 'owner' && profiles.filter((p) => p.role === 'owner').length <= 1) {
      alert('Tidak dapat menghapus akun Owner terakhir!');
      return;
    }

    if (confirm(`Apakah Anda yakin ingin menghapus pegawai "${profile.full_name}"?`)) {
      // 1. Hapus dari LocalStorage
      StorageService.deleteProfile(profile.id);
      refreshProfiles();

      // 2. Sinkronkan penghapusan ke Supabase Cloud via Server Action (Task 5.1)
      if (profile.id && !profile.id.startsWith('user-')) {
        deleteUser(profile.id).catch((err) => {
          console.warn('Notice: Supabase delete action skipped/offline:', err?.message || err);
        });
      }

      setSuccessMessage(`Pegawai "${profile.full_name}" telah dihapus.`);
      setTimeout(() => setSuccessMessage(''), 4000);
    }
  };

  // Filtered profiles
  const filteredProfiles = profiles.filter((p) => {
    const matchesSearch = p.full_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || p.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // Stats calculation
  const totalUsers = profiles.length;
  const ownerCount = profiles.filter((p) => p.role === 'owner').length;
  const managerCount = profiles.filter((p) => p.role === 'manager').length;
  const cashierCount = profiles.filter((p) => p.role === 'cashier').length;

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'owner':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-700">
            <ShieldCheck className="h-3.5 w-3.5" /> Owner
          </span>
        );
      case 'manager':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-[#0064e0]">
            <Briefcase className="h-3.5 w-3.5" /> Manager
          </span>
        );
      case 'cashier':
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
            <User className="h-3.5 w-3.5" /> Kasir
          </span>
        );
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0064e0]/10 text-[#0064e0]">
              <Users className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold text-[#0a1317]">
              Manajemen Pegawai
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Kelola data staf, penambahan akun pegawai baru, dan alokasi hak akses toko.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0064e0] px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-[#0052b8] active:scale-[0.98] transition-all"
        >
          <UserPlus className="h-4 w-4" />
          <span>Tambah Pegawai Baru</span>
        </button>
      </div>

      {/* Success Banner */}
      {successMessage && (
        <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 p-4 text-xs font-semibold text-emerald-700 border border-emerald-200">
          <Check className="h-5 w-5 text-emerald-500 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-3xl border border-[#dee3e9] bg-white p-5 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Total Pegawai</p>
          <p className="mt-1 text-2xl font-bold text-[#0a1317]">{totalUsers}</p>
        </div>
        <div className="rounded-3xl border border-[#dee3e9] bg-white p-5 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Owner</p>
          <p className="mt-1 text-2xl font-bold text-purple-600">
            {ownerCount}
          </p>
        </div>
        <div className="rounded-3xl border border-[#dee3e9] bg-white p-5 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Manager</p>
          <p className="mt-1 text-2xl font-bold text-[#0064e0]">
            {managerCount}
          </p>
        </div>
        <div className="rounded-3xl border border-[#dee3e9] bg-white p-5 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Kasir</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">
            {cashierCount}
          </p>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama pegawai..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-full border border-[#dee3e9] bg-[#f1f4f7] pl-11 pr-4 py-2.5 text-xs font-medium text-[#0a1317] placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#0064e0] transition-colors"
          />
        </div>

        <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {['all', 'owner', 'manager', 'cashier'].map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`rounded-full px-4 py-2 text-xs font-semibold capitalize transition-all shrink-0 ${
                roleFilter === r
                  ? 'bg-[#0a1317] text-white shadow-sm'
                  : 'bg-white border border-[#dee3e9] text-slate-600 hover:bg-[#f1f4f7]'
              }`}
            >
              {r === 'all' ? 'Semua Role' : r}
            </button>
          ))}
        </div>
      </div>

      {/* Employee List Table */}
      <div className="rounded-3xl border border-[#dee3e9] bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#dee3e9] bg-[#f1f4f7] text-slate-500 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-6 py-4">Pegawai</th>
                <th className="px-6 py-4">Role / Hak Akses</th>
                <th className="px-6 py-4">Alokasi Toko</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#dee3e9] font-medium">
              {filteredProfiles.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                    Tidak ada data pegawai yang ditemukan.
                  </td>
                </tr>
              ) : (
                filteredProfiles.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-[#f1f4f7]/60 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#f1f4f7] text-[#0a1317] font-bold border border-[#dee3e9]">
                          {p.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-[#0a1317] text-sm">
                            {p.full_name}
                          </p>
                          <p className="text-[11px] text-slate-400 font-mono mt-0.5">{p.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">{getRoleBadge(p.role)}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {p.stores && p.stores.length > 0 ? (
                          p.stores.map((s) => (
                            <span
                              key={s.id}
                              className="inline-flex items-center gap-1 rounded-full bg-[#f1f4f7] border border-[#dee3e9] px-3 py-1 text-[11px] font-semibold text-slate-700"
                            >
                              <StoreIcon className="h-3 w-3 text-[#0064e0]" />
                              {s.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 italic">Semua Toko</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(p)}
                          className="rounded-full p-2 text-slate-500 hover:bg-[#f1f4f7] hover:text-[#0064e0] transition-colors"
                          title="Edit Pegawai"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(p)}
                          className="rounded-full p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                          title="Hapus Pegawai"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add/Edit Employee */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-[#dee3e9]">
            <div className="flex items-center justify-between pb-4 border-b border-[#dee3e9]">
              <h3 className="text-base font-bold text-[#0a1317]">
                {editingProfile ? 'Edit Akun Pegawai' : 'Tambah Pegawai Baru'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-full p-2 text-slate-400 hover:bg-[#f1f4f7] hover:text-[#0a1317] transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="mt-4 rounded-2xl bg-rose-50 p-3 text-xs font-semibold text-rose-600 border border-rose-200">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSaveUser} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  placeholder="misal: Budi Santoso"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-2xl border border-[#dee3e9] bg-[#f1f4f7] px-4 py-2.5 text-xs font-medium text-[#0a1317] focus:bg-white focus:outline-none focus:border-[#0064e0] transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Role Akses
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full rounded-2xl border border-[#dee3e9] bg-[#f1f4f7] px-4 py-2.5 text-xs font-semibold text-[#0a1317] focus:bg-white focus:outline-none focus:border-[#0064e0] transition-colors"
                >
                  <option value="cashier">Kasir - Hanya Akses Checkout POS</option>
                  <option value="manager">Manager - Akses Stok Inventaris & Produk</option>
                  <option value="owner">Owner - Akses Penuh All Dashboard</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Alokasi Akses Toko
                </label>
                <div className="space-y-2 rounded-2xl border border-[#dee3e9] p-3 bg-[#f1f4f7]">
                  {stores.map((s) => {
                    const isChecked = selectedStoreIds.includes(s.id);
                    return (
                      <label
                        key={s.id}
                        className="flex items-center justify-between p-2.5 rounded-xl border border-[#dee3e9] bg-white cursor-pointer hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <StoreIcon className="h-4 w-4 text-[#0064e0]" />
                          <span className="text-xs font-semibold text-[#0a1317]">
                            {s.name} ({s.code})
                          </span>
                        </div>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleStore(s.id)}
                          className="h-4 w-4 rounded text-[#0064e0] focus:ring-[#0064e0]"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 rounded-full border border-[#dee3e9] bg-white py-3 text-xs font-semibold text-slate-700 hover:bg-[#f1f4f7] transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-full bg-[#0064e0] py-3 text-xs font-semibold text-white shadow-sm hover:bg-[#0052b8] active:scale-[0.98] transition-all"
                >
                  {editingProfile ? 'Simpan Perubahan' : 'Tambah Pegawai'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
