import type { RoomSite } from '../types';

export const SITE_ORDER: RoomSite[] = ['studio', 'office', 'family', 'etc'];

export const SITE_LABELS: Record<RoomSite, string> = {
  studio: '작업실',
  office: '회사',
  family: '본가',
  etc: '미분류',
};

export const SITE_BADGE_CLASS: Record<RoomSite, string> = {
  studio: 'bg-accent-primary/10 text-accent-secondary',
  office: 'bg-info-soft text-info-text',
  family: 'bg-warning-soft text-warning-text',
  etc: 'bg-bg-tertiary text-text-tertiary',
};

export function nextSite(site: RoomSite): RoomSite {
  const index = SITE_ORDER.indexOf(site);
  return SITE_ORDER[(index + 1) % SITE_ORDER.length];
}
