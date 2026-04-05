import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import Modal from './Modal';
import { useStore } from '../../store/useStore';
import type { BackupImportMode } from '../../types';
import {
  createBackupFilename,
  formatBackupDateTime,
  isValidRemotePin,
  parseBackupPreview,
  sanitizeRemotePin,
  type BackupPreview,
} from '../../utils/backup';
import { loadBackupByPin, saveBackupByPin } from '../../utils/remoteBackupApi';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface BackupPreviewCardProps {
  title: string;
  preview: BackupPreview;
  restoreMode: BackupImportMode;
  timestampLabel: string;
  timestampValue?: string;
  timestampFallback: string;
}

function BackupPreviewCard({
  title,
  preview,
  restoreMode,
  timestampLabel,
  timestampValue,
  timestampFallback,
}: BackupPreviewCardProps) {
  return (
    <div className="mt-4 rounded-2xl border border-border-primary bg-bg-secondary/60 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold text-text-primary">
          {title}
        </div>
        <span className="text-[11px] text-text-tertiary">
          {timestampValue ? `${timestampLabel} ${formatBackupDateTime(timestampValue)}` : timestampFallback}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="rounded-xl border border-border-primary bg-bg-primary px-3 py-2">
          <div className="text-[11px] text-text-tertiary">방</div>
          <div className="mt-1 text-base font-semibold text-text-primary">{preview.roomCount}</div>
        </div>
        <div className="rounded-xl border border-border-primary bg-bg-primary px-3 py-2">
          <div className="text-[11px] text-text-tertiary">가구</div>
          <div className="mt-1 text-base font-semibold text-text-primary">{preview.furnitureCount}</div>
        </div>
        <div className="rounded-xl border border-border-primary bg-bg-primary px-3 py-2">
          <div className="text-[11px] text-text-tertiary">물품</div>
          <div className="mt-1 text-base font-semibold text-text-primary">{preview.itemCount}</div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-text-secondary">
        <span className="rounded-full bg-bg-primary px-2 py-1">
          {restoreMode === 'replace' ? '현재 작업 공간을 교체합니다' : '현재 작업 공간 뒤에 새 방으로 붙입니다'}
        </span>
        {preview.themeMode && (
          <span className="rounded-full bg-bg-primary px-2 py-1">
            저장된 테마 {preview.themeMode === 'dark' ? '다크' : '라이트'}
          </span>
        )}
      </div>

      <div className="mt-3 rounded-xl border border-border-primary bg-bg-primary px-3 py-2">
        <div className="text-[11px] text-text-tertiary">포함된 방</div>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {preview.roomNames.slice(0, 6).map((roomName, index) => (
            <span key={`${roomName}-${index}`} className="rounded-full bg-accent-primary/8 px-2 py-1 text-[11px] text-accent-secondary">
              {roomName}
            </span>
          ))}
          {preview.roomNames.length > 6 && (
            <span className="rounded-full bg-bg-secondary px-2 py-1 text-[11px] text-text-tertiary">
              +{preview.roomNames.length - 6}개
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BackupModal({ isOpen, onClose }: BackupModalProps) {
  const { rooms, themeMode, exportBackup, importBackup } = useStore();
  const [restoreMode, setRestoreMode] = useState<BackupImportMode>('replace');
  const [selectedFileName, setSelectedFileName] = useState('');
  const [selectedPayload, setSelectedPayload] = useState<unknown>(null);
  const [preview, setPreview] = useState<BackupPreview | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const [remotePin, setRemotePin] = useState('');
  const [remotePayload, setRemotePayload] = useState<unknown>(null);
  const [remotePreview, setRemotePreview] = useState<BackupPreview | null>(null);
  const [remoteSavedAt, setRemoteSavedAt] = useState<string>();
  const [remoteErrorMessage, setRemoteErrorMessage] = useState('');
  const [remoteSuccessMessage, setRemoteSuccessMessage] = useState('');
  const [isRemoteSaving, setIsRemoteSaving] = useState(false);
  const [isRemoteLoading, setIsRemoteLoading] = useState(false);
  const [isRemoteRestoring, setIsRemoteRestoring] = useState(false);

  const currentSummary = useMemo(() => ({
    roomCount: rooms.length,
    furnitureCount: rooms.reduce((sum, room) => sum + room.furniture.length, 0),
    itemCount: rooms.reduce((sum, room) => sum + room.items.length, 0),
  }), [rooms]);

  const remotePinValid = isValidRemotePin(remotePin);

  useEffect(() => {
    if (isOpen) return;
    setRestoreMode('replace');
    setSelectedFileName('');
    setSelectedPayload(null);
    setPreview(null);
    setErrorMessage('');
    setSuccessMessage('');
    setIsImporting(false);
    setRemotePin('');
    setRemotePayload(null);
    setRemotePreview(null);
    setRemoteSavedAt(undefined);
    setRemoteErrorMessage('');
    setRemoteSuccessMessage('');
    setIsRemoteSaving(false);
    setIsRemoteLoading(false);
    setIsRemoteRestoring(false);
  }, [isOpen]);

  const handleExport = () => {
    const backup = exportBackup();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = createBackupFilename();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setErrorMessage('');
    setSuccessMessage('');

    if (!file) {
      setSelectedFileName('');
      setSelectedPayload(null);
      setPreview(null);
      return;
    }

    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as unknown;
      const nextPreview = parseBackupPreview(parsed);

      if (!nextPreview) {
        throw new Error('지원하지 않는 JSON 형식입니다.');
      }

      setSelectedFileName(file.name);
      setSelectedPayload(parsed);
      setPreview(nextPreview);
    } catch (error) {
      setSelectedFileName(file.name);
      setSelectedPayload(null);
      setPreview(null);
      setErrorMessage(error instanceof Error ? error.message : '파일을 읽을 수 없습니다.');
    } finally {
      event.target.value = '';
    }
  };

  const handleImport = () => {
    if (!selectedPayload || !preview) return;

    if (restoreMode === 'replace') {
      const confirmed = window.confirm('현재 작업 공간을 선택한 백업으로 교체합니다. 계속하시겠습니까?');
      if (!confirmed) return;
    }

    setIsImporting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const result = importBackup(selectedPayload, restoreMode);
      const modeLabel = result.mode === 'merge' ? '추가' : '복원';
      setSuccessMessage(`${modeLabel} 완료: 방 ${result.roomsImported}개, 가구 ${result.furnitureImported}개, 물품 ${result.itemsImported}개`);
      setSelectedPayload(null);
      setSelectedFileName('');
      setPreview(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '백업을 가져오지 못했습니다.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleRemoteSave = async () => {
    if (!remotePinValid) return;

    setIsRemoteSaving(true);
    setRemoteErrorMessage('');
    setRemoteSuccessMessage('');

    const backup = exportBackup();

    try {
      const result = await saveBackupByPin(remotePin, backup);
      setRemotePayload(backup);
      setRemotePreview(parseBackupPreview(backup));
      setRemoteSavedAt(result.savedAt);
      setRemoteSuccessMessage(`PIN ${result.pin}에 현재 작업 공간을 저장했습니다. 같은 PIN으로 다시 저장하면 덮어씁니다.`);
    } catch (error) {
      setRemoteErrorMessage(error instanceof Error ? error.message : '서버에 저장하지 못했습니다.');
    } finally {
      setIsRemoteSaving(false);
    }
  };

  const handleRemoteLoad = async () => {
    if (!remotePinValid) return;

    setIsRemoteLoading(true);
    setRemoteErrorMessage('');
    setRemoteSuccessMessage('');

    try {
      const record = await loadBackupByPin(remotePin);
      const nextPreview = parseBackupPreview(record.backup);
      if (!nextPreview) {
        throw new Error('서버에 저장된 데이터 형식이 올바르지 않습니다.');
      }

      setRemotePayload(record.backup);
      setRemotePreview(nextPreview);
      setRemoteSavedAt(record.savedAt);
      setRemoteSuccessMessage(`PIN ${record.pin}의 작업 공간을 불러왔습니다. 미리보기를 확인한 뒤 복원을 실행하세요.`);
    } catch (error) {
      setRemotePayload(null);
      setRemotePreview(null);
      setRemoteSavedAt(undefined);
      setRemoteErrorMessage(error instanceof Error ? error.message : '서버에서 불러오지 못했습니다.');
    } finally {
      setIsRemoteLoading(false);
    }
  };

  const handleRemoteRestore = () => {
    if (!remotePayload || !remotePreview) return;

    if (restoreMode === 'replace') {
      const confirmed = window.confirm('현재 작업 공간을 서버에 저장된 데이터로 교체합니다. 계속하시겠습니까?');
      if (!confirmed) return;
    }

    setIsRemoteRestoring(true);
    setRemoteErrorMessage('');
    setRemoteSuccessMessage('');

    try {
      const result = importBackup(remotePayload, restoreMode);
      const modeLabel = result.mode === 'merge' ? '추가' : '복원';
      setRemoteSuccessMessage(`${modeLabel} 완료: 방 ${result.roomsImported}개, 가구 ${result.furnitureImported}개, 물품 ${result.itemsImported}개`);
    } catch (error) {
      setRemoteErrorMessage(error instanceof Error ? error.message : '서버 데이터를 복원하지 못했습니다.');
    } finally {
      setIsRemoteRestoring(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="데이터 백업 / 복원" width="max-w-2xl">
      <div className="space-y-5">
        <section className="rounded-2xl border border-border-primary bg-bg-secondary/60 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-text-primary">현재 작업 공간</h3>
              <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                브라우저에 자동 저장된 현재 상태를 JSON 파일로 내보내거나, 4자리 PIN으로 서버에도 저장할 수 있습니다.
              </p>
            </div>
            <span className="rounded-full bg-accent-primary/10 px-2.5 py-1 text-[11px] font-medium text-accent-secondary">
              테마 {themeMode === 'dark' ? '다크' : '라이트'}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="rounded-xl border border-border-primary bg-bg-primary px-3 py-2">
              <div className="text-[11px] text-text-tertiary">방</div>
              <div className="mt-1 text-lg font-semibold text-text-primary">{currentSummary.roomCount}</div>
            </div>
            <div className="rounded-xl border border-border-primary bg-bg-primary px-3 py-2">
              <div className="text-[11px] text-text-tertiary">가구</div>
              <div className="mt-1 text-lg font-semibold text-text-primary">{currentSummary.furnitureCount}</div>
            </div>
            <div className="rounded-xl border border-border-primary bg-bg-primary px-3 py-2">
              <div className="text-[11px] text-text-tertiary">물품</div>
              <div className="mt-1 text-lg font-semibold text-text-primary">{currentSummary.itemCount}</div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleExport}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-accent-primary px-4 py-2 text-sm font-medium text-white hover:bg-accent-secondary transition-default"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 2v8" />
              <path d="M5 7.5L8 10.5l3-3" />
              <path d="M2.5 12.5h11" />
            </svg>
            JSON 백업 다운로드
          </button>
        </section>

        <section className="rounded-2xl border border-border-primary bg-bg-primary p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-text-primary">PIN 서버 저장 / 불러오기</h3>
              <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                현재 작업 공간 전체를 4자리 PIN으로 서버에 저장하고, 같은 PIN으로 다시 불러올 수 있습니다.
              </p>
            </div>
            <span className="rounded-full bg-bg-secondary px-2.5 py-1 text-[11px] font-medium text-text-secondary">
              4자리 숫자 PIN
            </span>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <label className="flex-1">
              <span className="mb-1 block text-[11px] text-text-tertiary">PIN 번호</span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={4}
                value={remotePin}
                onChange={(event) => setRemotePin(sanitizeRemotePin(event.target.value))}
                placeholder="예: 2468"
                className="w-full rounded-xl border border-border-primary bg-bg-secondary px-3 py-2 text-sm text-text-primary outline-none transition-default placeholder:text-text-tertiary focus:border-accent-primary focus:bg-bg-primary"
              />
            </label>
            <button
              type="button"
              onClick={handleRemoteSave}
              disabled={!remotePinValid || isRemoteSaving || isRemoteLoading}
              className="rounded-xl bg-accent-primary px-4 py-2 text-sm font-medium text-white hover:bg-accent-secondary transition-default disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isRemoteSaving ? '서버 저장 중...' : '현재 작업 공간 저장'}
            </button>
            <button
              type="button"
              onClick={handleRemoteLoad}
              disabled={!remotePinValid || isRemoteSaving || isRemoteLoading}
              className="rounded-xl border border-border-primary bg-bg-secondary px-4 py-2 text-sm font-medium text-text-primary hover:bg-bg-tertiary transition-default disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isRemoteLoading ? '불러오는 중...' : 'PIN으로 불러오기'}
            </button>
          </div>

          <p className="mt-3 text-[11px] leading-relaxed text-text-tertiary">
            같은 PIN으로 다시 저장하면 이전 서버 스냅샷을 덮어씁니다. 프로덕션에서는 Cloudflare KV에, 로컬 개발 환경에서는 로컬 dev 저장소에 기록됩니다.
          </p>

          {remoteErrorMessage && (
            <div className="mt-4 rounded-xl border border-danger-border bg-danger-soft px-3 py-2 text-sm text-danger-text">
              {remoteErrorMessage}
            </div>
          )}

          {remoteSuccessMessage && (
            <div className="mt-4 rounded-xl border border-border-primary bg-success-soft px-3 py-2 text-sm text-success-text">
              {remoteSuccessMessage}
            </div>
          )}

          {remotePreview && (
            <BackupPreviewCard
              title="서버에 저장된 작업 공간"
              preview={remotePreview}
              restoreMode={restoreMode}
              timestampLabel="서버 저장 시각"
              timestampValue={remoteSavedAt}
              timestampFallback="서버 저장 시각 없음"
            />
          )}

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-1 rounded-xl border border-border-primary bg-bg-secondary p-1">
              <button
                type="button"
                onClick={() => setRestoreMode('replace')}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-default ${
                  restoreMode === 'replace'
                    ? 'bg-accent-primary text-white'
                    : 'text-text-secondary hover:bg-bg-tertiary'
                }`}
              >
                전체 복원
              </button>
              <button
                type="button"
                onClick={() => setRestoreMode('merge')}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-default ${
                  restoreMode === 'merge'
                    ? 'bg-accent-primary text-white'
                    : 'text-text-secondary hover:bg-bg-tertiary'
                }`}
              >
                방 추가
              </button>
            </div>

            <button
              type="button"
              onClick={handleRemoteRestore}
              disabled={!remotePayload || !remotePreview || isRemoteRestoring}
              className="shrink-0 rounded-xl bg-accent-primary px-4 py-2 text-sm font-medium text-white hover:bg-accent-secondary transition-default disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isRemoteRestoring ? '적용 중...' : restoreMode === 'replace' ? '서버 데이터 복원' : '서버 데이터 추가'}
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-border-primary bg-bg-primary p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-text-primary">JSON 백업 가져오기</h3>
              <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                Nightly 백업이나 기존 roommanager 데이터 JSON을 불러올 수 있습니다.
              </p>
            </div>
            <div className="flex gap-1 rounded-xl border border-border-primary bg-bg-secondary p-1">
              <button
                type="button"
                onClick={() => setRestoreMode('replace')}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-default ${
                  restoreMode === 'replace'
                    ? 'bg-accent-primary text-white'
                    : 'text-text-secondary hover:bg-bg-tertiary'
                }`}
              >
                전체 복원
              </button>
              <button
                type="button"
                onClick={() => setRestoreMode('merge')}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-default ${
                  restoreMode === 'merge'
                    ? 'bg-accent-primary text-white'
                    : 'text-text-secondary hover:bg-bg-tertiary'
                }`}
              >
                방 추가
              </button>
            </div>
          </div>

          <label className="mt-4 flex cursor-pointer items-center justify-center rounded-2xl border border-dashed border-border-secondary bg-bg-secondary/70 px-4 py-5 text-center transition-default hover:border-accent-primary hover:bg-accent-primary/5">
            <input
              type="file"
              accept=".json,application/json"
              className="sr-only"
              onChange={handleFileChange}
            />
            <div>
              <div className="text-sm font-medium text-text-primary">JSON 파일 선택</div>
              <div className="mt-1 text-xs text-text-tertiary">
                {selectedFileName || '백업 파일을 선택하면 내용 미리보기가 표시됩니다.'}
              </div>
            </div>
          </label>

          {preview && (
            <BackupPreviewCard
              title={preview.format === 'backup' ? 'roommanager 백업 파일' : preview.format === 'workspace' ? '작업 공간 JSON' : '레거시 단일 방 데이터'}
              preview={preview}
              restoreMode={restoreMode}
              timestampLabel="내보낸 시각"
              timestampValue={preview.exportedAt}
              timestampFallback="내보낸 시각 없음"
            />
          )}

          {errorMessage && (
            <div className="mt-4 rounded-xl border border-danger-border bg-danger-soft px-3 py-2 text-sm text-danger-text">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="mt-4 rounded-xl border border-border-primary bg-success-soft px-3 py-2 text-sm text-success-text">
              {successMessage}
            </div>
          )}

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[11px] leading-relaxed text-text-tertiary">
              전체 복원은 현재 데이터를 교체하고, 방 추가는 백업 안의 방들을 새 ID로 복사해 현재 작업 공간에 붙입니다.
            </p>
            <button
              type="button"
              onClick={handleImport}
              disabled={!selectedPayload || !preview || isImporting}
              className="shrink-0 rounded-xl bg-accent-primary px-4 py-2 text-sm font-medium text-white hover:bg-accent-secondary transition-default disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isImporting ? '가져오는 중...' : restoreMode === 'replace' ? '복원 실행' : '추가 실행'}
            </button>
          </div>
        </section>
      </div>
    </Modal>
  );
}
