import {
  getPinStore,
  createPinStorageKey,
  isValidPin,
  json,
  type PinBackupEnv,
  type StoredPinBackupRecord,
} from './_shared';

interface PagesContext {
  env: PinBackupEnv;
  params: {
    pin?: string;
  };
}

export async function onRequestGet(context: PagesContext) {
  const store = getPinStore(context.env);
  if (!store) {
    return json({ error: '서버 저장소가 설정되지 않았습니다. Cloudflare Pages KV 바인딩을 확인하세요.' }, { status: 503 });
  }

  const pin = context.params.pin?.trim() ?? '';
  if (!isValidPin(pin)) {
    return json({ error: 'PIN은 4자리 숫자여야 합니다.' }, { status: 400 });
  }

  const rawRecord = await store.get(createPinStorageKey(pin));
  if (!rawRecord) {
    return json({ error: '해당 PIN으로 저장된 작업 공간이 없습니다.' }, { status: 404 });
  }

  try {
    const record = JSON.parse(rawRecord) as StoredPinBackupRecord;
    return json(record);
  } catch {
    return json({ error: '서버에 저장된 데이터를 읽지 못했습니다.' }, { status: 500 });
  }
}
