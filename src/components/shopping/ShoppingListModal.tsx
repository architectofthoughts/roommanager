import { useMemo, useState } from 'react';
import { ITEM_STATUS_META } from '../../constants/items';
import Modal from '../common/Modal';
import { useStore } from '../../store/useStore';
import type { ItemStatus } from '../../types';

const SHOPPING_STATUSES: ItemStatus[] = ['to-buy', 'low-stock'];

function formatChecklistLine(entry: ShoppingEntry) {
  const statusLabel = ITEM_STATUS_META[entry.status].label;
  return `- [ ] ${entry.name} x${entry.quantity} (${statusLabel}, ${entry.roomName} / ${entry.furnitureName}, ${entry.floor}층)`;
}

interface ShoppingEntry {
  id: string;
  name: string;
  quantity: number;
  category: string;
  memo: string;
  floor: number;
  status: ItemStatus;
  roomId: string;
  roomName: string;
  furnitureId: string;
  furnitureName: string;
  updatedAt: string;
}

interface ShoppingListModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ShoppingListModal({ isOpen, onClose }: ShoppingListModalProps) {
  const rooms = useStore((state) => state.rooms);
  const activeRoomId = useStore((state) => state.activeRoomId);
  const switchRoom = useStore((state) => state.switchRoom);
  const selectFurniture = useStore((state) => state.selectFurniture);
  const updateItem = useStore((state) => state.updateItem);
  const [copied, setCopied] = useState(false);

  const entries = useMemo(() => {
    const nextEntries: ShoppingEntry[] = [];

    for (const room of rooms) {
      const furnitureById = new Map(room.furniture.map((furniture) => [furniture.id, furniture.name]));

      for (const item of room.items) {
        if (!SHOPPING_STATUSES.includes(item.status)) continue;

        nextEntries.push({
          ...item,
          roomId: room.id,
          roomName: room.name,
          furnitureName: furnitureById.get(item.furnitureId) ?? '알 수 없는 가구',
        });
      }
    }

    return nextEntries.sort((left, right) => {
      const statusWeight = (status: ItemStatus) => status === 'to-buy' ? 0 : 1;
      const statusDelta = statusWeight(left.status) - statusWeight(right.status);
      if (statusDelta !== 0) return statusDelta;
      return Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
    });
  }, [rooms]);

  const groupedEntries = useMemo(() => {
    return entries.reduce<Record<ItemStatus, ShoppingEntry[]>>((acc, entry) => {
      acc[entry.status].push(entry);
      return acc;
    }, {
      stored: [],
      'low-stock': [],
      'to-buy': [],
      packed: [],
    });
  }, [entries]);

  const totalQuantity = entries.reduce((sum, entry) => sum + entry.quantity, 0);
  const roomCount = new Set(entries.map((entry) => entry.roomId)).size;

  const copyChecklist = async () => {
    const text = [
      '# 방 매니저 구매 목록',
      '',
      ...entries.map(formatChecklistLine),
    ].join('\n');

    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const focusEntry = (entry: ShoppingEntry) => {
    if (entry.roomId !== activeRoomId) {
      switchRoom(entry.roomId);
    }
    selectFurniture(entry.furnitureId);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="구매 목록" width="max-w-2xl">
      <div className="grid grid-cols-3 gap-2.5 mb-4">
        <SummaryTile label="항목" value={entries.length} />
        <SummaryTile label="총 수량" value={totalQuantity} />
        <SummaryTile label="방" value={roomCount} />
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border-primary bg-bg-secondary px-3 py-2.5">
        <div className="text-xs text-text-secondary">
          구매 필요와 부족 상태의 물품을 모든 방에서 모았습니다.
        </div>
        <button
          type="button"
          onClick={copyChecklist}
          disabled={entries.length === 0}
          className="rounded-lg bg-accent-primary px-3 py-1.5 text-xs font-medium text-white transition-default hover:bg-accent-secondary disabled:cursor-not-allowed disabled:opacity-40"
        >
          {copied ? '복사됨' : '체크리스트 복사'}
        </button>
      </div>

      {entries.length === 0 ? (
        <div className="py-10 text-center text-sm text-text-tertiary">
          구매하거나 보충할 물품이 없습니다.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {SHOPPING_STATUSES.map((status) => (
            <ShoppingSection
              key={status}
              status={status}
              entries={groupedEntries[status]}
              onFocus={focusEntry}
              onMarkStored={(itemId) => updateItem(itemId, { status: 'stored' })}
            />
          ))}
        </div>
      )}
    </Modal>
  );
}

function SummaryTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border-primary bg-bg-secondary px-3 py-2.5">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">{label}</div>
      <div className="mt-1 text-xl font-semibold text-text-primary">{value}</div>
    </div>
  );
}

function ShoppingSection({
  status,
  entries,
  onFocus,
  onMarkStored,
}: {
  status: ItemStatus;
  entries: ShoppingEntry[];
  onFocus: (entry: ShoppingEntry) => void;
  onMarkStored: (itemId: string) => void;
}) {
  const meta = ITEM_STATUS_META[status];

  if (entries.length === 0) return null;

  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">{meta.label}</h3>
        <span
          className="rounded-full border px-2 py-0.5 text-[10px] font-medium"
          style={{ backgroundColor: meta.bg, color: meta.text, borderColor: meta.border }}
        >
          {entries.length}종
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        {entries.map((entry) => (
          <div key={entry.id} className="rounded-lg border border-border-primary bg-bg-secondary p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-sm font-semibold text-text-primary">{entry.name}</span>
                  <span className="rounded bg-bg-tertiary px-1.5 py-px text-[10px] text-text-tertiary">x{entry.quantity}</span>
                  <span className="rounded bg-accent-primary/8 px-1.5 py-px text-[10px] text-accent-secondary">{entry.category}</span>
                </div>
                <div className="mt-1 text-[11px] text-text-secondary">
                  {entry.roomName} / {entry.furnitureName} / {entry.floor}층
                </div>
                {entry.memo && (
                  <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-text-tertiary">{entry.memo}</p>
                )}
              </div>

              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => onFocus(entry)}
                  className="rounded-md border border-border-primary bg-bg-primary px-2.5 py-1.5 text-[11px] font-medium text-text-secondary transition-default hover:bg-bg-tertiary hover:text-text-primary"
                >
                  위치
                </button>
                <button
                  type="button"
                  onClick={() => onMarkStored(entry.id)}
                  className="rounded-md bg-success-soft px-2.5 py-1.5 text-[11px] font-medium text-success-text transition-default hover:opacity-80"
                >
                  보관중
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
