import { createClient } from './server';
import { Store, UserProfile, UserRole } from '@/types';

/**
 * ============================================================================
 * SERVER-SIDE AUTH & ROLE VERIFICATION HELPERS (TASK 2.3)
 * Author: Lintang (Backend & Database Engineer)
 * ============================================================================
 * Helper khusus server (Server Components, Server Actions, Route Handlers)
 * untuk memverifikasi session, profil, role, dan hak akses toko pengguna.
 */

/**
 * 1. Ambil Session Server Aktif
 */
export async function getServerSession() {
  const supabase = await createClient();
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) {
    console.error('Error fetching server session:', error.message);
    return null;
  }
  return session;
}

/**
 * 2. Ambil Authenticated User dari Supabase Auth
 * Memvalidasi token JWT pengguna secara aman di sisi server.
 */
export async function getServerUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return null;
  }
  return user;
}

/**
 * 3. Ambil Profil Lengkap Pengguna (Beserta Role & Akses Toko)
 */
export async function getServerProfile(): Promise<UserProfile | null> {
  const user = await getServerUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      id,
      full_name,
      role,
      created_at,
      user_stores (
        store:stores (*)
      )
    `)
    .eq('id', user.id)
    .single();

  if (error || !data) {
    console.error('Error fetching server profile:', error?.message);
    return null;
  }

  return {
    id: data.id,
    full_name: data.full_name,
    role: data.role as UserRole,
    created_at: data.created_at,
    stores: data.user_stores?.map((us: any) => us.store).filter(Boolean) || [],
  };
}

/**
 * 4. Ambil Daftar Toko yang Boleh Diakses Pengguna Aktif
 * - Role 'owner': Berhak mengakses semua toko yang aktif di sistem.
 * - Role 'manager' / 'cashier': Hanya toko yang ditugaskan di tabel `user_stores`.
 */
export async function getServerUserStores(): Promise<Store[]> {
  const profile = await getServerProfile();
  if (!profile) return [];

  const supabase = await createClient();

  if (profile.role === 'owner') {
    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .order('name');
    if (error) {
      console.error('Error fetching all stores for owner:', error.message);
      return [];
    }
    return data || [];
  }

  return profile.stores || [];
}

/**
 * 5. Guard Role Server-side (requireRole)
 * Memastikan user login dan memiliki salah satu dari peran yang diizinkan (`allowedRoles`).
 * Melempar error 'Unauthorized' atau 'Forbidden' jika tidak memenuhi syarat.
 */
export async function requireRole(allowedRoles: UserRole[]): Promise<UserProfile> {
  const profile = await getServerProfile();
  if (!profile) {
    throw new Error('UNAUTHORIZED: Sesi login tidak ditemukan atau telah kedaluwarsa.');
  }

  if (!allowedRoles.includes(profile.role)) {
    throw new Error(
      `FORBIDDEN: Akses ditolak. Role '${profile.role}' tidak memiliki izin untuk tindakan ini. Diperlukan role: ${allowedRoles.join(', ')}.`
    );
  }

  return profile;
}

/**
 * 6. Guard Hak Akses Toko (requireStoreAccess)
 * Memastikan user yang terotentikasi berhak melakukan transaksi pada toko spesifik.
 */
export async function requireStoreAccess(storeId: string): Promise<UserProfile> {
  const profile = await getServerProfile();
  if (!profile) {
    throw new Error('UNAUTHORIZED: Sesi login tidak ditemukan.');
  }

  // Owner memiliki bypass akses ke seluruh toko
  if (profile.role === 'owner') {
    return profile;
  }

  const hasAccess = profile.stores?.some((s) => s.id === storeId);
  if (!hasAccess) {
    throw new Error(
      `FORBIDDEN: Akses ditolak. Anda tidak ditugaskan pada toko dengan ID '${storeId}'.`
    );
  }

  return profile;
}
