import { createClient } from '@supabase/supabase-js';

/**
 * ============================================================================
 * SUPABASE ADMIN / SERVICE ROLE CLIENT (TASK 5.1)
 * Author: Lintang (Backend & Database Engineer)
 * ============================================================================
 * Client ini khusus digunakan pada server-side (Server Actions / Route Handlers)
 * dengan Service Role Key untuk operasi administratif pengguna, pembagian peran,
 * dan modifikasi data yang membypass Row Level Security (RLS).
 *
 * PERINGATAN: JANGAN PERNAH MENGEKSPOS CLIENT INI KE BROWSER / CLIENT COMPONENTS!
 */

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Konfigurasi Supabase URL atau Key belum diset pada environment variable.'
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
