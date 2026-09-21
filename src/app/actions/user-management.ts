'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireRole } from '@/lib/supabase/server-auth';
import { UserRole } from '@/types';

/**
 * ============================================================================
 * SERVER ACTIONS: USER & ROLE MANAGEMENT (TASK 5.1)
 * Author: Lintang (Backend & Database Engineer)
 * ============================================================================
 * Server actions ini diproteksi ketat di level server menggunakan requireRole(['owner']).
 * Menggunakan Supabase Service Role Client untuk mengubah profile dan user_stores.
 */

/**
 * 1. Assign Toko ke Pegawai (assignUserStore)
 */
export async function assignUserStore(userId: string, storeId: string) {
  const currentOwner = await requireRole(['owner']);
  const admin = createAdminClient();

  // Pastikan user dan toko valid
  const { data: store, error: storeErr } = await admin
    .from('stores')
    .select('name')
    .eq('id', storeId)
    .single();

  if (storeErr || !store) {
    throw new Error('Toko tidak ditemukan.');
  }

  // Insert ke user_stores (upsert ignore conflict)
  const { error } = await admin
    .from('user_stores')
    .upsert({ user_id: userId, store_id: storeId }, { onConflict: 'user_id,store_id' });

  if (error) {
    console.error('Error assigning user store:', error.message);
    throw new Error(`Gagal menugaskan toko: ${error.message}`);
  }

  // Catat Audit Log
  await admin.from('audit_logs').insert({
    user_id: currentOwner.id,
    store_id: storeId,
    action: 'ASSIGN_USER_STORE',
    entity: 'user_stores',
    entity_id: userId,
    metadata: { target_user_id: userId, store_id: storeId, store_name: store.name },
  });

  revalidatePath('/users');
  return { success: true, message: `Berhasil menugaskan toko ${store.name}.` };
}

/**
 * 2. Hapus Penugasan Toko dari Pegawai (removeUserStore)
 */
export async function removeUserStore(userId: string, storeId: string) {
  const currentOwner = await requireRole(['owner']);
  const admin = createAdminClient();

  const { error } = await admin
    .from('user_stores')
    .delete()
    .eq('user_id', userId)
    .eq('store_id', storeId);

  if (error) {
    console.error('Error removing user store:', error.message);
    throw new Error(`Gagal mencabut akses toko: ${error.message}`);
  }

  // Catat Audit Log
  await admin.from('audit_logs').insert({
    user_id: currentOwner.id,
    store_id: storeId,
    action: 'REMOVE_USER_STORE',
    entity: 'user_stores',
    entity_id: userId,
    metadata: { target_user_id: userId, store_id: storeId },
  });

  revalidatePath('/users');
  return { success: true, message: 'Berhasil mencabut akses toko pegawai.' };
}

/**
 * 3. Update Multi-Store Assignment Sekaligus (setUserStores)
 */
export async function setUserStores(userId: string, storeIds: string[]) {
  const currentOwner = await requireRole(['owner']);
  const admin = createAdminClient();

  // Hapus semua toko lama user ini
  const { error: delError } = await admin
    .from('user_stores')
    .delete()
    .eq('user_id', userId);

  if (delError) {
    console.error('Error clearing user stores:', delError.message);
    throw new Error(`Gagal mereset penugasan toko: ${delError.message}`);
  }

  // Tambahkan daftar toko baru jika ada
  if (storeIds.length > 0) {
    const insertPayload = storeIds.map((sId) => ({
      user_id: userId,
      store_id: sId,
    }));

    const { error: insError } = await admin
      .from('user_stores')
      .insert(insertPayload);

    if (insError) {
      console.error('Error inserting new user stores:', insError.message);
      throw new Error(`Gagal menyimpan toko baru: ${insError.message}`);
    }
  }

  // Catat Audit Log
  await admin.from('audit_logs').insert({
    user_id: currentOwner.id,
    action: 'SET_USER_STORES',
    entity: 'user_stores',
    entity_id: userId,
    metadata: { target_user_id: userId, assigned_stores: storeIds },
  });

  revalidatePath('/users');
  return { success: true, message: 'Berhasil memperbarui alokasi toko pegawai.' };
}

