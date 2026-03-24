import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import Modal from './Modal';
import { useStore } from '../../store/useStore';
import type { BackupImportMode } from '../../types';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface BackupPreview {
  format: 'backup' | 'workspace' | 'legacy';
  roomCount: number;
  furnitureCount: number;
  itemCount: number;
  roomNames: string[];
  exportedAt?: string;
  themeMode?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
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

function parseBackupPreview(payload: unknown): BackupPreview | null {
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

function formatDateTime(value?: string) {
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

function createBackupFilename() {
  return `roommanager-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
}

export default function BackupModal({ isOpen, onClose }: BackupModalProps) {
  const { rooms, themeMode, exportBackup, importBackup } = useStore();
  const [importMode, setImportMode] = useState<BackupImportMode>('replace');
  const [selectedFileName, setSelectedFileName] = useState('');
  const [selectedPayload, setSelectedPayload] = useState<unknown>(null);
  const [preview, setPreview] = useState<BackupPreview | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const currentSummary = useMemo(() => ({
    roomCount: rooms.length,
    furnitureCount: rooms.reduce((sum, room) => sum + room.furniture.length, 0),
    itemCount: rooms.reduce((sum, room) => sum + room.items.length, 0),
  }), [rooms]);

  useEffect(() => {
    if (isOpen) return;
    setImportMode('replace');
    setSelectedFileName('');
    setSelectedPayload(null);
    setPreview(null);
    setErrorMessage('');
    setSuccessMessage('');
    setIsImporting(false);
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

    if (importMode === 'replace') {
      const confirmed = window.confirm('현재 작업 공간을 선택한 백업으로 교체합니다. 계속하시겠습니까?');
      if (!confirmed) return;
    }

    setIsImporting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const result = importBackup(selectedPayload, importMode);
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="데이터 백업 / 복원" width="max-w-2xl">
      <div className="space-y-5">
        <section className="rounded-2xl border border-border-primary bg-bg-secondary/60 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-text-primary">현재 작업 공간</h3>
              <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                브라우저 localStorage에 저장된 모든 방과 물품을 JSON 파일로 내보낼 수 있습니다.
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
              <h3 className="text-sm font-semibold text-text-primary">백업 가져오기</h3>
              <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                Nightly 백업이나 기존 roommanager 데이터 JSON을 불러올 수 있습니다.
              </p>
            </div>
            <div className="flex gap-1 rounded-xl border border-border-primary bg-bg-secondary p-1">
              <button
                type="button"
                onClick={() => setImportMode('replace')}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-default ${
                  importMode === 'replace'
                    ? 'bg-accent-primary text-white'
                    : 'text-text-secondary hover:bg-bg-tertiary'
                }`}
              >
                전체 복원
              </button>
              <button
                type="button"
                onClick={() => setImportMode('merge')}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-default ${
                  importMode === 'merge'
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
            <div className="mt-4 rounded-2xl border border-border-primary bg-bg-secondary/60 p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-semibold text-text-primary">
                  {preview.format === 'backup' ? 'roommanager 백업 파일' : preview.format === 'workspace' ? '작업 공간 JSON' : '레거시 단일 방 데이터'}
                </div>
                <span className="text-[11px] text-text-tertiary">
                  {preview.exportedAt ? formatDateTime(preview.exportedAt) : '내보낸 시각 없음'}
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
                  {importMode === 'replace' ? '현재 작업 공간을 교체합니다' : '현재 작업 공간 뒤에 새 방으로 붙입니다'}
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
              {isImporting ? '가져오는 중...' : importMode === 'replace' ? '복원 실행' : '추가 실행'}
            </button>
          </div>
        </section>
      </div>
    </Modal>
  );
}
