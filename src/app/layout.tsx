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
      <body className="antialiased bg-white text-[#0a1317]">
        {children}
      </body>
    </html>
  );
}
