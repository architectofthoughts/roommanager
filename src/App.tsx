import { useState, lazy, Suspense } from 'react';
import TopBar from './components/layout/TopBar';
import LeftSidebar from './components/layout/LeftSidebar';
import RoomCanvas from './components/layout/RoomCanvas';
import RightSidebar from './components/layout/RightSidebar';

const GeminiModal = lazy(() => import('./components/gemini/GeminiModal'));
const StatsModal = lazy(() => import('./components/stats/StatsModal'));

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
  const [geminiOpen, setGeminiOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-bg-primary">
      <TopBar
        onOpenGemini={() => setGeminiOpen(true)}
        onOpenStats={() => setStatsOpen(true)}
      />
      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar />
        <RoomCanvas />
        <RightSidebar />
      </div>
      <Suspense fallback={<ModalFallback />}>
        {geminiOpen && <GeminiModal isOpen={geminiOpen} onClose={() => setGeminiOpen(false)} />}
        {statsOpen && <StatsModal isOpen={statsOpen} onClose={() => setStatsOpen(false)} />}
      </Suspense>
    </div>
  );
}
