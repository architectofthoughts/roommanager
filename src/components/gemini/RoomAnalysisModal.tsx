import { useState, useRef, useCallback, useMemo } from 'react';
import Modal from '../common/Modal';
import { useStore, useRoom } from '../../store/useStore';
import { analyzeRoomPhoto, isGeminiAvailable } from '../../utils/gemini';
import type { FurnitureSuggestion, FurnitureCategory, FurnitureShape } from '../../types';

interface RoomAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface EditableFurnitureSuggestion extends FurnitureSuggestion {
  checked: boolean;
}

const CATEGORY_LABELS: Record<FurnitureCategory, string> = {
  storage: '수납', seating: '의자', table: '테이블',
  bed: '침대', appliance: '가전', other: '기타',
};

const CATEGORY_COLORS: Record<FurnitureCategory, string> = {
  storage: '#8B5E3C', bed: '#6B8EC4', table: '#C4956B',
  seating: '#7BC46B', appliance: '#9B9B9B', other: '#B0A090',
};

export default function RoomAnalysisModal({ isOpen, onClose }: RoomAnalysisModalProps) {
  const room = useRoom();
  const { bulkAddFurniture } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<EditableFurnitureSuggestion[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const available = isGeminiAvailable();

  const handleFile = useCallback((f: File) => {
    if (!f.type.startsWith('image/')) {
      setError('이미지 파일만 업로드할 수 있습니다.');
      return;
    }
    setFile(f);
    setError(null);
    setSuggestions([]);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(f);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const results = await analyzeRoomPhoto(file, room.gridWidth, room.gridHeight);
      setSuggestions(results.map((s) => ({ ...s, checked: true })));
    } catch (err) {
      setError(err instanceof Error ? err.message : '분석 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const toggleCheck = (index: number) => {
    setSuggestions((prev) =>
      prev.map((s, i) => (i === index ? { ...s, checked: !s.checked } : s))
    );
  };

  const updateSuggestion = (index: number, updates: Partial<EditableFurnitureSuggestion>) => {
    setSuggestions((prev) =>
      prev.map((s, i) => (i === index ? { ...s, ...updates } : s))
    );
  };

  const checkedItems = useMemo(() => suggestions.filter((s) => s.checked), [suggestions]);

  const handleConfirm = () => {
    if (checkedItems.length === 0) return;
    bulkAddFurniture(
      checkedItems.map((s) => ({
        name: s.name,
        shape: s.shape,
        category: s.category,
        x: s.x,
        y: s.y,
        width: s.width,
        height: s.height,
      }))
    );
    handleClose();
  };

  const resetState = () => {
    setFile(null);
    setPreview(null);
    setSuggestions([]);
    setError(null);
    setLoading(false);
    setHoveredIdx(null);
  };

  const handleClose = () => {
    onClose();
    resetState();
  };

  // Preview grid dimensions
  const PREVIEW_W = 400;
  const cellPx = PREVIEW_W / room.gridWidth;
  const PREVIEW_H = cellPx * room.gridHeight;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="방 사진으로 가구 배치" width="max-w-4xl">
      {/* Demo badge */}
      {!available && (
        <div className="mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
          <span className="text-[10px] font-bold text-amber-700 bg-amber-200 px-1.5 py-0.5 rounded">데모</span>
          <span className="text-xs text-amber-700">
            API 키 없이 샘플 데이터로 동작합니다.
          </span>
        </div>
      )}

      <div className="flex gap-4">
        {/* Left column: Upload + Suggestion List */}
        <div className="flex-1 min-w-0">
          {/* Upload Area */}
          {!preview ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-default ${
                dragOver
                  ? 'border-accent-primary bg-accent-primary/5'
                  : 'border-border-secondary hover:border-accent-primary hover:bg-bg-secondary'
              }`}
            >
              <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-bg-secondary flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#9B9590" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="16" height="14" rx="2" />
                  <path d="M10 7v6M7 10h6" />
                </svg>
              </div>
              <p className="text-sm text-text-secondary font-medium">방 사진을 업로드하세요</p>
              <p className="text-xs text-text-tertiary mt-1">AI가 가구를 인식하고 배치를 추천합니다</p>
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
              <div className="relative rounded-lg overflow-hidden border border-border-primary mb-3">
                <img src={preview} alt="방 사진" className="w-full max-h-36 object-contain bg-bg-secondary" />
                <button
                  onClick={() => { setFile(null); setPreview(null); setSuggestions([]); }}
                  className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-default"
                >
                  <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M1 1l12 12M13 1L1 13" />
                  </svg>
                </button>
              </div>

              {suggestions.length === 0 && (
                <button
                  onClick={handleAnalyze}
                  disabled={loading}
                  className="w-full py-2 text-sm font-medium bg-accent-primary text-white rounded-lg hover:bg-accent-secondary transition-default disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="42" strokeDashoffset="12" strokeLinecap="round" />
                      </svg>
                      분석 중...
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
                        <circle cx="8" cy="8" r="6" />
                        <path d="M8 5v6M5 8h6" />
                      </svg>
                      가구 분석하기
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="my-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
              {error}
            </div>
          )}

          {/* Suggestion List */}
          {suggestions.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">
                  인식된 가구 ({suggestions.length}개)
                </h4>
                <button
                  onClick={() => setSuggestions(prev => prev.map(s => ({ ...s, checked: !checkedItems.length || checkedItems.length < suggestions.length ? true : false })))}
                  className="text-[10px] text-accent-secondary hover:underline"
                >
                  {checkedItems.length === suggestions.length ? '전체 해제' : '전체 선택'}
                </button>
              </div>

              <div className="flex flex-col gap-1.5 max-h-[280px] overflow-y-auto custom-scrollbar pr-1">
                {suggestions.map((s, idx) => (
                  <div
                    key={idx}
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    className={`p-2.5 rounded-lg border transition-default ${
                      s.checked
                        ? hoveredIdx === idx
                          ? 'border-accent-primary bg-accent-primary/10'
                          : 'border-accent-primary/30 bg-accent-primary/5'
                        : 'border-border-primary bg-bg-secondary'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {/* Checkbox */}
                      <button
                        onClick={() => toggleCheck(idx)}
                        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-default ${
                          s.checked ? 'bg-accent-primary border-accent-primary' : 'border-border-secondary bg-bg-primary'
                        }`}
                      >
                        {s.checked && (
                          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2 6l3 3 5-5" />
                          </svg>
                        )}
                      </button>

                      {/* Color dot */}
                      <div
                        className="w-3 h-3 rounded-sm shrink-0"
                        style={{ backgroundColor: CATEGORY_COLORS[s.category] }}
                      />

                      {/* Name */}
                      <input
                        type="text"
                        value={s.name}
                        onChange={(e) => updateSuggestion(idx, { name: e.target.value })}
                        className="flex-1 text-sm font-medium text-text-primary bg-transparent outline-none border-b border-transparent focus:border-accent-primary min-w-0"
                      />

                      {/* Confidence */}
                      <span className="text-[9px] text-text-tertiary shrink-0">
                        {Math.round(s.confidence * 100)}%
                      </span>
                    </div>

                    {/* Details row */}
                    <div className="flex items-center gap-2 mt-1.5 ml-6">
                      <select
                        value={s.category}
                        onChange={(e) => updateSuggestion(idx, { category: e.target.value as FurnitureCategory })}
                        className="text-[10px] bg-bg-primary border border-border-primary rounded px-1.5 py-0.5 outline-none"
                      >
                        {(Object.keys(CATEGORY_LABELS) as FurnitureCategory[]).map((c) => (
                          <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                        ))}
                      </select>

                      <select
                        value={s.shape}
                        onChange={(e) => updateSuggestion(idx, { shape: e.target.value as FurnitureShape })}
                        className="text-[10px] bg-bg-primary border border-border-primary rounded px-1.5 py-0.5 outline-none"
                      >
                        <option value="rect">사각형</option>
                        <option value="circle">원형</option>
                      </select>

                      <div className="flex items-center gap-1 text-[10px] text-text-tertiary">
                        <span>위치</span>
                        <input
                          type="number"
                          min={0}
                          max={room.gridWidth - s.width}
                          value={s.x}
                          onChange={(e) => updateSuggestion(idx, { x: Math.max(0, Math.min(room.gridWidth - s.width, Number(e.target.value))) })}
                          className="w-8 text-[10px] text-center bg-bg-primary border border-border-primary rounded px-0.5 py-0.5 outline-none"
                        />
                        <span>,</span>
                        <input
                          type="number"
                          min={0}
                          max={room.gridHeight - s.height}
                          value={s.y}
                          onChange={(e) => updateSuggestion(idx, { y: Math.max(0, Math.min(room.gridHeight - s.height, Number(e.target.value))) })}
                          className="w-8 text-[10px] text-center bg-bg-primary border border-border-primary rounded px-0.5 py-0.5 outline-none"
                        />
                      </div>

                      <div className="flex items-center gap-1 text-[10px] text-text-tertiary">
                        <span>크기</span>
                        <input
                          type="number"
                          min={2}
                          max={room.gridWidth}
                          value={s.width}
                          onChange={(e) => updateSuggestion(idx, { width: Math.max(2, Math.min(room.gridWidth, Number(e.target.value))) })}
                          className="w-8 text-[10px] text-center bg-bg-primary border border-border-primary rounded px-0.5 py-0.5 outline-none"
                        />
                        <span>x</span>
                        <input
                          type="number"
                          min={2}
                          max={room.gridHeight}
                          value={s.height}
                          onChange={(e) => updateSuggestion(idx, { height: Math.max(2, Math.min(room.gridHeight, Number(e.target.value))) })}
                          className="w-8 text-[10px] text-center bg-bg-primary border border-border-primary rounded px-0.5 py-0.5 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Confirm button */}
              <div className="mt-3 pt-3 border-t border-border-primary">
                <button
                  onClick={handleConfirm}
                  disabled={checkedItems.length === 0}
                  className="w-full py-2.5 text-sm font-medium bg-accent-primary text-white rounded-lg hover:bg-accent-secondary transition-default disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 8l4 4 8-8" />
                  </svg>
                  선택한 가구 배치하기 ({checkedItems.length}개)
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right column: Preview Grid */}
        {suggestions.length > 0 && (
          <div className="shrink-0" style={{ width: PREVIEW_W + 2 }}>
            <h4 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-2">
              배치 미리보기
            </h4>
            <div
              className="relative border border-border-primary rounded-lg overflow-hidden"
              style={{ width: PREVIEW_W, height: PREVIEW_H, backgroundColor: '#FAFAF8' }}
            >
              {/* Grid lines */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.15 }}>
                {Array.from({ length: room.gridWidth + 1 }, (_, i) => (
                  <line key={`v${i}`} x1={i * cellPx} y1={0} x2={i * cellPx} y2={PREVIEW_H}
                    stroke="#9B9590" strokeWidth={i % 5 === 0 ? 0.8 : 0.4} />
                ))}
                {Array.from({ length: room.gridHeight + 1 }, (_, i) => (
                  <line key={`h${i}`} x1={0} y1={i * cellPx} x2={PREVIEW_W} y2={i * cellPx}
                    stroke="#9B9590" strokeWidth={i % 5 === 0 ? 0.8 : 0.4} />
                ))}
              </svg>

              {/* Existing furniture (dimmed) */}
              {room.furniture.map((f) => (
                <div
                  key={f.id}
                  className="absolute rounded-sm flex items-center justify-center"
                  style={{
                    left: f.x * cellPx,
                    top: f.y * cellPx,
                    width: f.width * cellPx,
                    height: f.height * cellPx,
                    backgroundColor: f.color,
                    opacity: 0.15,
                    borderRadius: f.shape === 'circle' ? '50%' : 2,
                  }}
                >
                  <span className="text-[8px] text-text-tertiary truncate px-0.5 select-none opacity-60">{f.name}</span>
                </div>
              ))}

              {/* Suggested furniture */}
              {suggestions.map((s, idx) => {
                if (!s.checked) return null;
                const isHovered = hoveredIdx === idx;
                return (
                  <div
                    key={idx}
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    className="absolute flex items-center justify-center cursor-pointer transition-all duration-150"
                    style={{
                      left: s.x * cellPx,
                      top: s.y * cellPx,
                      width: s.width * cellPx,
                      height: s.height * cellPx,
                      backgroundColor: CATEGORY_COLORS[s.category],
                      opacity: isHovered ? 0.6 : 0.35,
                      borderRadius: s.shape === 'circle' ? '50%' : 3,
                      border: `2px ${isHovered ? 'solid' : 'dashed'} ${CATEGORY_COLORS[s.category]}`,
                      zIndex: isHovered ? 10 : 1,
                      boxShadow: isHovered ? `0 0 0 2px ${CATEGORY_COLORS[s.category]}40` : 'none',
                    }}
                  >
                    <span className="text-[9px] font-medium text-white drop-shadow-sm truncate px-1 select-none">
                      {s.name}
                    </span>
                  </div>
                );
              })}

              {/* Room border */}
              <div className="absolute inset-0 border-2 border-[#C4956A] rounded-lg pointer-events-none" />

              {/* Grid info */}
              <div className="absolute bottom-1 right-1 text-[8px] text-text-tertiary bg-white/80 px-1 rounded">
                {room.gridWidth}x{room.gridHeight}
              </div>
            </div>

            {/* Legend */}
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
              <div className="flex items-center gap-1">
                <div className="w-3 h-2 rounded-sm border border-dashed border-accent-primary bg-accent-primary/30" />
                <span className="text-[9px] text-text-tertiary">AI 추천</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-2 rounded-sm bg-gray-300/40" />
                <span className="text-[9px] text-text-tertiary">기존 가구</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
