import { useState, useEffect, lazy, Suspense } from 'react';
import TopBar from './components/layout/TopBar';
import LeftSidebar from './components/layout/LeftSidebar';
import RoomCanvas from './components/layout/RoomCanvas';
import RightSidebar from './components/layout/RightSidebar';
import MobileBottomBar from './components/layout/MobileBottomBar';
import { useIsMobile } from './hooks/useMediaQuery';
import { useStore, useRoom } from './store/useStore';
import type { FurnitureCategory } from './types';

const GeminiModal = lazy(() => import('./components/gemini/GeminiModal'));
const StatsModal = lazy(() => import('./components/stats/StatsModal'));
const RoomAnalysisModal = lazy(() => import('./components/gemini/RoomAnalysisModal'));

function ModalFallback() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-bg-primary rounded-xl px-8 py-6 text-sm text-text-secondary">
        불러오는 중...
      </div>
    </div>
  );
}

const CATEGORY_LABELS: Record<FurnitureCategory, string> = {
  storage: '수납장', bed: '침대', table: '테이블',
  seating: '의자', appliance: '가전', other: '기타',
};

function MobileQuickBar({ onOpenDetail, onDeselect }: { onOpenDetail: () => void; onDeselect: () => void }) {
  const room = useRoom();
  const selectedId = useStore((s) => s.selectedFurnitureId);
  const furniture = room.furniture.find((f) => f.id === selectedId);
  const itemCount = room.items.filter((i) => i.furnitureId === selectedId).length;

  if (!furniture) return null;

  return (
    <div
      className="fixed left-3 right-3 bottom-[60px] z-30 bg-bg-primary border border-border-primary rounded-xl shadow-xl px-3 py-2.5 flex items-center gap-2.5"
      style={{ animation: 'slideUp 200ms ease-out' }}
    >
      <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: furniture.color }} />
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <span className="text-sm font-semibold text-text-primary truncate">{furniture.name}</span>
        <span className="text-[10px] text-text-tertiary shrink-0">
          {CATEGORY_LABELS[furniture.category] ?? '기타'}
        </span>
        {itemCount > 0 && (
          <span className="text-[10px] text-accent-primary font-medium shrink-0">{itemCount}개</span>
        )}
      </div>
      <button
        onClick={onOpenDetail}
        className="px-3 py-1.5 text-xs font-medium bg-accent-primary text-white rounded-lg hover:bg-accent-secondary transition-default active:scale-95 shrink-0"
      >
        상세
      </button>
      <button
        onClick={onDeselect}
        className="w-8 h-8 flex items-center justify-center rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-secondary transition-default shrink-0"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M1 1l12 12M13 1L1 13" />
        </svg>
      </button>
    </div>
  );
}

