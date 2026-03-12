import { useState, useRef, useCallback } from 'react';
import Modal from '../common/Modal';
import { useStore } from '../../store/useStore';
import { analyzeImageWithGemini, isGeminiAvailable } from '../../utils/gemini';
import type { GeminiSuggestion } from '../../types';

interface GeminiModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface EditableSuggestion extends GeminiSuggestion {
  checked: boolean;
}

export default function GeminiModal({ isOpen, onClose }: GeminiModalProps) {
  const { room, selectedFurnitureId, bulkAddItems } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<EditableSuggestion[]>([]);
  const [targetFurnitureId, setTargetFurnitureId] = useState<string>(selectedFurnitureId ?? '');
  const [dragOver, setDragOver] = useState(false);

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
      const results = await analyzeImageWithGemini(file);
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

  const updateSuggestion = (index: number, updates: Partial<EditableSuggestion>) => {
    setSuggestions((prev) =>
      prev.map((s, i) => (i === index ? { ...s, ...updates } : s))
    );
  };

  const handleBulkAdd = () => {
    if (!targetFurnitureId) {
      setError('대상 가구를 선택해주세요.');
      return;
    }
    const checked = suggestions.filter((s) => s.checked);
    if (checked.length === 0) return;

    bulkAddItems(
      checked.map((s) => ({
        furnitureId: targetFurnitureId,
        name: s.itemName,
        quantity: s.quantity,
        category: s.category,
        memo: `AI 추천 (신뢰도: ${Math.round(s.confidence * 100)}%)`,
      }))
    );

    onClose();
    resetState();
  };

  const resetState = () => {
    setFile(null);
    setPreview(null);
    setSuggestions([]);
    setError(null);
    setLoading(false);
  };

  const handleClose = () => {
    onClose();
    resetState();
  };

  const checkedCount = suggestions.filter((s) => s.checked).length;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="사진으로 물품 분석" width="max-w-2xl">
      {/* Demo badge */}
      {!available && (
        <div className="mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
          <span className="text-[10px] font-bold text-amber-700 bg-amber-200 px-1.5 py-0.5 rounded">데모 모드</span>
          <span className="text-xs text-amber-700">
            API 키가 설정되지 않아 샘플 데이터가 표시됩니다.
          </span>
        </div>
      )}

      {/* Upload Area */}
      {!preview ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-default ${
            dragOver
              ? 'border-accent-primary bg-accent-primary/5'
              : 'border-border-secondary hover:border-accent-primary hover:bg-bg-secondary'
          }`}
        >
          <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-bg-secondary flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#9B9590" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="16" height="14" rx="2" />
              <circle cx="7" cy="8" r="1.5" />
              <path d="M18 13l-4-4-6 6" />
              <path d="M14 15l-2-2-4 4" />
            </svg>
          </div>
          <p className="text-sm text-text-secondary font-medium">
            이미지를 드래그하거나 클릭하여 업로드
          </p>
          <p className="text-xs text-text-tertiary mt-1">
            JPG, PNG, WEBP 지원
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
            className="hidden"
          />
        </div>
      ) : (
        <div className="mb-4">
          {/* Preview */}
          <div className="relative rounded-lg overflow-hidden border border-border-primary mb-3">
            <img src={preview} alt="업로드된 이미지" className="w-full max-h-48 object-contain bg-bg-secondary" />
            <button
              onClick={() => { setFile(null); setPreview(null); setSuggestions([]); }}
              className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-default"
            >
              <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M1 1l12 12M13 1L1 13" />
              </svg>
            </button>
          </div>

          {/* Analyze Button */}
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
                '분석하기'
              )}
            </button>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="my-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
          {error}
        </div>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="mt-3">
          <h4 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-2">
            분석 결과 ({suggestions.length}개)
          </h4>

          <div className="flex flex-col gap-1.5 mb-4 max-h-60 overflow-y-auto custom-scrollbar">
            {suggestions.map((s, idx) => (
              <div
                key={idx}
                className={`p-2.5 rounded-lg border transition-default ${
                  s.checked ? 'border-accent-primary/30 bg-accent-primary/5' : 'border-border-primary bg-bg-secondary'
                }`}
              >
                <div className="flex items-center gap-2.5">
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

                  {/* Item details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={s.itemName}
                        onChange={(e) => updateSuggestion(idx, { itemName: e.target.value })}
                        className="flex-1 text-sm font-medium text-text-primary bg-transparent outline-none border-b border-transparent focus:border-accent-primary"
                      />
                      <input
                        type="number"
                        min={1}
                        value={s.quantity}
                        onChange={(e) => updateSuggestion(idx, { quantity: Number(e.target.value) })}
                        className="w-12 text-xs text-center bg-bg-primary border border-border-primary rounded px-1 py-0.5 outline-none focus:border-accent-primary"
                      />
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <select
                        value={s.category}
                        onChange={(e) => updateSuggestion(idx, { category: e.target.value })}
                        className="text-[10px] bg-bg-primary border border-border-primary rounded px-1 py-0.5 outline-none"
                      >
                        {['의류', '책', '전자기기', '식품', '생활용품', '문구', '주방용품', '기타'].map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                      {/* Confidence bar */}
                      <div className="flex items-center gap-1 flex-1">
                        <div className="flex-1 h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${s.confidence * 100}%`,
                              backgroundColor: s.confidence > 0.8 ? '#7BC46B' : s.confidence > 0.5 ? '#C4956B' : '#D47F5A',
                            }}
                          />
                        </div>
                        <span className="text-[9px] text-text-tertiary w-7 text-right">
                          {Math.round(s.confidence * 100)}%
                        </span>
                      </div>
                      {/* Action type */}
                      <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${
                        s.action === 'add' ? 'bg-green-100 text-green-700' :
                        s.action === 'update' ? 'bg-blue-100 text-blue-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {s.action === 'add' ? '추가' : s.action === 'update' ? '수정' : '삭제'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Target furniture + confirm */}
          <div className="border-t border-border-primary pt-3">
            <label className="block mb-2">
              <span className="text-[11px] text-text-tertiary mb-0.5 block">대상 가구</span>
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
            </label>

            <button
              onClick={handleBulkAdd}
              disabled={checkedCount === 0 || !targetFurnitureId}
              className="w-full py-2 text-sm font-medium bg-accent-primary text-white rounded-lg hover:bg-accent-secondary transition-default disabled:opacity-40 disabled:cursor-not-allowed"
            >
              선택 항목 추가 ({checkedCount}개)
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