/**
 * 4. Update Role Pegawai (updateUserRole)
 */
export async function updateUserRole(userId: string, newRole: UserRole) {
  const currentOwner = await requireRole(['owner']);
  const admin = createAdminClient();

  // Cegah mengubah role owner menjadi kasir jika dia satu-satunya owner
  if (newRole !== 'owner') {
    const { data: ownerCount } = await admin
      .from('profiles')
      .select('id', { count: 'exact' })
      .eq('role', 'owner');

    const { data: targetProfile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (targetProfile?.role === 'owner' && (ownerCount?.length || 0) <= 1) {
      throw new Error('Tidak dapat mengubah role Owner terakhir di sistem!');
    }
  }

  const { error } = await admin
    .from('profiles')
    .update({ role: newRole })
    .eq('id', userId);

  if (error) {
    console.error('Error updating user role:', error.message);
    throw new Error(`Gagal mengubah role: ${error.message}`);
  }

  // Catat Audit Log
  await admin.from('audit_logs').insert({
    user_id: currentOwner.id,
    action: 'UPDATE_USER_ROLE',
    entity: 'profiles',
    entity_id: userId,
    metadata: { target_user_id: userId, new_role: newRole },
  });

  revalidatePath('/users');
  return { success: true, message: `Berhasil mengubah role pegawai menjadi ${newRole}.` };
}

/**
 * 5. Update Profil & Toko Pegawai Sekaligus (updateUserProfile)
 */
export async function updateUserProfile(params: {
  userId: string;
  fullName: string;
  role: UserRole;
  storeIds: string[];
}) {
  const currentOwner = await requireRole(['owner']);
  const admin = createAdminClient();

  const { userId, fullName, role, storeIds } = params;

  // 1. Update Profile
  const { error: profError } = await admin
    .from('profiles')
    .update({
      full_name: fullName.trim(),
      role: role,
    })
    .eq('id', userId);

  if (profError) {
    console.error('Error updating profile:', profError.message);
    throw new Error(`Gagal memperbarui profil: ${profError.message}`);
  }

  // 2. Set Stores
  await setUserStores(userId, storeIds);

  // 3. Catat Audit Log
  await admin.from('audit_logs').insert({
    user_id: currentOwner.id,
    action: 'UPDATE_USER_PROFILE',
    entity: 'profiles',
    entity_id: userId,
    metadata: {
      target_user_id: userId,
      full_name: fullName,
      role: role,
      store_count: storeIds.length,
    },
  });

  revalidatePath('/users');
  return { success: true, message: `Profil pegawai "${fullName}" berhasil disimpan.` };
}

/**
 * 6. Hapus Pegawai (deleteUser)
 */
export async function deleteUser(userId: string) {
  const currentOwner = await requireRole(['owner']);
  const admin = createAdminClient();

  // Validasi bukan owner terakhir
  const { data: targetProfile } = await admin
    .from('profiles')
    .select('full_name, role')
    .eq('id', userId)
    .single();

  if (!targetProfile) {
    throw new Error('Pegawai tidak ditemukan.');
  }

  if (targetProfile.role === 'owner') {
    const { data: ownerList } = await admin
      .from('profiles')
      .select('id')
      .eq('role', 'owner');

    if ((ownerList?.length || 0) <= 1) {
      throw new Error('Tidak dapat menghapus akun Owner terakhir di sistem!');
    }
  }

  // Hapus dari profiles (otomatis cascade ke user_stores jika FK cascade)
  const { error } = await admin
    .from('profiles')
    .delete()
    .eq('id', userId);

  if (error) {
    console.error('Error deleting profile:', error.message);
    throw new Error(`Gagal menghapus user: ${error.message}`);
  }

  // Catat Audit Log
  await admin.from('audit_logs').insert({
    user_id: currentOwner.id,
    action: 'DELETE_USER',
    entity: 'profiles',
    entity_id: userId,
    metadata: { target_user_name: targetProfile.full_name, deleted_role: targetProfile.role },
  });

  revalidatePath('/users');
  return { success: true, message: `Pegawai "${targetProfile.full_name}" berhasil dihapus.` };
}
