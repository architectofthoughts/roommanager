import { useState, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import type { FurnitureCategory } from '../../types';

const CATEGORIES: { value: FurnitureCategory; label: string }[] = [
  { value: 'storage', label: '수납장' },
  { value: 'bed', label: '침대' },
  { value: 'table', label: '테이블' },
  { value: 'seating', label: '의자' },
  { value: 'appliance', label: '가전' },
  { value: 'other', label: '기타' },
];

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

export default function RightSidebar() {
  const {
    room, selectedFurnitureId,
    updateFurniture, deleteFurniture, selectFurniture,
    addItem, updateItem, deleteItem,
  } = useStore();

  const furniture = useMemo(
    () => room.furniture.find((f) => f.id === selectedFurnitureId) ?? null,
    [room.furniture, selectedFurnitureId]
  );

  const items = useMemo(
    () => selectedFurnitureId ? room.items.filter((i) => i.furnitureId === selectedFurnitureId) : [],
    [room.items, selectedFurnitureId]
  );

  // Item form state
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState(1);
  const [newItemCat, setNewItemCat] = useState('기타');
  const [newItemMemo, setNewItemMemo] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const handleAddItem = () => {
    if (!selectedFurnitureId || !newItemName.trim()) return;
    addItem(selectedFurnitureId, newItemName.trim(), newItemQty, newItemCat, newItemMemo.trim());
    setNewItemName('');
    setNewItemQty(1);
    setNewItemMemo('');
  };

  const handleDeleteFurniture = () => {
    if (!furniture) return;
    if (items.length > 0) {
      const ok = window.confirm(`"${furniture.name}"에 수납된 ${items.length}개 물품도 함께 삭제됩니다. 계속하시겠습니까?`);
      if (!ok) return;
    }
    deleteFurniture(furniture.id);
  };

  if (!furniture) {
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

  return (
    <aside className="w-[320px] shrink-0 border-l border-border-primary bg-bg-primary flex flex-col h-full">
      {/* Furniture Details */}
      <div className="p-4 border-b border-border-primary">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">
            가구 정보
          </h3>
          <button
            onClick={() => selectFurniture(null)}
            className="text-[10px] text-text-tertiary hover:text-text-primary transition-default"
          >
            선택 해제
          </button>
        </div>

        {/* Name */}
        <label className="block mb-2">
          <span className="text-[11px] text-text-tertiary mb-0.5 block">이름</span>
          <input
            type="text"
            value={furniture.name}
            onChange={(e) => updateFurniture(furniture.id, { name: e.target.value })}
            className="w-full px-2.5 py-1.5 text-sm bg-bg-secondary border border-border-primary rounded-md outline-none focus:border-accent-primary transition-default"
          />
        </label>

        {/* Category */}
        <label className="block mb-2">
          <span className="text-[11px] text-text-tertiary mb-0.5 block">카테고리</span>
          <select
            value={furniture.category}
            onChange={(e) => updateFurniture(furniture.id, { category: e.target.value as FurnitureCategory })}
            className="w-full px-2.5 py-1.5 text-sm bg-bg-secondary border border-border-primary rounded-md outline-none focus:border-accent-primary transition-default"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </label>

        {/* Color */}
        <div className="mb-2">
          <span className="text-[11px] text-text-tertiary mb-1 block">색상</span>
          <div className="flex gap-1.5 flex-wrap">
            {FURNITURE_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => updateFurniture(furniture.id, { color: c })}
                className={`w-6 h-6 rounded-full border-2 transition-default ${
                  furniture.color === c ? 'border-text-primary scale-110' : 'border-transparent hover:scale-110'
                }`}
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
          </div>
        </div>

        {/* Rotation */}
        <label className="block mb-2">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[11px] text-text-tertiary">회전</span>
            <span className="text-[11px] text-text-tertiary">{furniture.rotation}&#176;</span>
          </div>
          <input
            type="range"
            min={0}
            max={360}
            step={15}
            value={furniture.rotation}
            onChange={(e) => updateFurniture(furniture.id, { rotation: Number(e.target.value) })}
            className="w-full h-1.5 accent-accent-primary cursor-pointer"
          />
        </label>

        {/* Memo */}
        <label className="block mb-3">
          <span className="text-[11px] text-text-tertiary mb-0.5 block">메모</span>
          <textarea
            value={furniture.memo}
            onChange={(e) => updateFurniture(furniture.id, { memo: e.target.value })}
            placeholder="가구에 대한 메모..."
            rows={2}
            className="w-full px-2.5 py-1.5 text-sm bg-bg-secondary border border-border-primary rounded-md outline-none resize-none placeholder:text-text-tertiary focus:border-accent-primary transition-default"
          />
        </label>

        {/* Delete */}
        <button
          onClick={handleDeleteFurniture}
          className="w-full py-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-default"
        >
          가구 삭제
        </button>
      </div>

      {/* Items Section */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-4 pt-3 pb-2">
          <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">
            수납 물품
            <span className="ml-1.5 text-text-tertiary/60">{items.length}</span>
          </h3>
        </div>

        {/* Item List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-4">
          {items.length === 0 ? (
            <div className="py-6 text-center text-xs text-text-tertiary">
              수납된 물품이 없습니다.
            </div>
          ) : (
            <div className="flex flex-col gap-1.5 pb-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="p-2.5 bg-bg-secondary rounded-lg border border-border-primary"
                >
                  {editingItemId === item.id ? (
                    /* Edit mode */
                    <div className="flex flex-col gap-1.5">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => updateItem(item.id, { name: e.target.value })}
                        className="px-2 py-1 text-sm bg-bg-primary border border-border-primary rounded outline-none focus:border-accent-primary"
                      />
                      <div className="flex gap-1.5">
                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, { quantity: Number(e.target.value) })}
                          className="w-16 px-2 py-1 text-sm bg-bg-primary border border-border-primary rounded outline-none focus:border-accent-primary"
                        />
                        <select
                          value={item.category}
                          onChange={(e) => updateItem(item.id, { category: e.target.value })}
                          className="flex-1 px-2 py-1 text-sm bg-bg-primary border border-border-primary rounded outline-none focus:border-accent-primary"
                        >
                          {ITEM_CATEGORIES.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                      <textarea
                        value={item.memo}
                        onChange={(e) => updateItem(item.id, { memo: e.target.value })}
                        placeholder="메모"
                        rows={1}
                        className="px-2 py-1 text-sm bg-bg-primary border border-border-primary rounded outline-none resize-none focus:border-accent-primary"
                      />
                      <button
                        onClick={() => setEditingItemId(null)}
                        className="text-xs text-accent-primary font-medium self-end"
                      >
                        완료
                      </button>
                    </div>
                  ) : (
                    /* View mode */
                    <>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-text-primary truncate">{item.name}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-text-tertiary bg-bg-tertiary px-1.5 py-px rounded">
                              {item.category}
                            </span>
                            <span className="text-[10px] text-text-tertiary">
                              x{item.quantity}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-0.5 shrink-0">
                          <button
                            onClick={() => setEditingItemId(item.id)}
                            className="w-6 h-6 flex items-center justify-center rounded text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary transition-default"
                            title="수정"
                          >
                            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M8.5 1.5l2 2M1 11l.7-2.8L9.2.7l2 2-7.5 7.5L1 11z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => deleteItem(item.id)}
                            className="w-6 h-6 flex items-center justify-center rounded text-text-tertiary hover:text-red-500 hover:bg-red-50 transition-default"
                            title="삭제"
                          >
                            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
                              <path d="M1.5 3h9M4.5 3V1.5h3V3M3 3l.5 7.5h5L9 3" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      {item.memo && (
                        <p className="mt-1 text-[11px] text-text-tertiary leading-relaxed">{item.memo}</p>
                      )}
                      <div className="mt-1 text-[9px] text-text-tertiary/60">{formatDate(item.updatedAt)}</div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Item Form */}
        <div className="p-3 border-t border-border-primary bg-bg-primary">
          <h4 className="text-[11px] font-semibold text-text-tertiary mb-2">물품 추가</h4>
          <div className="flex flex-col gap-1.5">
            <div className="flex gap-1.5">
              <input
                type="text"
                placeholder="물품 이름"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddItem(); }}
                className="flex-1 px-2 py-1.5 text-sm bg-bg-secondary border border-border-primary rounded-md outline-none placeholder:text-text-tertiary focus:border-accent-primary transition-default"
              />
              <input
                type="number"
                min={1}
                value={newItemQty}
                onChange={(e) => setNewItemQty(Math.max(1, Number(e.target.value)))}
                className="w-14 px-2 py-1.5 text-sm bg-bg-secondary border border-border-primary rounded-md outline-none focus:border-accent-primary transition-default text-center"
              />
            </div>
            <div className="flex gap-1.5">
              <select
                value={newItemCat}
                onChange={(e) => setNewItemCat(e.target.value)}
                className="flex-1 px-2 py-1.5 text-sm bg-bg-secondary border border-border-primary rounded-md outline-none focus:border-accent-primary transition-default"
              >
                {ITEM_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <button
                onClick={handleAddItem}
                disabled={!newItemName.trim()}
                className="px-4 py-1.5 text-xs font-medium bg-accent-primary text-white rounded-md hover:bg-accent-secondary transition-default disabled:opacity-40 disabled:cursor-not-allowed"
              >
                추가
              </button>
            </div>
            <input
              type="text"
              placeholder="메모 (선택)"
              value={newItemMemo}
              onChange={(e) => setNewItemMemo(e.target.value)}
              className="px-2 py-1.5 text-sm bg-bg-secondary border border-border-primary rounded-md outline-none placeholder:text-text-tertiary focus:border-accent-primary transition-default"
            />
          </div>
        </div>
      </div>
    </aside>
  );
}
