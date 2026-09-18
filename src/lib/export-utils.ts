import { Sale, InventoryItem, Product, LowStockProduct } from '@/types';

/**
 * Triggers a browser download of a CSV file.
 */
export function downloadCSV(filename: string, csvContent: string): void {
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Helper to escape CSV cell content safely.
 */
function escapeCSVCell(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return '""';
  const str = String(value).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Export Sales History to CSV
 */
export function exportSalesToCSV(sales: Sale[], storeName?: string): void {
  const headers = [
    'No Transaksi',
    'Tanggal & Waktu',
    'Toko',
    'Kasir',
    'Metode Pembayaran',
    'Total Amount (Rp)',
    'Status Transaksi',
    'Catatan',
  ];

  const rows = sales.map((sale) => [
    escapeCSVCell(sale.transaction_number),
    escapeCSVCell(
      new Date(sale.created_at).toLocaleString('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    ),
    escapeCSVCell(sale.store_name || storeName || 'POS Warkop'),
    escapeCSVCell(sale.cashier_name || 'Kasir'),
    escapeCSVCell(sale.payment_method),
    escapeCSVCell(sale.total_amount),
    escapeCSVCell(sale.status),
    escapeCSVCell(sale.notes || '-'),
  ]);

  const csvLines = [headers.join(','), ...rows.map((r) => r.join(','))];
  const dateStr = new Date().toISOString().slice(0, 10);
  const fileName = `Laporan_Penjualan_${storeName ? storeName.replace(/\s+/g, '_') : 'Semua_Toko'}_${dateStr}.csv`;

  downloadCSV(fileName, csvLines.join('\n'));
}

/**
 * Export Inventory Balance to CSV
 */
export function exportInventoryToCSV(
  inventory: (InventoryItem & { product: Product })[],
  storeName?: string
): void {
  const headers = [
    'Nama Produk',
    'SKU',
    'Barcode',
    'Kategori',
    'Satuan',
    'Harga Beli (Rp)',
    'Harga Jual (Rp)',
    'Stok Minimal',
    'Stok Toko Saat Ini',
    'Status Stok',
  ];

  const rows = inventory.map((item) => [
    escapeCSVCell(item.product.name),
    escapeCSVCell(item.product.sku),
    escapeCSVCell(item.product.barcode || '-'),
    escapeCSVCell(item.product.category_name || 'Uncategorized'),
    escapeCSVCell(item.product.unit),
    escapeCSVCell(item.product.purchase_price),
    escapeCSVCell(item.product.selling_price),
    escapeCSVCell(item.product.minimum_stock),
    escapeCSVCell(item.quantity),
    escapeCSVCell(item.status || 'NORMAL'),
  ]);

  const csvLines = [headers.join(','), ...rows.map((r) => r.join(','))];
  const dateStr = new Date().toISOString().slice(0, 10);
  const fileName = `Laporan_Stok_Inventaris_${storeName ? storeName.replace(/\s+/g, '_') : 'Toko'}_${dateStr}.csv`;

  downloadCSV(fileName, csvLines.join('\n'));
}

/**
 * Export Low Stock Alert Items to CSV
 */
export function exportLowStockToCSV(items: LowStockProduct[], storeName?: string): void {
  const headers = [
    'Nama Produk',
    'SKU',
    'Kategori',
    'Satuan',
    'Harga Jual (Rp)',
    'Stok Saat Ini',
    'Minimum Stok',
    'Status Peringatan',
  ];

  const rows = items.map((item) => [
    escapeCSVCell(item.product_name),
    escapeCSVCell(item.sku),
    escapeCSVCell(item.category_name),
    escapeCSVCell(item.unit),
    escapeCSVCell(item.selling_price),
    escapeCSVCell(item.current_stock),
    escapeCSVCell(item.minimum_stock),
    escapeCSVCell(item.status),
  ]);

  const csvLines = [headers.join(','), ...rows.map((r) => r.join(','))];
  const dateStr = new Date().toISOString().slice(0, 10);
  const fileName = `Laporan_Stok_Menipis_${storeName ? storeName.replace(/\s+/g, '_') : 'Toko'}_${dateStr}.csv`;

  downloadCSV(fileName, csvLines.join('\n'));
}
