import {
  getPinStore,
  createPinStorageKey,
  isRecord,
  isRoomManagerBackup,
  isValidPin,
  json,
  type PinBackupEnv,
  type StoredPinBackupRecord,
} from './_shared';

interface PagesContext {
  env: PinBackupEnv;
  request: Request;
}

export async function onRequestPost(context: PagesContext) {
  const store = getPinStore(context.env);
  if (!store) {
    return json({ error: '서버 저장소가 설정되지 않았습니다. Cloudflare Pages KV 바인딩을 확인하세요.' }, { status: 503 });
  }

  let payload: unknown;
  try {
    payload = await context.request.json();
  } catch {
    return json({ error: '요청 본문을 JSON으로 읽지 못했습니다.' }, { status: 400 });
  }

  if (!isRecord(payload)) {
    return json({ error: '잘못된 요청 형식입니다.' }, { status: 400 });
  }

  const pin = typeof payload.pin === 'string' ? payload.pin.trim() : '';
  if (!isValidPin(pin)) {
    return json({ error: 'PIN은 4자리 숫자여야 합니다.' }, { status: 400 });
  }

  if (!isRoomManagerBackup(payload.backup)) {
    return json({ error: '저장할 작업 공간 데이터 형식이 올바르지 않습니다.' }, { status: 400 });
  }

  const record: StoredPinBackupRecord = {
    pin,
    savedAt: new Date().toISOString(),
    backup: payload.backup,
  };

  await store.put(createPinStorageKey(pin), JSON.stringify(record));

  return json({
    pin: record.pin,
    savedAt: record.savedAt,
  });
}
