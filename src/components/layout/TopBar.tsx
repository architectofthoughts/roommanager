import { useState, useRef, useEffect } from 'react';
import { useStore } from '../../store/useStore';

interface TopBarProps {
  onOpenGemini: () => void;
  onOpenStats: () => void;
}

export default function TopBar({ onOpenGemini, onOpenStats }: TopBarProps) {
  const { room, updateRoom, searchQuery, setSearchQuery } = useStore();
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(room.name);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [editingName]);

  const commitName = () => {
    const trimmed = nameValue.trim();
    if (trimmed) updateRoom({ name: trimmed });
    else setNameValue(room.name);
    setEditingName(false);
  };

  return (
    <header className="h-13 flex items-center gap-4 px-5 border-b border-border-primary bg-bg-primary shrink-0">
      {/* App Title */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="w-7 h-7 rounded-lg bg-accent-primary flex items-center justify-center">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <rect x="2" y="4" width="12" height="9" rx="1.5" stroke="white" strokeWidth="1.4" />
            <path d="M5 4V2.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1V4" stroke="white" strokeWidth="1.4" />
          </svg>
        </div>
        <span className="text-sm font-bold text-text-primary tracking-tight">
          방 매니저
        </span>
      </div>

      {/* Separator */}
      <div className="w-px h-5 bg-border-primary" />

      {/* Room Name */}
      {editingName ? (
        <input
          ref={nameInputRef}
          value={nameValue}
          onChange={(e) => setNameValue(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => { if (e.key === 'Enter') commitName(); if (e.key === 'Escape') { setNameValue(room.name); setEditingName(false); } }}
          className="text-sm font-medium text-text-primary bg-bg-secondary border border-border-secondary rounded-md px-2 py-0.5 outline-none focus:border-accent-primary w-40"
        />
      ) : (
        <button
          onClick={() => { setNameValue(room.name); setEditingName(true); }}
          className="text-sm font-medium text-text-secondary hover:text-text-primary transition-default flex items-center gap-1.5"
          title="클릭하여 방 이름 수정"
        >
          {room.name}
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="opacity-40">
            <path d="M8.5 1.5l2 2M1 11l.7-2.8L9.2 .7l2 2-7.5 7.5L1 11z" />
          </svg>
        </button>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Search */}
      <div className="relative w-56">
        <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary" width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <circle cx="7" cy="7" r="5.5" />
          <path d="M11 11l3.5 3.5" />
        </svg>
        <input
          type="text"
          placeholder="물품 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-8 pr-3 py-1.5 text-sm bg-bg-secondary border border-border-primary rounded-lg outline-none placeholder:text-text-tertiary focus:border-accent-primary transition-default"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary transition-default"
          >
            <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M1 1l12 12M13 1L1 13" />
            </svg>
          </button>
        )}
      </div>

      {/* Stats Button */}
      <button
        onClick={onOpenStats}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-bg-secondary text-text-secondary hover:bg-bg-tertiary hover:text-text-primary transition-default border border-border-primary"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
          <rect x="1" y="10" width="3" height="5" rx="0.5" />
          <rect x="6.5" y="6" width="3" height="9" rx="0.5" />
          <rect x="12" y="2" width="3" height="13" rx="0.5" />
        </svg>
        통계
      </button>

      {/* Gemini Button */}
      <button
        onClick={onOpenGemini}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-accent-primary/10 text-accent-secondary hover:bg-accent-primary/20 transition-default"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M8 1v14M1 8h14M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
        사진 분석
      </button>
    </header>
  );
}
