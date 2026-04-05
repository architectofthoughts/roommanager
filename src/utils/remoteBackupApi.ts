import type { RemoteBackupRecord, RemoteBackupSaveResult, RoomManagerBackup } from '../types';

const REMOTE_BACKUP_API_PATH = '/api/pin-backups';

async function getErrorMessage(response: Response) {
  try {
    const payload = await response.json() as { error?: string };
    if (payload.error) return payload.error;
  } catch {
    // Ignore JSON parse failures and fall back to status text.
  }

  return response.statusText || '요청을 처리하지 못했습니다.';
}

async function requestJson<T>(input: RequestInfo, init?: RequestInit) {
  const response = await fetch(input, init);
  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  return response.json() as Promise<T>;
}

export function saveBackupByPin(pin: string, backup: RoomManagerBackup) {
  return requestJson<RemoteBackupSaveResult>(REMOTE_BACKUP_API_PATH, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ pin, backup }),
  });
}

export function loadBackupByPin(pin: string) {
  return requestJson<RemoteBackupRecord>(`${REMOTE_BACKUP_API_PATH}/${pin}`);
}
