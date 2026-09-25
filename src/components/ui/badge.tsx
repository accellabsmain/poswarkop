import React from 'react';
import { ProductStatus, SaleStatus, UserRole } from '@/types';

interface StatusBadgeProps {
  status: ProductStatus | SaleStatus | UserRole | string;
  className?: string;
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  let badgeStyle = 'bg-[#f1f4f7] text-[#0a1317] border border-[#dee3e9]';
  let label = status;

  switch (status) {
    case 'NORMAL':
      badgeStyle = 'bg-[#31a24c] text-white border-transparent';
      label = 'Normal';
      break;
    case 'LOW_STOCK':
      badgeStyle = 'bg-[#f7b928] text-[#0a1317] border-transparent font-extrabold';
      label = 'Stok Menipis';
      break;
    case 'OUT_OF_STOCK':
      badgeStyle = 'bg-[#e41e3f] text-white border-transparent';
      label = 'Habis';
      break;
    case 'COMPLETED':
      badgeStyle = 'bg-[#31a24c] text-white border-transparent';
      label = 'Selesai';
      break;
    case 'CANCELLED':
      badgeStyle = 'bg-[#e41e3f] text-white border-transparent';
      label = 'Dibatalkan';
      break;
    case 'PENDING':
      badgeStyle = 'bg-[#f7b928] text-[#0a1317] border-transparent font-extrabold';
      label = 'Pending';
      break;
    case 'owner':
      badgeStyle = 'bg-[#0a1317] text-white border-transparent';
      label = 'Owner';
      break;
    case 'manager':
      badgeStyle = 'bg-[#0064e0] text-white border-transparent';
      label = 'Manager';
      break;
    case 'cashier':
      badgeStyle = 'bg-[#f1f4f7] text-[#0a1317] border border-[#dee3e9]';
      label = 'Kasir';
      break;
    default:
      break;
  }

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-0.5 text-xs font-bold transition-all ${badgeStyle} ${className}`}
    >
      {label}
    </span>
  );
}
