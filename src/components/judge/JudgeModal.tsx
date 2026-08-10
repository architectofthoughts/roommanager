import { useMemo, useRef, useState } from 'react';
import Modal from '../common/Modal';
import { useStore, useRoom } from '../../store/useStore';
import { analyzeImageWithGemini, isGeminiAvailable } from '../../utils/gemini';
import type { JudgeSource } from '../../types';

interface JudgeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface JudgeCandidate {
  name: string;
  category: string;
  quantity: number;
  source: JudgeSource;
}

type JudgeTab = 'judge' | 'hold';
type JudgePhase = 'setup' | 'judging' | 'summary';

const ITEM_CATEGORIES = ['의류', '책', '전자기기', '식품', '생활용품', '문구', '주방용품', '기타'];

const DECISION_CRITERIA = '재구매 비용 < 없을 때 아쉬움';

export default function JudgeModal({ isOpen, onClose }: JudgeModalProps) {
  const room = useRoom();
  const { rooms, judgedItems, recordJudgement, resolveHeldItem, addItem, selectedFurnitureId } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<JudgeTab>('judge');
  const [phase, setPhase] = useState<JudgePhase>('setup');
  const [candidates, setCandidates] = useState<JudgeCandidate[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionCounts, setSessionCounts] = useState({ keep: 0, discard: 0, hold: 0 });

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualName, setManualName] = useState('');
  const [targetFurnitureId, setTargetFurnitureId] = useState<string>(
    selectedFurnitureId ?? room.furniture[0]?.id ?? ''
  );
  const [copied, setCopied] = useState(false);
  const [holdSelections, setHoldSelections] = useState<Record<string, string>>({});

  const available = isGeminiAvailable();

  const heldItems = useMemo(
    () => judgedItems.filter((item) => item.decision === 'hold')
      .sort((a, b) => new Date(b.decidedAt).getTime() - new Date(a.decidedAt).getTime()),
    [judgedItems]
  );

  const lifetimeCounts = useMemo(() => ({
    keep: judgedItems.filter((item) => item.decision === 'keep').length,
    discard: judgedItems.filter((item) => item.decision === 'discard').length,
    hold: heldItems.length,
  }), [judgedItems, heldItems]);

  const current = candidates[currentIndex];
  const keepDisabled = !targetFurnitureId || !room.furniture.some((f) => f.id === targetFurnitureId);

  const handleFile = (f: File) => {
    if (!f.type.startsWith('image/')) {
      setError('이미지 파일만 업로드할 수 있습니다.');
      return;
    }
    setFile(f);
    setError(null);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(f);
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const results = await analyzeImageWithGemini(file);
      if (results.length === 0) {
        setError('사진에서 물품을 인식하지 못했습니다. 수동으로 추가해보세요.');
      } else {
        setCandidates((prev) => [
          ...prev,
          ...results.map((s) => ({
            name: s.itemName,
            category: s.category,
            quantity: s.quantity,
            source: 'photo' as JudgeSource,
          })),
        ]);
        setFile(null);
        setPreview(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '분석 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleManualAdd = () => {
    const trimmed = manualName.trim();
    if (!trimmed) return;
    setCandidates((prev) => [...prev, { name: trimmed, category: '기타', quantity: 1, source: 'manual' }]);
    setManualName('');
  };

  const removeCandidate = (index: number) => {
    setCandidates((prev) => prev.filter((_, i) => i !== index));
  };

  const updateCurrent = (updates: Partial<JudgeCandidate>) => {
    setCandidates((prev) => prev.map((c, i) => (i === currentIndex ? { ...c, ...updates } : c)));
  };

  const startJudging = () => {
    if (candidates.length === 0) return;
    setCurrentIndex(0);
    setSessionCounts({ keep: 0, discard: 0, hold: 0 });
    setPhase('judging');
  };

  const decide = (decision: 'keep' | 'discard' | 'hold') => {
    if (!current) return;
    const furnitureId = decision === 'keep' ? targetFurnitureId : undefined;

    recordJudgement([{
      name: current.name,
      category: current.category,
      quantity: current.quantity,
      decision,
      furnitureId,
      source: current.source,
    }]);

    if (decision === 'keep' && furnitureId) {
      addItem(furnitureId, current.name, current.quantity, current.category, '판정 게이트: 남김', 1);
    }

    setSessionCounts((prev) => ({ ...prev, [decision]: prev[decision] + 1 }));

    if (currentIndex + 1 >= candidates.length) {
      setPhase('summary');
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const resetJudge = () => {
    setPhase('setup');
    setCandidates([]);
    setCurrentIndex(0);
    setFile(null);
    setPreview(null);
    setError(null);
    setManualName('');
  };

  const handleClose = () => {
    resetJudge();
    setTab('judge');
    onClose();
  };

  const copyHeldForHuchubot = async () => {
    const lines = [
      `🦎 후추봇 판정 요청 — 보류 물품 ${heldItems.length}개`,
      ...heldItems.map((item, i) => `${i + 1}. ${item.name} (${item.category}, x${item.quantity}, ${item.roomName})`),
      '',
      `기준: ${DECISION_CRITERIA}. 하나씩 판정해줘!`,
    ];
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('클립보드 복사에 실패했습니다.');
    }
  };

  const tabButton = (value: JudgeTab, label: string) => (
    <button
      onClick={() => setTab(value)}
      className={`flex-1 py-2 text-sm font-medium rounded-lg transition-default ${
        tab === value
          ? 'bg-accent-primary text-white'
          : 'bg-bg-secondary text-text-secondary hover:text-text-primary'
      }`}
    >
      {label}
    </button>
  );

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="판정 게이트 — 버릴까? 남길까?" width="max-w-2xl">
      {/* Tabs */}
      <div className="flex gap-1.5 mb-4">
        {tabButton('judge', '판정하기')}
        {tabButton('hold', `보류함 (${heldItems.length})`)}
      </div>

      {/* 누적 통계 */}
      <div className="mb-4 flex items-center gap-3 rounded-lg border border-border-primary bg-bg-secondary px-3 py-2 text-xs">
        <span className="font-semibold text-text-tertiary">누적</span>
        <span className="text-success-text">💚 남김 {lifetimeCounts.keep}</span>
        <span className="text-danger-text">🗑️ 버림 {lifetimeCounts.discard}</span>
        <span className="text-warning-text">🤔 보류 {lifetimeCounts.hold}</span>
        <span className="ml-auto hidden text-[10px] text-text-tertiary sm:block">기준: {DECISION_CRITERIA}</span>
      </div>

      {error && (
        <div className="mb-3 px-3 py-2 bg-danger-soft border border-danger-border rounded-lg text-xs text-danger-text">
          {error}
        </div>
      )}

      {tab === 'judge' && phase === 'setup' && (
        <div>
          {!available && (
            <div className="mb-3 px-3 py-2 bg-warning-soft border border-warning-border rounded-lg flex items-center gap-2">
              <span className="text-[10px] font-bold text-warning-text bg-warning-border/35 px-1.5 py-0.5 rounded">데모 모드</span>
              <span className="text-xs text-warning-text">API 키가 없어 사진 분석은 샘플 데이터로 동작합니다. 수동 추가는 정상 동작!</span>
            </div>
          )}

          {/* 사진 업로드 */}
          {!preview ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border-secondary rounded-xl p-6 text-center cursor-pointer hover:border-accent-primary hover:bg-bg-secondary transition-default"
            >
              <p className="text-sm font-medium text-text-secondary">📸 애매한 물건들 사진을 올려줘</p>
              <p className="text-xs text-text-tertiary mt-1">AI가 물품을 인식해서 판정 카드로 만들어줍니다</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
                className="hidden"
              />
            </div>
          ) : (
            <div className="mb-3">
              <div className="relative rounded-lg overflow-hidden border border-border-primary mb-2">
                <img src={preview} alt="판정 대상 사진" className="w-full max-h-40 object-contain bg-bg-secondary" />
                <button
                  onClick={() => { setFile(null); setPreview(null); }}
                  className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full bg-[var(--color-overlay-soft)] text-white hover:bg-[var(--color-overlay-strong)] transition-default"
                >
                  ✕
                </button>
              </div>
              <button
                onClick={handleAnalyze}
                disabled={loading}
                className="w-full py-2 text-sm font-medium bg-accent-primary text-white rounded-lg hover:bg-accent-secondary transition-default disabled:opacity-60"
              >
                {loading ? '인식 중...' : '물품 인식하기'}
              </button>
            </div>
          )}

          {/* 수동 추가 */}
          <div className="flex items-center gap-2 mt-4 mb-2">
            <div className="flex-1 h-px bg-border-primary" />
            <span className="text-[10px] text-text-tertiary">또는 직접 입력</span>
            <div className="flex-1 h-px bg-border-primary" />
          </div>
          <div className="flex gap-1.5">
            <input
              type="text"
              placeholder="물건 이름 (예: 안 쓰는 키보드)"
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleManualAdd(); }}
              className="flex-1 px-2.5 py-2 text-sm bg-bg-secondary border border-border-primary rounded-md outline-none placeholder:text-text-tertiary focus:border-accent-primary transition-default"
            />
            <button
              onClick={handleManualAdd}
              disabled={!manualName.trim()}
              className="px-4 py-2 text-xs font-medium bg-accent-primary text-white rounded-md hover:bg-accent-secondary transition-default disabled:opacity-40"
            >
              추가
            </button>
          </div>

          {/* 후보 목록 */}
          {candidates.length > 0 && (
            <div className="mt-4">
              <h4 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-2">
                판정 대기 ({candidates.length}개)
              </h4>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {candidates.map((c, i) => (
                  <span
                    key={`${c.name}-${i}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border-primary bg-bg-secondary px-2.5 py-1 text-xs text-text-primary"
                  >
                    {c.source === 'photo' ? '📸' : '✏️'} {c.name}
                    <button
                      onClick={() => removeCandidate(i)}
                      className="text-text-tertiary hover:text-danger-text transition-default"
                      aria-label={`${c.name} 제거`}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
              <button
                onClick={startJudging}
                className="w-full py-2.5 text-sm font-semibold bg-accent-primary text-white rounded-lg hover:bg-accent-secondary transition-default"
              >
                ⚖️ 판정 시작 ({candidates.length}개)
              </button>
            </div>
          )}
        </div>
      )}

      {tab === 'judge' && phase === 'judging' && current && (
        <div>
          {/* 진행도 */}
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs text-text-tertiary mb-1">
              <span>{currentIndex + 1} / {candidates.length}</span>
              <span>{current.source === 'photo' ? '📸 사진 인식' : '✏️ 직접 입력'}</span>
            </div>
            <div className="h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
              <div
                className="h-full bg-accent-primary rounded-full transition-all"
                style={{ width: `${((currentIndex) / candidates.length) * 100}%` }}
              />
            </div>
          </div>

          {/* 판정 카드 */}
          <div className="rounded-xl border-2 border-border-secondary bg-bg-secondary p-5 mb-4">
            <input
              type="text"
              value={current.name}
              onChange={(e) => updateCurrent({ name: e.target.value })}
              className="w-full text-center text-xl font-bold text-text-primary bg-transparent outline-none border-b border-transparent focus:border-accent-primary mb-3"
            />
            <div className="flex items-center justify-center gap-2">
              <select
                value={current.category}
                onChange={(e) => updateCurrent({ category: e.target.value })}
                className="text-xs bg-bg-primary border border-border-primary rounded px-2 py-1 outline-none"
              >
                {ITEM_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <div className="flex items-center gap-1 text-xs text-text-secondary">
                <span>수량</span>
                <input
                  type="number"
                  min={1}
                  value={current.quantity}
                  onChange={(e) => updateCurrent({ quantity: Math.max(1, Number(e.target.value)) })}
                  className="w-14 text-center bg-bg-primary border border-border-primary rounded px-1 py-1 outline-none focus:border-accent-primary"
                />
              </div>
            </div>
            <p className="mt-3 text-center text-[11px] text-text-tertiary">
              기준: {DECISION_CRITERIA}
            </p>
          </div>

          {/* 남길 가구 선택 */}
          <label className="block mb-3">
            <span className="text-[11px] text-text-tertiary mb-0.5 block">남긴다면 이 가구에 등록 ({room.name})</span>
            <select
              value={targetFurnitureId}
              onChange={(e) => setTargetFurnitureId(e.target.value)}
              className="w-full px-2.5 py-1.5 text-sm bg-bg-secondary border border-border-primary rounded-md outline-none focus:border-accent-primary transition-default"
            >
              <option value="">가구를 선택하세요</option>
              {room.furniture.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
            {room.furniture.length === 0 && (
              <span className="mt-1 block text-[11px] text-warning-text">
                이 방에 가구가 없어 '남긴다' 등록이 불가합니다. 가구를 먼저 추가해주세요.
              </span>
            )}
          </label>

          {/* 판정 버튼 */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => decide('discard')}
              className="py-3 rounded-xl bg-danger-soft border border-danger-border text-danger-text text-sm font-bold hover:opacity-80 transition-default active:scale-95"
            >
              🗑️<br />버린다
            </button>
            <button
              onClick={() => decide('hold')}
              className="py-3 rounded-xl bg-warning-soft border border-warning-border text-warning-text text-sm font-bold hover:opacity-80 transition-default active:scale-95"
            >
              🤔<br />보류
            </button>
            <button
              onClick={() => decide('keep')}
              disabled={keepDisabled}
              className="py-3 rounded-xl bg-success-soft border border-success-border text-success-text text-sm font-bold hover:opacity-80 transition-default active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              💚<br />남긴다
            </button>
          </div>
        </div>
      )}

      {tab === 'judge' && phase === 'summary' && (
        <div className="text-center">
          <p className="text-lg font-bold text-text-primary mb-1">판정 완료! ⚖️</p>
          <p className="text-xs text-text-tertiary mb-4">이번 라운드 결과</p>

          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="rounded-xl bg-success-soft border border-success-border py-3">
              <div className="text-2xl font-bold text-success-text">{sessionCounts.keep}</div>
              <div className="text-xs text-success-text">💚 남김</div>
            </div>
            <div className="rounded-xl bg-warning-soft border border-warning-border py-3">
              <div className="text-2xl font-bold text-warning-text">{sessionCounts.hold}</div>
              <div className="text-xs text-warning-text">🤔 보류</div>
            </div>
            <div className="rounded-xl bg-danger-soft border border-danger-border py-3">
              <div className="text-2xl font-bold text-danger-text">{sessionCounts.discard}</div>
              <div className="text-xs text-danger-text">🗑️ 버림</div>
            </div>
          </div>

          {sessionCounts.hold > 0 && (
            <button
              onClick={() => setTab('hold')}
              className="mb-3 w-full py-2 text-xs font-medium rounded-lg bg-warning-soft border border-warning-border text-warning-text hover:opacity-80 transition-default"
            >
              보류 {sessionCounts.hold}개 → 보류함에서 후추봇에게 물어보기 🦎
            </button>
          )}

          <div className="flex gap-2">
            <button
              onClick={resetJudge}
              className="flex-1 py-2.5 text-sm font-medium rounded-lg border border-border-primary bg-bg-secondary text-text-secondary hover:text-text-primary transition-default"
            >
              새 판정 시작
            </button>
            <button
              onClick={handleClose}
              className="flex-1 py-2.5 text-sm font-medium rounded-lg bg-accent-primary text-white hover:bg-accent-secondary transition-default"
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {tab === 'hold' && (
        <div>
          {heldItems.length === 0 ? (
            <div className="px-3 py-10 text-center text-sm text-text-tertiary">
              보류 중인 물품이 없습니다. 깔끔! ✨
            </div>
          ) : (
            <>
              <button
                onClick={copyHeldForHuchubot}
                className={`mb-3 w-full py-2.5 text-sm font-semibold rounded-lg transition-default ${
                  copied
                    ? 'bg-success-soft border border-success-border text-success-text'
                    : 'bg-accent-primary text-white hover:bg-accent-secondary'
                }`}
              >
                {copied ? '✓ 복사 완료! 후추봇에게 붙여넣어줘' : '📋 후추봇에게 물어볼 목록 복사 🦎'}
              </button>

              <div className="flex flex-col gap-2">
                {heldItems.map((item) => {
                  const itemRoom = rooms.find((r) => r.id === item.roomId);
                  const furnitureOptions = itemRoom?.furniture ?? [];
                  const selection = holdSelections[item.id] ?? '';
                  return (
                    <div key={item.id} className="rounded-lg border border-border-primary bg-bg-secondary p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="flex-1 min-w-0 truncate text-sm font-semibold text-text-primary">
                          {item.name}
                        </span>
                        <span className="shrink-0 rounded bg-bg-primary px-1.5 py-0.5 text-[10px] text-text-tertiary">
                          {item.category} x{item.quantity}
                        </span>
                        <span className="shrink-0 rounded-full bg-accent-primary/10 px-2 py-0.5 text-[10px] text-accent-secondary">
                          {item.roomName}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <select
                          value={selection}
                          onChange={(e) => setHoldSelections((prev) => ({ ...prev, [item.id]: e.target.value }))}
                          className="flex-1 min-w-0 px-2 py-1.5 text-xs bg-bg-primary border border-border-primary rounded-md outline-none focus:border-accent-primary transition-default"
                        >
                          <option value="">
                            {furnitureOptions.length === 0 ? '등록할 가구 없음' : '남긴다면 넣을 가구...'}
                          </option>
                          {furnitureOptions.map((f) => (
                            <option key={f.id} value={f.id}>{f.name}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => resolveHeldItem(item.id, 'keep', selection)}
                          disabled={!selection}
                          className="shrink-0 px-3 py-1.5 text-xs font-bold rounded-md bg-success-soft border border-success-border text-success-text hover:opacity-80 transition-default disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          💚 남김
                        </button>
                        <button
                          onClick={() => resolveHeldItem(item.id, 'discard')}
                          className="shrink-0 px-3 py-1.5 text-xs font-bold rounded-md bg-danger-soft border border-danger-border text-danger-text hover:opacity-80 transition-default"
                        >
                          🗑️ 버림
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
