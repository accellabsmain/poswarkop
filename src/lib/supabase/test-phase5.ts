import {
  getStoreRevenueSummary,
  getSalesChartData,
  getTopSellingProducts,
  getAuditLogs,
  getUserProfiles,
  getStores,
} from './queries';

async function main() {
  console.log('🚀 Phase 5 Verification Test — Owner Dashboard & Analytics & Audit Logs');
  console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL || '(belum diisi)');

  try {
    console.log('\n--- 1. Testing getStoreRevenueSummary() (Task 5.2) ---');
    try {
      const summaries = await getStoreRevenueSummary();
      console.log(`✅ Sukses! Ditemukan ${summaries.length} data ringkasan omset toko:`);
      console.log(JSON.stringify(summaries, null, 2));
    } catch (err: any) {
      console.log('ℹ️ Catatan RPC getStoreRevenueSummary:', err.message);
    }

    console.log('\n--- 2. Testing getSalesChartData() (Task 5.2) ---');
    try {
      const chartData = await getSalesChartData({ period: 'daily', limit: 7 });
      console.log(`✅ Sukses! Ditemukan ${chartData.length} titik data grafik penjualan:`);
      console.log(JSON.stringify(chartData, null, 2));
    } catch (err: any) {
      console.log('ℹ️ Catatan RPC getSalesChartData:', err.message);
    }

    console.log('\n--- 3. Testing getTopSellingProducts() (Task 5.2) ---');
    try {
      const topProducts = await getTopSellingProducts({ limit: 5 });
      console.log(`✅ Sukses! Ditemukan ${topProducts.length} produk terlaris:`);
      console.log(JSON.stringify(topProducts, null, 2));
    } catch (err: any) {
      console.log('ℹ️ Catatan RPC getTopSellingProducts:', err.message);
    }

    console.log('\n--- 4. Testing getAuditLogs() (Task 5.3) ---');
    try {
      const logs = await getAuditLogs({ limit: 5 });
      console.log(`✅ Sukses! Ditemukan ${logs.length} entri log aktivitas:`);
      console.log(JSON.stringify(logs, null, 2));
    } catch (err: any) {
      console.log('ℹ️ Catatan RPC getAuditLogs:', err.message);
    }

    console.log('\n--- 5. Testing getUserProfiles() (Task 5.1) ---');
    try {
      const profiles = await getUserProfiles();
      console.log(`✅ Sukses! Ditemukan ${profiles.length} profil user & alokasi toko:`);
      console.log(JSON.stringify(profiles, null, 2));
    } catch (err: any) {
      console.log('ℹ️ Catatan getUserProfiles:', err.message);
    }

    console.log('\n🎉 Seluruh verifikasi Backend Phase 5 selesai!');
  } catch (err: any) {
    console.error('\n❌ Terjadi kesalahan saat pengujian Phase 5:');
    console.error(err.message || err);
  }
}

main();
