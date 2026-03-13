import { useState, useRef, useEffect } from 'react';
import { useStore, useRoom } from '../../store/useStore';
import { useIsMobile } from '../../hooks/useMediaQuery';

interface TopBarProps {
  onOpenGemini: () => void;
  onOpenStats: () => void;
  onOpenRoomAnalysis: () => void;
}

export default function TopBar({ onOpenGemini, onOpenStats, onOpenRoomAnalysis }: TopBarProps) {
  const mobile = useIsMobile();
  const room = useRoom();
  const { rooms, activeRoomId, updateRoom, switchRoom, addRoom, deleteRoom, duplicateRoom, renameRoom, searchQuery, setSearchQuery, themeMode, setThemeMode } = useStore();
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(room.name);
  const [roomMenuOpen, setRoomMenuOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [showNewRoomInput, setShowNewRoomInput] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const newRoomInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setNameValue(room.name);
  }, [room.name]);

  useEffect(() => {
    if (editingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [editingName]);

  useEffect(() => {
    if (showNewRoomInput && newRoomInputRef.current) {
      newRoomInputRef.current.focus();
    }
  }, [showNewRoomInput]);

  useEffect(() => {
    if (mobileSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [mobileSearchOpen]);

  useEffect(() => {
    if (!roomMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setRoomMenuOpen(false);
        setShowNewRoomInput(false);
        setNewRoomName('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [roomMenuOpen]);

  const commitName = () => {
    const trimmed = nameValue.trim();
    if (trimmed) updateRoom({ name: trimmed });
    else setNameValue(room.name);
    setEditingName(false);
  };

  const handleAddRoom = () => {
    const trimmed = newRoomName.trim();
    if (!trimmed) return;
    addRoom(trimmed);
    setNewRoomName('');
    setShowNewRoomInput(false);
    setRoomMenuOpen(false);
  };

  const toggleTheme = () => {
    setThemeMode(themeMode === 'dark' ? 'light' : 'dark');
  };

  const themeButton = (
    <button
      onClick={toggleTheme}
      className={`flex items-center justify-center gap-1.5 rounded-lg border border-border-primary bg-bg-secondary text-text-secondary hover:bg-bg-tertiary hover:text-text-primary transition-default ${
        mobile ? 'w-9 h-9' : 'px-3 py-1.5 text-sm font-medium'
      }`}
      title={themeMode === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
      aria-label={themeMode === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
    >
      {themeMode === 'dark' ? (
        <svg width={mobile ? 17 : 14} height={mobile ? 17 : 14} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
          <circle cx="8" cy="8" r="3" />
          <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M12.6 3.4l-1.4 1.4M4.8 11.2l-1.4 1.4" />
        </svg>
      ) : (
        <svg width={mobile ? 17 : 14} height={mobile ? 17 : 14} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
          <path d="M10.8 1.8a5.9 5.9 0 1 0 3.4 10.8A6.5 6.5 0 0 1 10.8 1.8z" />
        </svg>
      )}
      {!mobile && <span>{themeMode === 'dark' ? '라이트' : '다크'}</span>}
    </button>
  );

  return (
    <header className="flex flex-col shrink-0 border-b border-border-primary bg-bg-primary">
      {/* Main row */}
      <div className={`flex items-center shrink-0 ${
        mobile ? 'h-12 gap-2 px-3' : 'h-13 gap-4 px-5'
      }`}>
        {/* App Title */}
        <div className="flex items-center gap-2 shrink-0">
          <div className={`rounded-lg bg-accent-primary flex items-center justify-center ${
            mobile ? 'w-6 h-6' : 'w-7 h-7'
          }`}>
            <svg width={mobile ? 12 : 14} height={mobile ? 12 : 14} viewBox="0 0 16 16" fill="none">
              <rect x="2" y="4" width="12" height="9" rx="1.5" stroke="white" strokeWidth="1.4" />
              <path d="M5 4V2.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1V4" stroke="white" strokeWidth="1.4" />
            </svg>
          </div>
          {!mobile && (
            <span className="text-sm font-bold text-text-primary tracking-tight">
              방 매니저
            </span>
          )}
        </div>

        {/* Separator — desktop only */}
        {!mobile && <div className="w-px h-5 bg-border-primary" />}

        {/* Room Selector */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setRoomMenuOpen(!roomMenuOpen)}
            className={`flex items-center gap-1.5 text-sm font-medium rounded-lg border border-border-primary bg-bg-secondary text-text-primary hover:bg-bg-tertiary transition-default ${
              mobile ? 'px-2.5 py-1.5' : 'px-2.5 py-1'
            }`}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" className="text-text-tertiary">
              <path d="M2 3h12M2 8h12M2 13h12" />
            </svg>
            <span className={mobile ? 'max-w-[120px] truncate' : ''}>{room.name}</span>
            <span className="text-[10px] text-text-tertiary ml-0.5">
              ({rooms.length})
            </span>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" className="text-text-tertiary">
              <path d="M2.5 4L5 6.5L7.5 4" />
            </svg>
          </button>

          {roomMenuOpen && (
            <div className={`absolute top-full left-0 mt-1 bg-bg-primary border border-border-primary rounded-xl shadow-xl z-50 overflow-hidden ${
              mobile ? 'w-[calc(100vw-24px)] max-w-[320px]' : 'w-64'
            }`}>
              {/* Room list */}
              <div className="max-h-60 overflow-y-auto custom-scrollbar py-1">
                {rooms.map((r) => (
                  <div
                    key={r.id}
                    className={`flex items-center gap-2 px-3 cursor-pointer transition-default group ${
                      mobile ? 'py-2.5' : 'py-2'
                    } ${
                      r.id === activeRoomId
                        ? 'bg-accent-primary/10'
                        : 'hover:bg-bg-secondary'
                    }`}
                    onClick={() => { switchRoom(r.id); setRoomMenuOpen(false); }}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      r.id === activeRoomId ? 'bg-accent-primary' : 'bg-transparent'
                    }`} />

                    <div className="flex-1 min-w-0">
                      <div className={`text-sm truncate ${
                        r.id === activeRoomId ? 'font-semibold text-accent-secondary' : 'text-text-primary'
                      }`}>
                        {r.name}
                      </div>
                      <div className="text-[10px] text-text-tertiary">
                        {r.furniture.length}개 가구 / {r.items.length}개 물품
                      </div>
                    </div>

                    {/* Room actions */}
                    <div className={`flex gap-1 shrink-0 ${
                      mobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    } transition-default`} onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => {
                          const newName = prompt('방 이름 변경', r.name);
                          if (newName?.trim()) renameRoom(r.id, newName.trim());
                        }}
                        className={`flex items-center justify-center rounded text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary transition-default ${
                          mobile ? 'w-8 h-8' : 'w-6 h-6'
                        }`}
                        title="이름 변경"
                      >
                        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M8.5 1.5l2 2M1 11l.7-2.8L9.2.7l2 2-7.5 7.5L1 11z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => { duplicateRoom(r.id); setRoomMenuOpen(false); }}
                        className={`flex items-center justify-center rounded text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary transition-default ${
                          mobile ? 'w-8 h-8' : 'w-6 h-6'
                        }`}
                        title="복제"
                      >
                        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
                          <rect x="3" y="3" width="8" height="8" rx="1" />
                          <path d="M3 9H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v1" />
                        </svg>
                      </button>
                      {rooms.length > 1 && (
                        <button
                          onClick={() => { deleteRoom(r.id); if (rooms.length <= 2) setRoomMenuOpen(false); }}
                          className={`flex items-center justify-center rounded text-text-tertiary hover:text-danger-text hover:bg-danger-soft transition-default ${
                            mobile ? 'w-8 h-8' : 'w-6 h-6'
                          }`}
                          title="삭제"
                        >
                          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
                            <path d="M1.5 3h9M4.5 3V1.5h3V3M3 3l.5 7.5h5L9 3" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Add room */}
              <div className="border-t border-border-primary p-2">
                {showNewRoomInput ? (
                  <div className="flex gap-1.5">
                    <input
                      ref={newRoomInputRef}
                      type="text"
                      placeholder="새 방 이름"
                      value={newRoomName}
                      onChange={(e) => setNewRoomName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAddRoom(); if (e.key === 'Escape') { setShowNewRoomInput(false); setNewRoomName(''); } }}
                      className="flex-1 px-2.5 py-1.5 text-sm bg-bg-secondary border border-border-primary rounded-md outline-none placeholder:text-text-tertiary focus:border-accent-primary transition-default"
                    />
                    <button
                      onClick={handleAddRoom}
                      disabled={!newRoomName.trim()}
                      className="px-3 py-1.5 text-xs font-medium bg-accent-primary text-white rounded-md hover:bg-accent-secondary transition-default disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      추가
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowNewRoomInput(true)}
                    className={`w-full flex items-center justify-center gap-1.5 text-xs font-medium text-text-secondary hover:text-accent-secondary hover:bg-accent-primary/5 rounded-md transition-default ${
                      mobile ? 'py-2.5' : 'py-1.5'
                    }`}
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
                      <path d="M6 2v8M2 6h8" />
                    </svg>
                    새 방 추가
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Room Name Edit — desktop only */}
        {!mobile && (
          editingName ? (
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
              className="text-[11px] text-text-tertiary hover:text-text-primary transition-default flex items-center gap-1"
              title="클릭하여 방 이름 수정"
            >
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="opacity-40">
                <path d="M8.5 1.5l2 2M1 11l.7-2.8L9.2.7l2 2-7.5 7.5L1 11z" />
              </svg>
              이름 수정
            </button>
          )
        )}

        {/* Room Size — desktop only */}
        {!mobile && (
          <div className="flex items-center gap-1.5 text-xs text-text-secondary">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" className="text-text-tertiary">
              <rect x="1" y="1" width="14" height="14" rx="2" />
              <path d="M5 1v14M1 5h14" />
            </svg>
            <input
              type="number"
              min={4}
              max={50}
              value={room.gridWidth}
              onChange={(e) => {
                const v = Math.max(4, Math.min(50, Number(e.target.value)));
                updateRoom({ gridWidth: v });
              }}
              className="w-11 px-1.5 py-0.5 text-xs text-center bg-bg-secondary border border-border-primary rounded outline-none focus:border-accent-primary transition-default"
              title="가로 그리드"
            />
            <span className="text-text-tertiary">x</span>
            <input
              type="number"
              min={4}
              max={50}
              value={room.gridHeight}
              onChange={(e) => {
                const v = Math.max(4, Math.min(50, Number(e.target.value)));
                updateRoom({ gridHeight: v });
              }}
              className="w-11 px-1.5 py-0.5 text-xs text-center bg-bg-secondary border border-border-primary rounded outline-none focus:border-accent-primary transition-default"
              title="세로 그리드"
            />
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Search — desktop: inline input, mobile: toggle icon */}
        {mobile ? (
          <div className="flex items-center gap-1">
            {themeButton}
            <button
              onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
              className={`w-9 h-9 flex items-center justify-center rounded-lg transition-default ${
                mobileSearchOpen || searchQuery
                  ? 'bg-accent-primary/10 text-accent-primary'
                  : 'text-text-tertiary hover:text-text-primary hover:bg-bg-secondary'
              }`}
            >
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <circle cx="7" cy="7" r="5.5" />
                <path d="M11 11l3.5 3.5" />
              </svg>
            </button>
          </div>
        ) : (
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
        )}

        {/* Action buttons — desktop only */}
        {!mobile && (
          <>
            {themeButton}
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

            <button
              onClick={onOpenRoomAnalysis}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-accent-primary/10 text-accent-secondary hover:bg-accent-primary/20 transition-default"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <rect x="1" y="3" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                <path d="M5 7h6M5 10h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
              방 사진 분석
            </button>

            <button
              onClick={onOpenGemini}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-bg-secondary text-text-secondary hover:bg-bg-tertiary hover:text-text-primary transition-default border border-border-primary"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M8 1v14M1 8h14M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              물품 분석
            </button>
          </>
        )}
      </div>

      {/* Mobile search bar — slides down below TopBar */}
      {mobile && mobileSearchOpen && (
        <div className="px-3 pb-2 border-t border-border-primary/50">
          <div className="relative mt-2">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <circle cx="7" cy="7" r="5.5" />
              <path d="M11 11l3.5 3.5" />
            </svg>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="물품 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-10 py-2.5 text-sm bg-bg-secondary border border-border-primary rounded-xl outline-none placeholder:text-text-tertiary focus:border-accent-primary transition-default"
            />
            <button
              onClick={() => { setSearchQuery(''); setMobileSearchOpen(false); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary transition-default"
            >
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M1 1l12 12M13 1L1 13" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
