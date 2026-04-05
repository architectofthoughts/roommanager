import type { ThemeMode } from '../types';

export interface BackupPreview {
  format: 'backup' | 'workspace' | 'legacy';
  roomCount: number;
  furnitureCount: number;
  itemCount: number;
  roomNames: string[];
  exportedAt?: string;
  themeMode?: ThemeMode;
}

const REMOTE_PIN_PATTERN = /^\d{4}$/;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getRoomSummary(room: unknown) {
  if (!isRecord(room)) return { furnitureCount: 0, itemCount: 0, name: '이름 없는 방' };

  return {
    furnitureCount: Array.isArray(room.furniture) ? room.furniture.length : 0,
    itemCount: Array.isArray(room.items) ? room.items.length : 0,
    name: typeof room.name === 'string' && room.name.trim() ? room.name.trim() : '이름 없는 방',
  };
}

export function parseBackupPreview(payload: unknown): BackupPreview | null {
  if (!isRecord(payload)) return null;

  if (payload.app === 'roommanager' && payload.version === 1 && isRecord(payload.data)) {
    const nested = parseBackupPreview(payload.data);
    if (!nested) return null;
    return {
      ...nested,
      format: 'backup',
      exportedAt: typeof payload.exportedAt === 'string' ? payload.exportedAt : undefined,
      themeMode: payload.themeMode === 'dark' || payload.themeMode === 'light' ? payload.themeMode : undefined,
    };
  }

  if (Array.isArray(payload.rooms)) {
    const roomSummaries = payload.rooms.map(getRoomSummary);
    return {
      format: 'workspace',
      roomCount: roomSummaries.length,
      furnitureCount: roomSummaries.reduce((sum, room) => sum + room.furnitureCount, 0),
      itemCount: roomSummaries.reduce((sum, room) => sum + room.itemCount, 0),
      roomNames: roomSummaries.map((room) => room.name),
    };
  }

  if ('name' in payload || 'gridWidth' in payload || 'gridHeight' in payload || 'furniture' in payload || 'items' in payload) {
    const room = getRoomSummary(payload);
    return {
      format: 'legacy',
      roomCount: 1,
      furnitureCount: room.furnitureCount,
      itemCount: room.itemCount,
      roomNames: [room.name],
    };
  }

  return null;
}

export function formatBackupDateTime(value?: string) {
  if (!value) return '알 수 없음';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '알 수 없음';

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function createBackupFilename() {
  return `roommanager-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
}

export function sanitizeRemotePin(value: string) {
  return value.replace(/\D/g, '').slice(0, 4);
}

export function isValidRemotePin(value: string) {
  return REMOTE_PIN_PATTERN.test(value);
}
