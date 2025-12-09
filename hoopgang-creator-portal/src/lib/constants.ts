// src/lib/constants.ts

import { CreatorStatus, ProductType, Size, Carrier } from '@/types';

export const CREATOR_STATUSES: Array<{ value: CreatorStatus; label: string; color: string }> = [
  { value: 'pending', label: 'Pending', color: 'yellow' },
  { value: 'denied', label: 'Denied', color: 'red' },
  { value: 'approved', label: 'Approved', color: 'blue' },
  { value: 'shipped', label: 'Shipped', color: 'purple' },
  { value: 'delivered', label: 'Delivered', color: 'green' },
  { value: 'completed', label: 'Completed', color: 'cyan' },
  { value: 'ghosted', label: 'Ghosted', color: 'red' },
];

export const PRODUCTS: Array<{ value: ProductType; label: string }> = [
  { value: 'Reversible Shorts', label: 'Reversible Shorts' },
  { value: 'Hoodies', label: 'Hoodies' },
  { value: 'Tees', label: 'Tees' },
  { value: 'Cropped Sweats', label: 'Cropped Sweats' },
];

export const SIZES: Array<{ value: Size; label: string }> = [
  { value: 'S', label: 'S' },
  { value: 'M', label: 'M' },
  { value: 'L', label: 'L' },
  { value: 'XL', label: 'XL' },
  { value: 'XXL', label: 'XXL' },
];

export const CARRIERS: Array<{ value: Carrier; label: string }> = [
  { value: 'yanwen', label: 'Yanwen' },
];

export const CONTENT_DEADLINE_DAYS = 14;
export const MAX_CONTENT_SUBMISSIONS = 3;

/**
 * Generates a creator display ID in the format "CRT-YYYY-XXX"
 * @returns A string like "CRT-2024-001"
 */
export function generateCreatorId(): string {
  const year = new Date().getFullYear();
  const randomNum = Math.floor(Math.random() * 900) + 100; // 100-999
  return `CRT-${year}-${randomNum.toString().padStart(3, '0')}`;
}

/**
 * Returns Tailwind CSS color classes based on creator status
 * @param status - The creator status
 * @returns Tailwind CSS classes for background and text color
 */
export function getStatusColor(status: CreatorStatus): string {
  const colorMap: Record<CreatorStatus, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    denied: 'bg-red-100 text-red-800',
    approved: 'bg-blue-100 text-blue-800',
    shipped: 'bg-purple-100 text-purple-800',
    delivered: 'bg-green-100 text-green-800',
    completed: 'bg-cyan-100 text-cyan-800',
    ghosted: 'bg-red-100 text-red-800',
  };
  return colorMap[status];
}

