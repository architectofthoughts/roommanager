import { useState } from 'react';
import { useStore, useRoom } from '../../store/useStore';
import type { FurnitureShape, FurnitureCategory } from '../../types';

const CATEGORIES: { value: FurnitureCategory; label: string }[] = [
  { value: 'storage', label: '수납장' },
  { value: 'bed', label: '침대' },
  { value: 'table', label: '테이블' },
  { value: 'seating', label: '의자' },
  { value: 'appliance', label: '가전' },
  { value: 'other', label: '기타' },
];

const CATEGORY_LABELS: Record<FurnitureCategory, string> = {
  storage: '수납장',
  bed: '침대',
  table: '테이블',
  seating: '의자',
  appliance: '가전',
  other: '기타',
};

const BADGE_CLASS: Record<FurnitureCategory, string> = {
  storage: 'badge-storage',
  bed: 'badge-bed',
  table: 'badge-table',
  seating: 'badge-seating',
  appliance: 'badge-appliance',
  other: 'badge-other',
};

export default function LeftSidebar() {
  const room = useRoom();
  const { selectedFurnitureId, addFurniture, selectFurniture } = useStore();

  const [shape, setShape] = useState<FurnitureShape>('rect');
  const [category, setCategory] = useState<FurnitureCategory>('storage');
  const [name, setName] = useState('');

  const handleAdd = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    addFurniture(shape, category, trimmed);
    setName('');
  };

  return (
    <aside className="w-[280px] shrink-0 border-r border-border-primary bg-bg-primary flex flex-col h-full">
      {/* Add Furniture Section */}
      <div className="p-4 border-b border-border-primary">
        <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-3">
          가구 추가
        </h3>

        {/* Shape Selector */}
        <div className="flex gap-1.5 mb-3">
          <button
            onClick={() => setShape('rect')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md border transition-default ${
              shape === 'rect'
                ? 'border-accent-primary bg-accent-primary/10 text-accent-secondary'
                : 'border-border-primary bg-bg-secondary text-text-secondary hover:border-border-secondary'
            }`}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <rect x="1" y="2" width="10" height="8" rx="1" stroke="currentColor" strokeWidth="1.2" />
            </svg>
            사각형
          </button>
          <button
            onClick={() => setShape('circle')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md border transition-default ${
              shape === 'circle'
                ? 'border-accent-primary bg-accent-primary/10 text-accent-secondary'
                : 'border-border-primary bg-bg-secondary text-text-secondary hover:border-border-secondary'
            }`}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.2" />
            </svg>
            원형
          </button>
        </div>

        {/* Category Dropdown */}
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as FurnitureCategory)}
          className="w-full mb-2 px-2.5 py-1.5 text-sm bg-bg-secondary border border-border-primary rounded-md outline-none focus:border-accent-primary transition-default text-text-primary"
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>

        {/* Name + Add */}
        <div className="flex gap-1.5">
          <input
            type="text"
            placeholder="가구 이름"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
            className="flex-1 px-2.5 py-1.5 text-sm bg-bg-secondary border border-border-primary rounded-md outline-none placeholder:text-text-tertiary focus:border-accent-primary transition-default"
          />
          <button
            onClick={handleAdd}
            disabled={!name.trim()}
            className="px-3 py-1.5 text-xs font-medium bg-accent-primary text-white rounded-md hover:bg-accent-secondary transition-default disabled:opacity-40 disabled:cursor-not-allowed"
          >
            추가
          </button>
        </div>
      </div>

      {/* Furniture List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="p-3">
          <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-2 px-1">
            가구 목록
            <span className="ml-1.5 text-text-tertiary/60">{room.furniture.length}</span>
          </h3>

          {room.furniture.length === 0 ? (
            <div className="px-3 py-8 text-center text-xs text-text-tertiary">
              아직 가구가 없습니다.
              <br />
              위에서 가구를 추가해보세요.
            </div>
          ) : (
            <div className="flex flex-col gap-0.5">
              {room.furniture.map((f) => (
                <button
                  key={f.id}
                  onClick={() => selectFurniture(f.id)}
                  className={`w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-lg transition-default ${
                    selectedFurnitureId === f.id
                      ? 'bg-accent-primary/10 border border-accent-primary/30'
                      : 'hover:bg-bg-secondary border border-transparent'
                  }`}
                >
                  {/* Color Dot */}
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: f.color }}
                  />

                  {/* Name + Category */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-text-primary truncate">
                      {f.name}
                    </div>
                  </div>

                  {/* Category Badge */}
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${BADGE_CLASS[f.category]}`}>
                    {CATEGORY_LABELS[f.category]}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
