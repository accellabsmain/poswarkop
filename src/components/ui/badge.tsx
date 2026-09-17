import React from 'react';
import { ProductStatus, SaleStatus, UserRole } from '@/types';

interface StatusBadgeProps {
  status: ProductStatus | SaleStatus | UserRole | string;
  className?: string;
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  let badgeStyle = 'bg-slate-100 text-slate-700 border-slate-200';
  let label = status;

  switch (status) {
    case 'NORMAL':
      badgeStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800';
      label = 'Normal';
      break;
    case 'LOW_STOCK':
      badgeStyle = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800';
      label = 'Stok Menipis';
      break;
    case 'OUT_OF_STOCK':
      badgeStyle = 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800';
      label = 'Habis';
      break;
    case 'COMPLETED':
      badgeStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800';
      label = 'Selesai';
      break;
    case 'CANCELLED':
      badgeStyle = 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800';
      label = 'Dibatalkan';
      break;
    case 'PENDING':
      badgeStyle = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800';
      label = 'Pending';
      break;
    case 'owner':
      badgeStyle = 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800';
      label = 'Owner';
      break;
    case 'manager':
      badgeStyle = 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800';
      label = 'Manager';
      break;
    case 'cashier':
      badgeStyle = 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800';
      label = 'Kasir';
      break;
    default:
      break;
  }

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold transition-colors ${badgeStyle} ${className}`}
    >
      {label}
    </span>
  );
}
