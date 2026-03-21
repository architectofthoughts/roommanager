import type { ItemStatus, StorageItem } from '../types';

export const ITEM_CATEGORIES = ['의류', '책', '전자기기', '식품', '생활용품', '문구', '주방용품', '기타'] as const;

export const ITEM_STATUS_OPTIONS: Array<{ value: ItemStatus; label: string }> = [
  { value: 'stored', label: '보관중' },
  { value: 'low-stock', label: '부족' },
  { value: 'to-buy', label: '구매 필요' },
  { value: 'packed', label: '포장 완료' },
];

export const ITEM_STATUS_META: Record<ItemStatus, {
  label: string;
  bg: string;
  text: string;
  border: string;
}> = {
  stored: {
    label: '보관중',
    bg: 'var(--color-success-soft)',
    text: 'var(--color-success-text)',
    border: 'color-mix(in srgb, var(--color-success-text) 22%, transparent)',
  },
  'low-stock': {
    label: '부족',
    bg: 'var(--color-warning-soft)',
    text: 'var(--color-warning-text)',
    border: 'color-mix(in srgb, var(--color-warning-text) 22%, transparent)',
  },
  'to-buy': {
    label: '구매 필요',
    bg: 'var(--color-danger-soft)',
    text: 'var(--color-danger-text)',
    border: 'color-mix(in srgb, var(--color-danger-text) 22%, transparent)',
  },
  packed: {
    label: '포장 완료',
    bg: 'var(--color-info-soft)',
    text: 'var(--color-info-text)',
    border: 'color-mix(in srgb, var(--color-info-text) 22%, transparent)',
  },
};

export const ATTENTION_ITEM_STATUSES: ItemStatus[] = ['low-stock', 'to-buy', 'packed'];

export function matchesItemSearch(item: StorageItem, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const statusLabel = ITEM_STATUS_META[item.status]?.label.toLowerCase() ?? '';

  return (
    item.name.toLowerCase().includes(q) ||
    item.category.toLowerCase().includes(q) ||
    item.memo.toLowerCase().includes(q) ||
    statusLabel.includes(q)
  );
}
