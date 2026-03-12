interface MobileBottomBarProps {
  furniturePanelOpen: boolean;
  onToggleFurniturePanel: () => void;
  onOpenStats: () => void;
  onOpenRoomAnalysis: () => void;
  onOpenGemini: () => void;
}

function NavButton({ active, onClick, icon, label }: {
  active?: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-2 rounded-lg transition-default active:scale-95 ${
        active
          ? 'text-accent-primary'
          : 'text-text-tertiary active:text-text-secondary'
      }`}
    >
      {icon}
      <span className="text-[10px] font-medium leading-tight">{label}</span>
    </button>
  );
}

export default function MobileBottomBar({
  furniturePanelOpen,
  onToggleFurniturePanel,
  onOpenStats,
  onOpenRoomAnalysis,
  onOpenGemini,
}: MobileBottomBarProps) {
  return (
    <nav
      className="shrink-0 flex items-stretch border-t border-border-primary bg-bg-primary px-1 safe-bottom"
    >
      <NavButton
        active={furniturePanelOpen}
        onClick={onToggleFurniturePanel}
        icon={
          <svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
            <rect x="2" y="6" width="16" height="10" rx="1.5" />
            <path d="M5 6V4.5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1V6" />
          </svg>
        }
        label="가구"
      />
      <NavButton
        onClick={onOpenStats}
        icon={
          <svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
            <rect x="2" y="12" width="4" height="6" rx="0.5" />
            <rect x="8" y="8" width="4" height="10" rx="0.5" />
            <rect x="14" y="4" width="4" height="14" rx="0.5" />
          </svg>
        }
        label="통계"
      />
      <NavButton
        onClick={onOpenRoomAnalysis}
        icon={
          <svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
            <rect x="2" y="4" width="16" height="12" rx="1.5" />
            <path d="M6 9h8M6 12h4" />
          </svg>
        }
        label="방분석"
      />
      <NavButton
        onClick={onOpenGemini}
        icon={
          <svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
            <path d="M10 2v16M2 10h16M4.5 4.5l11 11M15.5 4.5l-11 11" />
          </svg>
        }
        label="물품분석"
      />
    </nav>
  );
}
