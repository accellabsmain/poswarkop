import { getStores, getCategories, getProducts } from './queries';

async function main() {
  console.log('🔍 Menghubungi Supabase...');
  console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL || '(belum diisi)');

  try {
    console.log('\n--- 1. Testing getStores() ---');
    const stores = await getStores();
    console.log(`✅ Sukses! Ditemukan ${stores.length} toko:`);
    console.log(stores);

    console.log('\n--- 2. Testing getCategories() ---');
    const categories = await getCategories();
    console.log(`✅ Sukses! Ditemukan ${categories.length} kategori:`);
    console.log(categories);

    console.log('\n--- 3. Testing getProducts() ---');
    const products = await getProducts();
    console.log(`✅ Sukses! Ditemukan ${products.length} produk:`);
    console.log(products);

    console.log('\n🎉 Semua query Supabase berhasil dijalankan!');
  } catch (err: any) {
    console.error('\n❌ Terjadi kesalahan saat query ke Supabase:');
    console.error(err.message || err);
  }
}

main();
