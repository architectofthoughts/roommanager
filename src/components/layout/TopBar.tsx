import { useState, useRef, useEffect, useMemo, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useStore, useRoom } from '../../store/useStore';
import { useIsMobile } from '../../hooks/useMediaQuery';

interface TopBarProps {
  onOpenGemini: () => void;
  onOpenStats: () => void;
  onOpenRoomAnalysis: () => void;
}

interface SearchResult {
  itemId: string;
  roomId: string;
  roomName: string;
  furnitureId: string;
  furnitureName: string;
  itemName: string;
  quantity: number;
  category: string;
  memo: string;
  floor: number;
  updatedAt: string;
  matchedFields: string[];
  score: number;
}

const SEARCH_RESULT_LIMIT = 18;

const searchDateFormatter = new Intl.DateTimeFormat('ko-KR', {
  month: 'short',
  day: 'numeric',
});

function createMemoSnippet(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return '';
  if (trimmed.length <= 52) return trimmed;
  return `${trimmed.slice(0, 52).trimEnd()}…`;
}

function formatSearchDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '날짜 없음';
  return searchDateFormatter.format(date);
}

function buildSearchResultScore(query: string, itemName: string, category: string, memo: string, furnitureName: string, roomName: string, isActiveRoom: boolean) {
  let score = isActiveRoom ? 4 : 0;

  if (itemName === query) score += 12;
  else if (itemName.startsWith(query)) score += 9;
  else if (itemName.includes(query)) score += 7;

  if (category.startsWith(query)) score += 3;
  else if (category.includes(query)) score += 2;

  if (furnitureName.startsWith(query)) score += 4;
  else if (furnitureName.includes(query)) score += 2;

  if (roomName.startsWith(query)) score += 2;
  else if (roomName.includes(query)) score += 1;

  if (memo.includes(query)) score += 1;

  return score;
}

