interface KVNamespaceLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
}

export interface PinBackupEnv {
  ROOMMANAGER_PIN_STORE?: KVNamespaceLike;
}

interface RoomManagerBackupLike {
  app: 'roommanager';
  version: 1;
  exportedAt: string;
  themeMode: 'light' | 'dark';
  data: {
    rooms: unknown[];
    activeRoomId: string;
  };
}

export interface StoredPinBackupRecord {
  pin: string;
  savedAt: string;
  backup: RoomManagerBackupLike;
}

const PIN_PATTERN = /^\d{4}$/;

export function json(payload: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(payload), {
    ...init,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...init?.headers,
    },
  });
}

export function createPinStorageKey(pin: string) {
  return `pin-backup:${pin}`;
}

export function isValidPin(pin: string) {
  return PIN_PATTERN.test(pin);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isRoomManagerBackup(value: unknown): value is RoomManagerBackupLike {
  if (!isRecord(value)) return false;
  if (value.app !== 'roommanager' || value.version !== 1) return false;
  if (typeof value.exportedAt !== 'string') return false;
  if (value.themeMode !== 'light' && value.themeMode !== 'dark') return false;
  if (!isRecord(value.data)) return false;
  if (!Array.isArray(value.data.rooms)) return false;
  return typeof value.data.activeRoomId === 'string';
}

export function getPinStore(env: PinBackupEnv) {
  return env.ROOMMANAGER_PIN_STORE ?? null;
}
