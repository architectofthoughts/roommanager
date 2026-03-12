import { useState, useMemo, useEffect } from 'react';
import { useStore, useRoom } from '../../store/useStore';
import type { FurnitureCategory, BorderStyle } from '../../types';

const CATEGORIES: { value: FurnitureCategory; label: string }[] = [
  { value: 'storage', label: '수납장' },
  { value: 'bed', label: '침대' },
  { value: 'table', label: '테이블' },
  { value: 'seating', label: '의자' },
  { value: 'appliance', label: '가전' },
  { value: 'other', label: '기타' },
];

const CATEGORY_LABELS: Record<FurnitureCategory, string> = {
  storage: '수납장', bed: '침대', table: '테이블',
  seating: '의자', appliance: '가전', other: '기타',
};

const BADGE_CLASS: Record<FurnitureCategory, string> = {
  storage: 'badge-storage', bed: 'badge-bed', table: 'badge-table',
  seating: 'badge-seating', appliance: 'badge-appliance', other: 'badge-other',
};

const ITEM_CATEGORIES = ['의류', '책', '전자기기', '식품', '생활용품', '문구', '주방용품', '기타'];

const FURNITURE_COLORS = [
  '#8B5E3C', '#6B8EC4', '#C4956B', '#7BC46B', '#9B9B9B',
  '#B0A090', '#D47F5A', '#8B7EC4', '#C46B8E', '#5BAAB5',
];

function formatDate(iso: string) {
  const d = new Date(iso);
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  const hours = d.getHours().toString().padStart(2, '0');
  const mins = d.getMinutes().toString().padStart(2, '0');
  return `${month}/${day} ${hours}:${mins}`;
}

/* ─── Shared edit fields (used by both mobile & desktop) ─── */

interface EditFieldsProps {
  furniture: NonNullable<ReturnType<typeof useFurniture>>;
  items: ReturnType<typeof useItems>;
  mobile?: boolean;
  updateFurniture: (id: string, updates: Record<string, unknown>) => void;
  deleteFurniture: (id: string) => void;
}

function useFurniture() {
  const room = useRoom();
  const selectedFurnitureId = useStore((s) => s.selectedFurnitureId);
  return useMemo(
    () => room.furniture.find((f) => f.id === selectedFurnitureId) ?? null,
    [room.furniture, selectedFurnitureId]
  );
}

function useItems() {
  const room = useRoom();
  const selectedFurnitureId = useStore((s) => s.selectedFurnitureId);
  return useMemo(
    () => selectedFurnitureId ? room.items.filter((i) => i.furnitureId === selectedFurnitureId) : [],
    [room.items, selectedFurnitureId]
  );
}

