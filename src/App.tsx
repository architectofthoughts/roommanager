import { useState, useEffect, lazy, Suspense } from 'react';
import TopBar from './components/layout/TopBar';
import LeftSidebar from './components/layout/LeftSidebar';
import RoomCanvas from './components/layout/RoomCanvas';
import RightSidebar from './components/layout/RightSidebar';
import MobileBottomBar from './components/layout/MobileBottomBar';
import { useIsMobile } from './hooks/useMediaQuery';
import { useStore } from './store/useStore';

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

  // Auto-open right bottom sheet when furniture is selected on mobile
  useEffect(() => {
    if (!isMobile) return;
    if (selectedFurnitureId) {
      setMobileRightOpen(true);
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
    selectFurniture(null);
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
            if (mobileRightOpen) closeMobileRight();
          }}
          onOpenStats={() => { setStatsOpen(true); setMobileLeftOpen(false); }}
          onOpenRoomAnalysis={() => { setRoomAnalysisOpen(true); setMobileLeftOpen(false); }}
          onOpenGemini={() => { setGeminiOpen(true); setMobileLeftOpen(false); }}
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
            <LeftSidebar mobile />
          </div>
        </div>
      )}

      {/* Mobile right bottom sheet overlay */}
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
              <RightSidebar mobile />
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
