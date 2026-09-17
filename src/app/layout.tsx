import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'POS Warkop - System POS & Inventory Management',
  description: 'Aplikasi Point of Sale dan Pengelolaan Stok Multi-Toko',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="antialiased bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        {children}
      </body>
    </html>
  );
}