function FurnitureEditFields({ furniture, items, mobile, updateFurniture, deleteFurniture }: EditFieldsProps) {
  const [deleteStep, setDeleteStep] = useState<'idle' | 'pin'>('idle');
  const [pinValue, setPinValue] = useState('');
  const [pinError, setPinError] = useState(false);

  useEffect(() => {
    setDeleteStep('idle');
    setPinValue('');
    setPinError(false);
  }, [furniture.id]);

  const handleDeleteFurniture = () => {
    if (deleteStep === 'idle') {
      setDeleteStep('pin');
      setPinValue('');
      setPinError(false);
    }
  };

  const handlePinSubmit = () => {
    if (pinValue === '1557') {
      deleteFurniture(furniture.id);
      setDeleteStep('idle');
      setPinValue('');
      setPinError(false);
    } else {
      setPinError(true);
      setPinValue('');
    }
  };

  const handlePinCancel = () => {
    setDeleteStep('idle');
    setPinValue('');
    setPinError(false);
  };

  const py = mobile ? 'py-2' : 'py-1.5';
  const sliderH = mobile ? 'h-2' : 'h-1.5';
  const colorSize = mobile ? 'w-8 h-8' : 'w-6 h-6';

  return (
    <div className="flex flex-col gap-2">
      {/* Name */}
      <label className="block">
        <span className="text-[11px] text-text-tertiary mb-0.5 block">이름</span>
        <input
          type="text"
          value={furniture.name}
          onChange={(e) => updateFurniture(furniture.id, { name: e.target.value })}
          className={`w-full px-2.5 ${py} text-sm bg-bg-secondary border border-border-primary rounded-md outline-none focus:border-accent-primary transition-default`}
        />
      </label>

      {/* Category */}
      <label className="block">
        <span className="text-[11px] text-text-tertiary mb-0.5 block">카테고리</span>
        <select
          value={furniture.category}
          onChange={(e) => updateFurniture(furniture.id, { category: e.target.value as FurnitureCategory })}
          className={`w-full px-2.5 ${py} text-sm bg-bg-secondary border border-border-primary rounded-md outline-none focus:border-accent-primary transition-default`}
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </label>

      {/* Color */}
      <div>
        <span className="text-[11px] text-text-tertiary mb-1 block">색상</span>
        <div className="flex gap-1.5 flex-wrap">
          {FURNITURE_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => updateFurniture(furniture.id, { color: c })}
              className={`${colorSize} rounded-full border-2 transition-default ${
                furniture.color === c ? 'border-text-primary scale-110' : 'border-transparent hover:scale-110'
              }`}
              style={{ backgroundColor: c }}
              title={c}
            />
          ))}
        </div>
      </div>

      {/* Opacity */}
      <label className="block">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-[11px] text-text-tertiary">투명도</span>
          <span className="text-[11px] text-text-tertiary">{Math.round((furniture.opacity ?? 0.33) * 100)}%</span>
        </div>
        <input type="range" min={0} max={100} step={1}
          value={Math.round((furniture.opacity ?? 0.33) * 100)}
          onChange={(e) => updateFurniture(furniture.id, { opacity: Number(e.target.value) / 100 })}
          className={`w-full ${sliderH} accent-accent-primary cursor-pointer`}
        />
      </label>

      {/* Border */}
      <div>
        <span className="text-[11px] text-text-tertiary mb-1 block">외곽선</span>
        <div className="flex gap-1.5 items-center mb-1.5">
          {(['solid', 'dashed', 'none'] as BorderStyle[]).map((s) => (
            <button
              key={s}
              onClick={() => updateFurniture(furniture.id, { borderStyle: s })}
              className={`flex-1 ${mobile ? 'py-1.5' : 'py-1'} text-[10px] rounded border transition-default ${
                (furniture.borderStyle ?? 'solid') === s
                  ? 'border-accent-primary bg-accent-primary/10 text-accent-secondary font-medium'
                  : 'border-border-primary bg-bg-secondary text-text-tertiary hover:bg-bg-tertiary'
              }`}
            >
              {s === 'solid' ? '실선' : s === 'dashed' ? '점선' : '없음'}
            </button>
          ))}
        </div>
        {(furniture.borderStyle ?? 'solid') !== 'none' && (
          <div className="flex gap-1.5 items-center">
            <label className="flex items-center gap-1.5 flex-1">
              <span className="text-[10px] text-text-tertiary shrink-0">두께</span>
              <input type="range" min={0.5} max={5} step={0.5}
                value={furniture.borderWidth ?? 1}
                onChange={(e) => updateFurniture(furniture.id, { borderWidth: Number(e.target.value) })}
                className="flex-1 h-1 accent-accent-primary cursor-pointer"
              />
              <span className="text-[10px] text-text-tertiary w-6 text-right">{furniture.borderWidth ?? 1}</span>
            </label>
            <input type="color"
              value={furniture.borderColor ?? furniture.color}
              onChange={(e) => updateFurniture(furniture.id, { borderColor: e.target.value })}
              className={`${colorSize} rounded border border-border-primary cursor-pointer p-0`}
              title="외곽선 색상"
            />
          </div>
        )}
      </div>

      {/* Rotation */}
      <label className="block">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-[11px] text-text-tertiary">회전</span>
          <span className="text-[11px] text-text-tertiary">{furniture.rotation}&#176;</span>
        </div>
        <input type="range" min={0} max={360} step={15}
          value={furniture.rotation}
          onChange={(e) => updateFurniture(furniture.id, { rotation: Number(e.target.value) })}
          className={`w-full ${sliderH} accent-accent-primary cursor-pointer`}
        />
      </label>

      {/* Memo */}
      <label className="block">
        <span className="text-[11px] text-text-tertiary mb-0.5 block">메모</span>
        <textarea
          value={furniture.memo}
          onChange={(e) => updateFurniture(furniture.id, { memo: e.target.value })}
          placeholder="가구에 대한 메모..."
          rows={2}
          className={`w-full px-2.5 ${py} text-sm bg-bg-secondary border border-border-primary rounded-md outline-none resize-none placeholder:text-text-tertiary focus:border-accent-primary transition-default`}
        />
      </label>

      {/* Delete */}
      {deleteStep === 'idle' ? (
        <button
          onClick={handleDeleteFurniture}
          className={`w-full ${py} text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-default`}
        >
          가구 삭제
        </button>
      ) : (
        <div className="p-2.5 bg-red-50 border border-red-200 rounded-md">
          <p className="text-[11px] text-red-700 font-medium mb-2">
            삭제하려면 PIN 번호를 입력하세요
            {items.length > 0 && (
              <span className="block text-[10px] text-red-500 font-normal mt-0.5">
                수납된 물품 {items.length}개도 함께 삭제됩니다
              </span>
            )}
          </p>
          <div className="flex gap-1.5">
            <input type="password" inputMode="numeric" maxLength={4}
              value={pinValue}
              onChange={(e) => { setPinValue(e.target.value.replace(/\D/g, '')); setPinError(false); }}
              onKeyDown={(e) => { if (e.key === 'Enter' && pinValue.length === 4) handlePinSubmit(); if (e.key === 'Escape') handlePinCancel(); }}
              placeholder="PIN 4자리"
              autoFocus
              className={`flex-1 px-2 ${py} text-sm text-center tracking-widest bg-white border rounded-md outline-none transition-default ${
                pinError ? 'border-red-400 bg-red-50' : 'border-red-200 focus:border-red-400'
              }`}
            />
            <button onClick={handlePinSubmit} disabled={pinValue.length !== 4}
              className={`px-3 ${py} text-xs font-medium text-white bg-red-500 rounded-md hover:bg-red-600 transition-default disabled:opacity-40 disabled:cursor-not-allowed`}>확인</button>
            <button onClick={handlePinCancel}
              className={`px-2.5 ${py} text-xs text-text-tertiary bg-bg-secondary border border-border-primary rounded-md hover:bg-bg-tertiary transition-default`}>취소</button>
          </div>
          {pinError && <p className="mt-1.5 text-[10px] text-red-500 font-medium">PIN이 올바르지 않습니다</p>}
        </div>
      )}
    </div>
  );
}