function SearchResultsPanel({
  query,
  results,
  totalResults,
  activeRoomResultCount,
  activeRoomId,
  highlightedIndex,
  mobile,
  onSelect,
}: {
  query: string;
  results: SearchResult[];
  totalResults: number;
  activeRoomResultCount: number;
  activeRoomId: string;
  highlightedIndex: number;
  mobile?: boolean;
  onSelect: (result: SearchResult) => void;
}) {
  const hasOverflowResults = totalResults > results.length;

  return (
    <div
      className={`absolute top-full left-0 right-0 z-50 mt-2 overflow-hidden rounded-2xl border border-border-primary bg-bg-primary shadow-2xl ${
        mobile ? '' : 'w-[360px] max-w-[calc(100vw-32px)]'
      }`}
    >
      <div className="flex items-center justify-between border-b border-border-primary px-3 py-2">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
            검색 결과
          </div>
          <div className="text-[11px] text-text-secondary">
            {totalResults}건 일치 / 현재 방 {activeRoomResultCount}건
          </div>
        </div>
        <div className="max-w-[120px] truncate rounded-full bg-accent-primary/10 px-2 py-0.5 text-[10px] font-medium text-accent-secondary">
          {query}
        </div>
      </div>

      {results.length === 0 ? (
        <div className="px-4 py-6 text-center text-xs text-text-tertiary">
          일치하는 물품이 없습니다.
          <br />
          이름, 카테고리, 메모, 가구명, 방 이름으로 검색해보세요.
        </div>
      ) : (
        <>
          <div className={`overflow-y-auto custom-scrollbar ${mobile ? 'max-h-[48vh]' : 'max-h-[420px]'}`}>
            {results.map((result, index) => {
              const isActiveRoom = result.roomId === activeRoomId;
              const isHighlighted = index === highlightedIndex;
              const memoSnippet = createMemoSnippet(result.memo);

              return (
                <button
                  key={result.itemId}
                  type="button"
                  onClick={() => onSelect(result)}
                  className={`w-full border-b border-border-primary/70 px-3 py-2.5 text-left transition-default last:border-b-0 ${
                    isHighlighted
                      ? 'bg-accent-primary/10'
                      : 'hover:bg-bg-secondary'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold text-text-primary">
                          {result.itemName}
                        </span>
                        <span className="shrink-0 rounded-full bg-bg-secondary px-1.5 py-0.5 text-[10px] text-text-tertiary">
                          x{result.quantity}
                        </span>
                        <span className="shrink-0 rounded-full bg-accent-primary/8 px-1.5 py-0.5 text-[10px] text-accent-secondary">
                          {result.floor}층
                        </span>
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-text-secondary">
                        <span className="rounded bg-bg-secondary px-1.5 py-0.5">{result.category}</span>
                        <span className="truncate">{result.furnitureName}</span>
                        <span className={isActiveRoom ? 'text-accent-secondary' : 'text-text-tertiary'}>
                          {result.roomName}
                        </span>
                      </div>

                      {memoSnippet && (
                        <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-text-tertiary">
                          {memoSnippet}
                        </p>
                      )}
                    </div>

                    <div className="shrink-0 text-right">
                      <div className="text-[10px] text-text-tertiary">{formatSearchDate(result.updatedAt)}</div>
                      <div className="mt-1 flex flex-wrap justify-end gap-1">
                        {result.matchedFields.map((field) => (
                          <span
                            key={`${result.itemId}-${field}`}
                            className="rounded-full bg-info-soft px-1.5 py-0.5 text-[9px] font-medium text-info-text"
                          >
                            {field}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {hasOverflowResults && (
            <div className="border-t border-border-primary bg-bg-secondary px-3 py-2 text-[10px] text-text-tertiary">
              상위 {results.length}건만 표시 중입니다. 검색어를 더 구체적으로 입력해보세요.
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function TopBar({ onOpenGemini, onOpenStats, onOpenRoomAnalysis }: TopBarProps) {
  const mobile = useIsMobile();
  const room = useRoom();
  const {
    rooms,
    activeRoomId,
    updateRoom,
    switchRoom,
    addRoom,
    deleteRoom,
    duplicateRoom,
    renameRoom,
    searchQuery,
    setSearchQuery,
    themeMode,
    setThemeMode,
    selectFurniture,
  } = useStore();

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(room.name);
  const [roomMenuOpen, setRoomMenuOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [showNewRoomInput, setShowNewRoomInput] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [searchResultsOpen, setSearchResultsOpen] = useState(false);
  const [highlightedResultIndex, setHighlightedResultIndex] = useState(0);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const newRoomInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const desktopSearchInputRef = useRef<HTMLInputElement>(null);
  const searchAreaRef = useRef<HTMLDivElement>(null);

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();

  const searchResults = useMemo(() => {
    if (!normalizedSearchQuery) return [];

    const results: SearchResult[] = [];

    for (const currentRoom of rooms) {
      const furnitureById = new Map(currentRoom.furniture.map((furniture) => [furniture.id, furniture]));

      for (const item of currentRoom.items) {
        const furniture = furnitureById.get(item.furnitureId);
        if (!furniture) continue;

        const itemName = item.name.toLowerCase();
        const category = item.category.toLowerCase();
        const memo = item.memo.toLowerCase();
        const furnitureName = furniture.name.toLowerCase();
        const roomName = currentRoom.name.toLowerCase();

        const matchedFields: string[] = [];
        if (itemName.includes(normalizedSearchQuery)) matchedFields.push('이름');
        if (category.includes(normalizedSearchQuery)) matchedFields.push('카테고리');
        if (memo.includes(normalizedSearchQuery)) matchedFields.push('메모');
        if (furnitureName.includes(normalizedSearchQuery)) matchedFields.push('가구');
        if (roomName.includes(normalizedSearchQuery)) matchedFields.push('방');

        if (matchedFields.length === 0) continue;

        results.push({
          itemId: item.id,
          roomId: currentRoom.id,
          roomName: currentRoom.name,
          furnitureId: furniture.id,
          furnitureName: furniture.name,
          itemName: item.name,
          quantity: item.quantity,
          category: item.category,
          memo: item.memo,
          floor: item.floor ?? 1,
          updatedAt: item.updatedAt,
          matchedFields,
          score: buildSearchResultScore(
            normalizedSearchQuery,
            itemName,
            category,
            memo,
            furnitureName,
            roomName,
            currentRoom.id === activeRoomId
          ),
        });
      }
    }

    return results.sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    });
  }, [rooms, normalizedSearchQuery, activeRoomId]);

  const visibleSearchResults = useMemo(
    () => searchResults.slice(0, SEARCH_RESULT_LIMIT),
    [searchResults]
  );

  const activeRoomResultCount = useMemo(
    () => searchResults.filter((result) => result.roomId === activeRoomId).length,
    [searchResults, activeRoomId]
  );

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
    const handler = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setRoomMenuOpen(false);
        setShowNewRoomInput(false);
        setNewRoomName('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [roomMenuOpen]);

  useEffect(() => {
    if (!searchResultsOpen) return;
    const handler = (event: MouseEvent) => {
      if (searchAreaRef.current && !searchAreaRef.current.contains(event.target as Node)) {
        setSearchResultsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [searchResultsOpen]);

  useEffect(() => {
    if (!normalizedSearchQuery) {
      setSearchResultsOpen(false);
      setHighlightedResultIndex(0);
      return;
    }

    setSearchResultsOpen(true);
    setHighlightedResultIndex(0);
  }, [normalizedSearchQuery]);

  useEffect(() => {
    if (mobile && !mobileSearchOpen) {
      setSearchResultsOpen(false);
      setHighlightedResultIndex(0);
    }
  }, [mobile, mobileSearchOpen]);

  useEffect(() => {
    if (highlightedResultIndex >= visibleSearchResults.length) {
      setHighlightedResultIndex(0);
    }
  }, [highlightedResultIndex, visibleSearchResults.length]);

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

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResultsOpen(false);
    setHighlightedResultIndex(0);
  };

  const handleSearchResultSelect = (result: SearchResult) => {
    if (result.roomId !== activeRoomId) {
      switchRoom(result.roomId);
    }

    selectFurniture(result.furnitureId);
    setSearchResultsOpen(false);
    setHighlightedResultIndex(0);

    if (mobile) {
      setMobileSearchOpen(false);
    }
  };

  const handleSearchKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (!normalizedSearchQuery) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSearchResultsOpen(true);
      setHighlightedResultIndex((current) => (
        visibleSearchResults.length === 0 ? 0 : (current + 1) % visibleSearchResults.length
      ));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSearchResultsOpen(true);
      setHighlightedResultIndex((current) => (
        visibleSearchResults.length === 0
          ? 0
          : (current - 1 + visibleSearchResults.length) % visibleSearchResults.length
      ));
      return;
    }

    if (event.key === 'Enter' && visibleSearchResults[highlightedResultIndex]) {
      event.preventDefault();
      handleSearchResultSelect(visibleSearchResults[highlightedResultIndex]);
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      setSearchResultsOpen(false);
      if (mobile) {
        setMobileSearchOpen(false);
      } else {
        desktopSearchInputRef.current?.blur();
      }
    }
  };

  const toggleTheme = () => {
    setThemeMode(themeMode === 'dark' ? 'light' : 'dark');
  };

  const showSearchResults = searchResultsOpen && !!normalizedSearchQuery;

  const themeButton = (
    <button
      onClick={toggleTheme}
      className={`flex items-center justify-center gap-1.5 rounded-lg border border-border-primary bg-bg-secondary text-text-secondary hover:bg-bg-tertiary hover:text-text-primary transition-default ${
        mobile ? 'h-9 w-9' : 'px-3 py-1.5 text-sm font-medium'
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
      <div className={`flex items-center shrink-0 ${mobile ? 'h-12 gap-2 px-3' : 'h-13 gap-4 px-5'}`}>
        <div className="flex shrink-0 items-center gap-2">
          <div className={`flex items-center justify-center rounded-lg bg-accent-primary ${mobile ? 'h-6 w-6' : 'h-7 w-7'}`}>
            <svg width={mobile ? 12 : 14} height={mobile ? 12 : 14} viewBox="0 0 16 16" fill="none">
              <rect x="2" y="4" width="12" height="9" rx="1.5" stroke="white" strokeWidth="1.4" />
              <path d="M5 4V2.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1V4" stroke="white" strokeWidth="1.4" />
            </svg>
          </div>
          {!mobile && (
            <span className="text-sm font-bold tracking-tight text-text-primary">
              방 매니저
            </span>
          )}
        </div>

        {!mobile && <div className="h-5 w-px bg-border-primary" />}

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setRoomMenuOpen(!roomMenuOpen)}
            className={`flex items-center gap-1.5 rounded-lg border border-border-primary bg-bg-secondary text-sm font-medium text-text-primary hover:bg-bg-tertiary transition-default ${
              mobile ? 'px-2.5 py-1.5' : 'px-2.5 py-1'
            }`}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" className="text-text-tertiary">
              <path d="M2 3h12M2 8h12M2 13h12" />
            </svg>
            <span className={mobile ? 'max-w-[120px] truncate' : ''}>{room.name}</span>
            <span className="ml-0.5 text-[10px] text-text-tertiary">({rooms.length})</span>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" className="text-text-tertiary">
              <path d="M2.5 4L5 6.5L7.5 4" />
            </svg>
          </button>

          {roomMenuOpen && (
            <div className={`absolute left-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-border-primary bg-bg-primary shadow-xl ${
              mobile ? 'w-[calc(100vw-24px)] max-w-[320px]' : 'w-64'
            }`}>
              <div className="max-h-60 overflow-y-auto custom-scrollbar py-1">
                {rooms.map((currentRoom) => (
                  <div
                    key={currentRoom.id}
                    className={`group flex cursor-pointer items-center gap-2 px-3 transition-default ${
                      mobile ? 'py-2.5' : 'py-2'
                    } ${
                      currentRoom.id === activeRoomId ? 'bg-accent-primary/10' : 'hover:bg-bg-secondary'
                    }`}
                    onClick={() => {
                      switchRoom(currentRoom.id);
                      setRoomMenuOpen(false);
                    }}
                  >
                    <div className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                      currentRoom.id === activeRoomId ? 'bg-accent-primary' : 'bg-transparent'
                    }`} />

                    <div className="min-w-0 flex-1">
                      <div className={`truncate text-sm ${
                        currentRoom.id === activeRoomId ? 'font-semibold text-accent-secondary' : 'text-text-primary'
                      }`}>
                        {currentRoom.name}
                      </div>
                      <div className="text-[10px] text-text-tertiary">
                        {currentRoom.furniture.length}개 가구 / {currentRoom.items.length}개 물품
                      </div>
                    </div>

                    <div
                      className={`flex shrink-0 gap-1 transition-default ${
                        mobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      }`}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <button
                        onClick={() => {
                          const newName = prompt('방 이름 변경', currentRoom.name);
                          if (newName?.trim()) renameRoom(currentRoom.id, newName.trim());
                        }}
                        className={`flex items-center justify-center rounded text-text-tertiary hover:bg-bg-tertiary hover:text-text-primary transition-default ${
                          mobile ? 'h-8 w-8' : 'h-6 w-6'
                        }`}
                        title="이름 변경"
                      >
                        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M8.5 1.5l2 2M1 11l.7-2.8L9.2.7l2 2-7.5 7.5L1 11z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => {
                          duplicateRoom(currentRoom.id);
                          setRoomMenuOpen(false);
                        }}
                        className={`flex items-center justify-center rounded text-text-tertiary hover:bg-bg-tertiary hover:text-text-primary transition-default ${
                          mobile ? 'h-8 w-8' : 'h-6 w-6'
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
                          onClick={() => {
                            deleteRoom(currentRoom.id);
                            if (rooms.length <= 2) setRoomMenuOpen(false);
                          }}
                          className={`flex items-center justify-center rounded text-text-tertiary hover:bg-danger-soft hover:text-danger-text transition-default ${
                            mobile ? 'h-8 w-8' : 'h-6 w-6'
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

              <div className="border-t border-border-primary p-2">
                {showNewRoomInput ? (
                  <div className="flex gap-1.5">
                    <input
                      ref={newRoomInputRef}
                      type="text"
                      placeholder="새 방 이름"
                      value={newRoomName}
                      onChange={(event) => setNewRoomName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') handleAddRoom();
                        if (event.key === 'Escape') {
                          setShowNewRoomInput(false);
                          setNewRoomName('');
                        }
                      }}
                      className="flex-1 rounded-md border border-border-primary bg-bg-secondary px-2.5 py-1.5 text-sm outline-none placeholder:text-text-tertiary focus:border-accent-primary transition-default"
                    />
                    <button
                      onClick={handleAddRoom}
                      disabled={!newRoomName.trim()}
                      className="rounded-md bg-accent-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-secondary transition-default disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      추가
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowNewRoomInput(true)}
                    className={`flex w-full items-center justify-center gap-1.5 rounded-md text-xs font-medium text-text-secondary hover:bg-accent-primary/5 hover:text-accent-secondary transition-default ${
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

        {!mobile && (
          editingName ? (
            <input
              ref={nameInputRef}
              value={nameValue}
              onChange={(event) => setNameValue(event.target.value)}
              onBlur={commitName}
              onKeyDown={(event) => {
                if (event.key === 'Enter') commitName();
                if (event.key === 'Escape') {
                  setNameValue(room.name);
                  setEditingName(false);
                }
              }}
              className="w-40 rounded-md border border-border-secondary bg-bg-secondary px-2 py-0.5 text-sm font-medium text-text-primary outline-none focus:border-accent-primary"
            />
          ) : (
            <button
              onClick={() => {
                setNameValue(room.name);
                setEditingName(true);
              }}
              className="flex items-center gap-1 text-[11px] text-text-tertiary hover:text-text-primary transition-default"
              title="클릭하여 방 이름 수정"
            >
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="opacity-40">
                <path d="M8.5 1.5l2 2M1 11l.7-2.8L9.2.7l2 2-7.5 7.5L1 11z" />
              </svg>
              이름 수정
            </button>
          )
        )}

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
              onChange={(event) => {
                const value = Math.max(4, Math.min(50, Number(event.target.value)));
                updateRoom({ gridWidth: value });
              }}
              className="w-11 rounded border border-border-primary bg-bg-secondary px-1.5 py-0.5 text-center text-xs outline-none focus:border-accent-primary transition-default"
              title="가로 그리드"
            />
            <span className="text-text-tertiary">x</span>
            <input
              type="number"
              min={4}
              max={50}
              value={room.gridHeight}
              onChange={(event) => {
                const value = Math.max(4, Math.min(50, Number(event.target.value)));
                updateRoom({ gridHeight: value });
              }}
              className="w-11 rounded border border-border-primary bg-bg-secondary px-1.5 py-0.5 text-center text-xs outline-none focus:border-accent-primary transition-default"
              title="세로 그리드"
            />
          </div>
        )}

        <div className="flex-1" />

        {mobile ? (
          <div className="flex items-center gap-1">
            {themeButton}
            <button
              onClick={() => {
                setMobileSearchOpen(!mobileSearchOpen);
                if (!mobileSearchOpen && normalizedSearchQuery) {
                  setSearchResultsOpen(true);
                }
              }}
              className={`flex h-9 w-9 items-center justify-center rounded-lg transition-default ${
                mobileSearchOpen || searchQuery
                  ? 'bg-accent-primary/10 text-accent-primary'
                  : 'text-text-tertiary hover:bg-bg-secondary hover:text-text-primary'
              }`}
            >
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <circle cx="7" cy="7" r="5.5" />
                <path d="M11 11l3.5 3.5" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="relative w-56" ref={searchAreaRef}>
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary" width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <circle cx="7" cy="7" r="5.5" />
              <path d="M11 11l3.5 3.5" />
            </svg>
            <input
              ref={desktopSearchInputRef}
              type="text"
              placeholder="물품 검색..."
              value={searchQuery}
              onFocus={() => {
                if (normalizedSearchQuery) setSearchResultsOpen(true);
              }}
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="w-full rounded-lg border border-border-primary bg-bg-secondary py-1.5 pl-8 pr-9 text-sm outline-none placeholder:text-text-tertiary focus:border-accent-primary transition-default"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary transition-default"
              >
                <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M1 1l12 12M13 1L1 13" />
                </svg>
              </button>
            )}

            {showSearchResults && (
              <SearchResultsPanel
                query={searchQuery}
                results={visibleSearchResults}
                totalResults={searchResults.length}
                activeRoomResultCount={activeRoomResultCount}
                activeRoomId={activeRoomId}
                highlightedIndex={highlightedResultIndex}
                onSelect={handleSearchResultSelect}
              />
            )}
          </div>
        )}

        {!mobile && (
          <>
            {themeButton}
            <button
              onClick={onOpenStats}
              className="flex items-center gap-1.5 rounded-lg border border-border-primary bg-bg-secondary px-3 py-1.5 text-sm font-medium text-text-secondary hover:bg-bg-tertiary hover:text-text-primary transition-default"
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
              className="flex items-center gap-1.5 rounded-lg bg-accent-primary/10 px-3 py-1.5 text-sm font-medium text-accent-secondary hover:bg-accent-primary/20 transition-default"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <rect x="1" y="3" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                <path d="M5 7h6M5 10h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
              방 사진 분석
            </button>

            <button
              onClick={onOpenGemini}
              className="flex items-center gap-1.5 rounded-lg border border-border-primary bg-bg-secondary px-3 py-1.5 text-sm font-medium text-text-secondary hover:bg-bg-tertiary hover:text-text-primary transition-default"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M8 1v14M1 8h14M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              물품 분석
            </button>
          </>
        )}
      </div>

      {mobile && mobileSearchOpen && (
        <div className="relative border-t border-border-primary/50 px-3 pb-2" ref={searchAreaRef}>
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
              onFocus={() => {
                if (normalizedSearchQuery) setSearchResultsOpen(true);
              }}
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="w-full rounded-xl border border-border-primary bg-bg-secondary py-2.5 pl-9 pr-10 text-sm outline-none placeholder:text-text-tertiary focus:border-accent-primary transition-default"
            />
            <button
              onClick={() => {
                clearSearch();
                setMobileSearchOpen(false);
              }}
              className="absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-text-tertiary hover:bg-bg-tertiary hover:text-text-primary transition-default"
            >
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M1 1l12 12M13 1L1 13" />
              </svg>
            </button>
          </div>

          {showSearchResults && (
            <SearchResultsPanel
              query={searchQuery}
              results={visibleSearchResults}
              totalResults={searchResults.length}
              activeRoomResultCount={activeRoomResultCount}
              activeRoomId={activeRoomId}
              highlightedIndex={highlightedResultIndex}
              mobile
              onSelect={handleSearchResultSelect}
            />
          )}
        </div>
      )}
    </header>
  );
}