export default function App() {
  const isMobile = useIsMobile();
  const selectedFurnitureId = useStore((s) => s.selectedFurnitureId);
  const selectFurniture = useStore((s) => s.selectFurniture);

  const [geminiOpen, setGeminiOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [roomAnalysisOpen, setRoomAnalysisOpen] = useState(false);

  // Mobile panel state
  const [mobileLeftOpen, setMobileLeftOpen] = useState(false);
  const [mobileRightOpen, setMobileRightOpen] = useState(false);

  // Step 1: selecting furniture on mobile just closes left drawer (no auto-open of sheet)
  // Step 2: user taps "상세" on quick bar to open sheet
  useEffect(() => {
    if (!isMobile) return;
    if (selectedFurnitureId) {
      setMobileLeftOpen(false);
    } else {
      setMobileRightOpen(false);
    }
  }, [isMobile, selectedFurnitureId]);

  // Close mobile panels when switching to desktop
  useEffect(() => {
    if (!isMobile) {
      setMobileLeftOpen(false);
      setMobileRightOpen(false);
    }
  }, [isMobile]);

  const closeMobileRight = () => {
    setMobileRightOpen(false);
    // Don't deselect — quick bar stays visible, user can reopen or deselect explicitly
  };

  return (
    <div className="flex flex-col h-screen h-[100dvh] w-screen overflow-hidden bg-bg-primary">
      <TopBar
        onOpenGemini={() => setGeminiOpen(true)}
        onOpenStats={() => setStatsOpen(true)}
        onOpenRoomAnalysis={() => setRoomAnalysisOpen(true)}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebars — inline */}
        {!isMobile && <LeftSidebar />}
        <RoomCanvas />
        {!isMobile && <RightSidebar />}
      </div>

      {/* Mobile bottom navigation */}
      {isMobile && (
        <MobileBottomBar
          furniturePanelOpen={mobileLeftOpen}
          onToggleFurniturePanel={() => {
            setMobileLeftOpen((v) => !v);
            if (mobileRightOpen) setMobileRightOpen(false);
          }}
          onOpenStats={() => { setStatsOpen(true); setMobileLeftOpen(false); }}
          onOpenRoomAnalysis={() => { setRoomAnalysisOpen(true); setMobileLeftOpen(false); }}
          onOpenGemini={() => { setGeminiOpen(true); setMobileLeftOpen(false); }}
        />
      )}

      {/* Mobile quick action bar — Step 1: light selection indicator */}
      {isMobile && selectedFurnitureId && !mobileRightOpen && !mobileLeftOpen && (
        <MobileQuickBar
          onOpenDetail={() => setMobileRightOpen(true)}
          onDeselect={() => selectFurniture(null)}
        />
      )}

      {/* Mobile left drawer overlay */}
      {isMobile && mobileLeftOpen && (
        <div className="fixed inset-0 z-40 top-12">
          <div
            className="absolute inset-0 bg-black/30"
            style={{ animation: 'fadeIn 150ms ease-out' }}
            onClick={() => setMobileLeftOpen(false)}
          />
          <div
            className="absolute left-0 top-0 bottom-0 w-[300px] max-w-[85vw] shadow-2xl"
            style={{ animation: 'slideInLeft 200ms ease-out' }}
            onClick={(e) => e.stopPropagation()}
          >
            <LeftSidebar
              mobile
              onSelectMobile={() => {
                setMobileLeftOpen(false);
                setMobileRightOpen(true);
              }}
              onOpenRoomAnalysis={() => {
                setMobileLeftOpen(false);
                setRoomAnalysisOpen(true);
              }}
            />
          </div>
        </div>
      )}

      {/* Mobile right bottom sheet overlay — Step 2: full detail */}
      {isMobile && mobileRightOpen && selectedFurnitureId && (
        <div className="fixed inset-0 z-40 top-12">
          <div
            className="absolute inset-0 bg-black/30"
            style={{ animation: 'fadeIn 150ms ease-out' }}
            onClick={closeMobileRight}
          />
          <div
            className="absolute inset-x-0 bottom-0 max-h-[75vh] bg-bg-primary rounded-t-2xl shadow-2xl flex flex-col"
            style={{ animation: 'slideUp 250ms ease-out' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle + close */}
            <div className="flex items-center justify-between px-4 pt-3 pb-1 shrink-0">
              <div className="w-8" />
              <div className="w-10 h-1 rounded-full bg-border-secondary" />
              <button
                onClick={closeMobileRight}
                className="w-8 h-8 flex items-center justify-center rounded-full text-text-tertiary hover:text-text-primary hover:bg-bg-secondary transition-default"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M1 1l12 12M13 1L1 13" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar overscroll-contain">
              <RightSidebar
                mobile
                onOpenGemini={() => {
                  closeMobileRight();
                  setGeminiOpen(true);
                }}
              />
            </div>
          </div>
        </div>
      )}

      <Suspense fallback={<ModalFallback />}>
        {geminiOpen && <GeminiModal isOpen={geminiOpen} onClose={() => setGeminiOpen(false)} />}
        {statsOpen && <StatsModal isOpen={statsOpen} onClose={() => setStatsOpen(false)} />}
        {roomAnalysisOpen && <RoomAnalysisModal isOpen={roomAnalysisOpen} onClose={() => setRoomAnalysisOpen(false)} />}
      </Suspense>
    </div>
  );
}