/* ─── Compact header (shared) ─── */

function CompactHeader({ furniture, itemCount, editExpanded, onToggleEdit, onDeselect, mobile }: {
  furniture: { name: string; color: string; category: FurnitureCategory };
  itemCount: number;
  editExpanded: boolean;
  onToggleEdit: () => void;
  onDeselect?: () => void;
  mobile?: boolean;
}) {
  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: furniture.color }} />
          <span className={`font-semibold text-text-primary truncate ${mobile ? 'text-base' : 'text-sm'}`}>
            {furniture.name}
          </span>
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0 ${BADGE_CLASS[furniture.category]}`}>
            {CATEGORY_LABELS[furniture.category]}
          </span>
        </div>
        {!mobile && onDeselect && (
          <button onClick={onDeselect} className="text-[10px] text-text-tertiary hover:text-text-primary transition-default shrink-0 ml-2">
            선택 해제
          </button>
        )}
      </div>

      {/* Toggle button */}
      <button
        onClick={onToggleEdit}
        className={`w-full flex items-center justify-center gap-1.5 text-[11px] font-medium rounded-lg border transition-default ${
          editExpanded
            ? 'py-1.5 bg-accent-primary/8 border-accent-primary/20 text-accent-secondary'
            : 'py-1.5 bg-bg-secondary/70 border-border-primary text-text-secondary hover:bg-bg-tertiary'
        }`}
      >
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8.5 1.5l2 2M1 11l.7-2.8L9.2.7l2 2-7.5 7.5L1 11z" />
        </svg>
        {editExpanded ? '상세 접기' : '상세 편집'}
        <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          {editExpanded
            ? <path d="M2.5 6.5L5 4L7.5 6.5" />
            : <path d="M2.5 4L5 6.5L7.5 4" />
          }
        </svg>
        {!editExpanded && itemCount > 0 && (
          <span className="text-[10px] text-text-tertiary ml-1">/ 물품 {itemCount}개</span>
        )}
      </button>
    </>
  );
}

/* ─── Main component ─── */

interface RightSidebarProps {
  mobile?: boolean;
  onOpenGemini?: () => void;
}

export default function RightSidebar({ mobile, onOpenGemini }: RightSidebarProps) {
  const { updateFurniture, deleteFurniture, selectFurniture, addItem, updateItem, deleteItem } = useStore();
  const furniture = useFurniture();
  const items = useItems();

  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState(1);
  const [newItemCat, setNewItemCat] = useState('기타');
  const [newItemMemo, setNewItemMemo] = useState('');
  const [newItemFloor, setNewItemFloor] = useState(1);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editExpanded, setEditExpanded] = useState(false);
  const selectedFurnitureId = useStore((s) => s.selectedFurnitureId);

  // Reset on selection change
  useEffect(() => {
    setEditExpanded(false);
    setEditingItemId(null);
  }, [selectedFurnitureId]);

  const handleAddItem = () => {
    if (!selectedFurnitureId || !newItemName.trim()) return;
    addItem(selectedFurnitureId, newItemName.trim(), newItemQty, newItemCat, newItemMemo.trim(), newItemFloor);
    setNewItemName('');
    setNewItemQty(1);
    setNewItemMemo('');
    setNewItemFloor(1);
  };

  // Mobile: don't render empty state
  if (!furniture) {
    if (mobile) return null;
    return (
      <aside className="w-[320px] shrink-0 border-l border-border-primary bg-bg-primary flex flex-col items-center justify-center h-full">
        <div className="text-center px-8">
          <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-bg-secondary flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#9B9590" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="16" height="13" rx="2" />
              <path d="M6 4V2.5A1.5 1.5 0 0 1 7.5 1h5A1.5 1.5 0 0 1 14 2.5V4" />
              <path d="M2 10h16" />
            </svg>
          </div>
          <p className="text-sm text-text-secondary font-medium mb-1">가구를 선택하세요</p>
          <p className="text-xs text-text-tertiary">좌측 목록이나 캔버스에서 가구를 클릭하면<br />상세 정보를 확인할 수 있습니다.</p>
        </div>
      </aside>
    );
  }

  /* ─── Shared item rendering ─── */

  const itemPy = mobile ? 'py-2' : 'py-1';
  const actionBtnSize = mobile ? 'w-8 h-8' : 'w-6 h-6';

  const renderItemList = () => (
    <>
      {items.length === 0 ? (
        <div className={`text-center text-xs text-text-tertiary ${mobile ? 'py-4' : 'py-6'}`}>
          수납된 물품이 없습니다.
        </div>
      ) : (
        <div className="flex flex-col gap-1.5 pb-2">
          {items.map((item) => (
            <div key={item.id} className="p-2.5 bg-bg-secondary rounded-lg border border-border-primary">
              {editingItemId === item.id ? (
                <div className="flex flex-col gap-1.5">
                  <input type="text" value={item.name}
                    onChange={(e) => updateItem(item.id, { name: e.target.value })}
                    className={`px-2 ${itemPy} text-sm bg-bg-primary border border-border-primary rounded outline-none focus:border-accent-primary`}
                  />
                  <div className="flex gap-1.5">
                    <input type="number" min={1} value={item.quantity}
                      onChange={(e) => updateItem(item.id, { quantity: Number(e.target.value) })}
                      className={`w-16 px-2 ${itemPy} text-sm bg-bg-primary border border-border-primary rounded outline-none focus:border-accent-primary`}
                    />
                    <select value={item.category}
                      onChange={(e) => updateItem(item.id, { category: e.target.value })}
                      className={`flex-1 px-2 ${itemPy} text-sm bg-bg-primary border border-border-primary rounded outline-none focus:border-accent-primary`}
                    >
                      {ITEM_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-1.5 items-center">
                    <span className="text-[10px] text-text-tertiary shrink-0">층</span>
                    <select value={item.floor ?? 1}
                      onChange={(e) => updateItem(item.id, { floor: Number(e.target.value) })}
                      className={`w-16 px-2 ${itemPy} text-sm bg-bg-primary border border-border-primary rounded outline-none focus:border-accent-primary`}
                    >
                      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}층</option>)}
                    </select>
                    <textarea value={item.memo}
                      onChange={(e) => updateItem(item.id, { memo: e.target.value })}
                      placeholder="메모" rows={1}
                      className={`flex-1 px-2 ${itemPy} text-sm bg-bg-primary border border-border-primary rounded outline-none resize-none focus:border-accent-primary`}
                    />
                  </div>
                  <button onClick={() => setEditingItemId(null)}
                    className="text-xs text-accent-primary font-medium self-end py-1">완료</button>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-text-primary truncate">{item.name}</div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-[10px] text-text-tertiary bg-bg-tertiary px-1.5 py-px rounded">{item.category}</span>
                        <span className="text-[10px] text-text-tertiary">x{item.quantity}</span>
                        <span className="text-[10px] text-accent-primary/70 bg-accent-primary/8 px-1.5 py-px rounded">{item.floor ?? 1}층</span>
                      </div>
                    </div>
                    <div className={`flex ${mobile ? 'gap-1' : 'gap-0.5'} shrink-0`}>
                      <button onClick={() => setEditingItemId(item.id)}
                        className={`${actionBtnSize} flex items-center justify-center rounded text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary transition-default`}
                        title="수정">
                        <svg width={mobile ? 12 : 11} height={mobile ? 12 : 11} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M8.5 1.5l2 2M1 11l.7-2.8L9.2.7l2 2-7.5 7.5L1 11z" />
                        </svg>
                      </button>
                      <button onClick={() => deleteItem(item.id)}
                        className={`${actionBtnSize} flex items-center justify-center rounded text-text-tertiary hover:text-red-500 hover:bg-red-50 transition-default`}
                        title="삭제">
                        <svg width={mobile ? 12 : 11} height={mobile ? 12 : 11} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
                          <path d="M1.5 3h9M4.5 3V1.5h3V3M3 3l.5 7.5h5L9 3" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  {item.memo && <p className="mt-1 text-[11px] text-text-tertiary leading-relaxed">{item.memo}</p>}
                  <div className="mt-1 text-[9px] text-text-tertiary/60">{formatDate(item.updatedAt)}</div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );

  const addItemPy = mobile ? 'py-2' : 'py-1.5';

  const renderAddItemForm = () => (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-1.5">
        <input type="text" placeholder="물품 이름" value={newItemName}
          onChange={(e) => setNewItemName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAddItem(); }}
          className={`flex-1 px-2.5 ${addItemPy} text-sm bg-bg-secondary border border-border-primary rounded-md outline-none placeholder:text-text-tertiary focus:border-accent-primary transition-default`}
        />
        <input type="number" min={1} value={newItemQty}
          onChange={(e) => setNewItemQty(Math.max(1, Number(e.target.value)))}
          className={`w-14 px-2 ${addItemPy} text-sm bg-bg-secondary border border-border-primary rounded-md outline-none focus:border-accent-primary transition-default text-center`}
        />
      </div>
      <div className="flex gap-1.5">
        <select value={newItemCat}
          onChange={(e) => setNewItemCat(e.target.value)}
          className={`flex-1 px-2 ${addItemPy} text-sm bg-bg-secondary border border-border-primary rounded-md outline-none focus:border-accent-primary transition-default`}
        >
          {ITEM_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={newItemFloor}
          onChange={(e) => setNewItemFloor(Number(e.target.value))}
          className={`w-16 px-1 ${addItemPy} text-sm bg-bg-secondary border border-border-primary rounded-md outline-none focus:border-accent-primary transition-default`}
        >
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}층</option>)}
        </select>
        <button onClick={handleAddItem} disabled={!newItemName.trim()}
          className={`px-4 ${addItemPy} text-xs font-medium bg-accent-primary text-white rounded-md hover:bg-accent-secondary transition-default disabled:opacity-40 disabled:cursor-not-allowed`}>추가</button>
      </div>
      <input type="text" placeholder="메모 (선택)" value={newItemMemo}
        onChange={(e) => setNewItemMemo(e.target.value)}
        className={`px-2.5 ${addItemPy} text-sm bg-bg-secondary border border-border-primary rounded-md outline-none placeholder:text-text-tertiary focus:border-accent-primary transition-default`}
      />
    </div>
  );

  /* ─── Mobile layout ─── */

  if (mobile) {
    return (
      <div className="flex flex-col">
        {/* Compact header + collapsible edit */}
        <div className="px-4 pt-2 pb-3 border-b border-border-primary">
          <CompactHeader
            furniture={furniture}
            itemCount={items.length}
            editExpanded={editExpanded}
            onToggleEdit={() => setEditExpanded(!editExpanded)}
            mobile
          />
          {editExpanded && (
            <div className="mt-3 pt-3 border-t border-border-primary">
              <FurnitureEditFields
                furniture={furniture}
                items={items}
                mobile
                updateFurniture={updateFurniture}
                deleteFurniture={deleteFurniture}
              />
            </div>
          )}
        </div>

        {/* Items */}
        <div className="px-4 pt-3 pb-2">
          <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">
            수납 물품
            <span className="ml-1.5 text-text-tertiary/60">{items.length}</span>
          </h3>
        </div>
        <div className="px-4">
          {renderItemList()}
        </div>

        {/* Add item */}
        <div className="p-4 border-t border-border-primary bg-bg-primary">
          <h4 className="text-[11px] font-semibold text-text-tertiary mb-2">물품 추가</h4>
          {renderAddItemForm()}

          {/* Photo add shortcut — mobile only */}
          {onOpenGemini && (
            <>
              <div className="flex items-center gap-2 mt-3 mb-1.5">
                <div className="flex-1 h-px bg-border-primary" />
                <span className="text-[10px] text-text-tertiary">또는</span>
                <div className="flex-1 h-px bg-border-primary" />
              </div>
              <button
                onClick={onOpenGemini}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-medium rounded-lg bg-accent-primary/10 text-accent-secondary border border-accent-primary/20 hover:bg-accent-primary/15 transition-default active:scale-[0.98]"
              >
                <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="5" width="16" height="12" rx="2" />
                  <circle cx="10" cy="11" r="3" />
                  <path d="M7.5 5L8.5 3h3l1 2" />
                </svg>
                사진으로 물품 추가
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  /* ─── Desktop layout ─── */

  return (
    <aside className="w-[320px] shrink-0 border-l border-border-primary bg-bg-primary flex flex-col h-full">
      {/* Compact header + collapsible edit fields */}
      <div className="p-4 border-b border-border-primary">
        <CompactHeader
          furniture={furniture}
          itemCount={items.length}
          editExpanded={editExpanded}
          onToggleEdit={() => setEditExpanded(!editExpanded)}
          onDeselect={() => selectFurniture(null)}
        />
        {editExpanded && (
          <div className="mt-3 pt-3 border-t border-border-primary">
            <FurnitureEditFields
              furniture={furniture}
              items={items}
              updateFurniture={updateFurniture}
              deleteFurniture={deleteFurniture}
            />
          </div>
        )}
      </div>

      {/* Items section — always visible */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-4 pt-3 pb-2">
          <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">
            수납 물품
            <span className="ml-1.5 text-text-tertiary/60">{items.length}</span>
          </h3>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-4">
          {renderItemList()}
        </div>

        <div className="p-3 border-t border-border-primary bg-bg-primary">
          <h4 className="text-[11px] font-semibold text-text-tertiary mb-2">물품 추가</h4>
          {renderAddItemForm()}
        </div>
      </div>
    </aside>
  );
}
