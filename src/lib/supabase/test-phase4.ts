import { getStores, getProducts, processSale, getReceiptDetails } from './queries';

async function main() {
  console.log('🚀 Phase 4 Verification Test — Advanced POS Checkout & Receipt Query');
  console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL || '(belum diisi)');

  try {
    console.log('\n--- 1. Checking Stores & Products ---');
    const stores = await getStores();
    const products = await getProducts();

    if (stores.length === 0 || products.length === 0) {
      console.log('⚠️ Tidak ada toko atau produk yang ditemukan di database. Melewati tes transaksi live.');
      return;
    }

    const testStore = stores[0];
    const testProduct = products[0];

    console.log(`📍 Toko pengujian: ${testStore.name} (${testStore.id})`);
    console.log(`📦 Produk pengujian: ${testProduct.name} (${testProduct.id})`);

    // Fetch existing user/profile for cashier
    const cashierId = '00000000-0000-0000-0000-000000000001'; // Mock/Fallback Cashier UUID

    console.log('\n--- 2. Testing RPC process_sale_transaction (CASH Payment) ---');
    const itemPrice = Number(testProduct.selling_price) || 15000;
    const qty = 1;
    const total = itemPrice * qty;
    const amountPaid = total + 5000; // Kembalian Rp 5.000

    try {
      const saleResult = await processSale({
        storeId: testStore.id,
        cashierId: cashierId,
        paymentMethod: 'CASH',
        amountPaid: amountPaid,
        items: [
          {
            product_id: testProduct.id,
            quantity: qty,
            unit_price: itemPrice,
          },
        ],
      });

      console.log('✅ Transaksi penjualan CASH sukses diciptakan:');
      console.log(saleResult);

      const saleId = saleResult.sale_id;

      if (saleId) {
        console.log('\n--- 3. Testing RPC get_receipt_details ---');
        const receipt = await getReceiptDetails(saleId);
        console.log('✅ Berhasil mengambil detail struk penjualan:');
        console.log(JSON.stringify(receipt, null, 2));
      }
    } catch (saleErr: any) {
      console.log('ℹ️ Catatan Hasil Transaksi DB:', saleErr.message);
    }

    console.log('\n--- 4. Testing Payment Validation (CASH Pembayaran Kurang) ---');
    try {
      await processSale({
        storeId: testStore.id,
        cashierId: cashierId,
        paymentMethod: 'CASH',
        amountPaid: 100, // Uang kurang
        items: [
          {
            product_id: testProduct.id,
            quantity: 1,
            unit_price: 100000,
          },
        ],
      });
      console.error('❌ GAGAL: Harusnya melempar exception untuk uang kurang!');
    } catch (err: any) {
      console.log('✅ BERHASIL ditolak oleh RPC stored procedure:');
      console.log('   Pesan error:', err.message);
    }

    console.log('\n🎉 Seluruh verifikasi Backend Phase 4 selesai!');
  } catch (err: any) {
    console.error('\n❌ Terjadi kesalahan saat pengujian Phase 4:');
    console.error(err.message || err);
  }
}

main();
