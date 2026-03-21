import { useMemo } from 'react';
import { ATTENTION_ITEM_STATUSES, ITEM_STATUS_META, ITEM_STATUS_OPTIONS } from '../../constants/items';
import Modal from '../common/Modal';
import { useRoom } from '../../store/useStore';
import type { FurnitureCategory } from '../../types';

const CATEGORY_LABELS: Record<FurnitureCategory, string> = {
  storage: '수납장', bed: '침대', table: '테이블',
  seating: '의자', appliance: '가전', other: '기타',
};

const ITEM_CATEGORY_COLORS: Record<string, string> = {
  '의류': '#D47F5A', '책': '#6B8EC4', '전자기기': '#8B7EC4',
  '식품': '#7BC46B', '생활용품': '#C4956B', '문구': '#5BAAB5',
  '주방용품': '#C46B8E', '기타': '#B0A090',
};

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function StatsModal({ isOpen, onClose }: StatsModalProps) {
  const room = useRoom();

  const stats = useMemo(() => {
    const totalFurniture = room.furniture.length;
    const totalItems = room.items.length;
    const totalQuantity = room.items.reduce((sum, i) => sum + i.quantity, 0);
    const furnitureNameMap = new Map(room.furniture.map((f) => [f.id, f.name]));

    // Item category distribution
    const itemCategoryMap = new Map<string, { count: number; quantity: number }>();
    for (const item of room.items) {
      const prev = itemCategoryMap.get(item.category) ?? { count: 0, quantity: 0 };
      itemCategoryMap.set(item.category, {
        count: prev.count + 1,
        quantity: prev.quantity + item.quantity,
      });
    }
    const itemCategories = [...itemCategoryMap.entries()]
      .sort((a, b) => b[1].quantity - a[1].quantity)
      .map(([name, data]) => ({ name, ...data }));

    const statusMap = new Map<string, { count: number; quantity: number }>();
    for (const item of room.items) {
      const prev = statusMap.get(item.status) ?? { count: 0, quantity: 0 };
      statusMap.set(item.status, {
        count: prev.count + 1,
        quantity: prev.quantity + item.quantity,
      });
    }
    const statusStats = ITEM_STATUS_OPTIONS.map((option) => ({
      status: option.value,
      label: option.label,
      count: statusMap.get(option.value)?.count ?? 0,
      quantity: statusMap.get(option.value)?.quantity ?? 0,
    }));

    const attentionItems = room.items
      .filter((item) => ATTENTION_ITEM_STATUSES.includes(item.status))
      .sort((a, b) => {
        const weight = (status: string) => status === 'to-buy' ? 0 : status === 'low-stock' ? 1 : 2;
        return weight(a.status) - weight(b.status) || Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
      })
      .map((item) => ({
        ...item,
        furnitureName: furnitureNameMap.get(item.furnitureId) ?? '알 수 없는 가구',
      }));

    // Furniture storage breakdown
    const furnitureStats = room.furniture.map((f) => {
      const fItems = room.items.filter((i) => i.furnitureId === f.id);
      return {
        id: f.id,
        name: f.name,
        category: f.category,
        color: f.color,
        itemCount: fItems.length,
        totalQuantity: fItems.reduce((sum, i) => sum + i.quantity, 0),
        categories: [...new Set(fItems.map((i) => i.category))],
        attentionCount: fItems.filter((i) => ATTENTION_ITEM_STATUSES.includes(i.status)).length,
      };
    }).sort((a, b) => b.totalQuantity - a.totalQuantity);

    const maxFurnitureQty = Math.max(1, ...furnitureStats.map((f) => f.totalQuantity));
    const maxCategoryQty = Math.max(1, ...itemCategories.map((c) => c.quantity));
    const maxStatusQty = Math.max(1, ...statusStats.map((s) => s.quantity));
    const attentionItemCount = attentionItems.length;

    return {
      totalFurniture,
      totalItems,
      totalQuantity,
      attentionItemCount,
      itemCategories,
      statusStats,
      attentionItems,
      furnitureStats,
      maxFurnitureQty,
      maxCategoryQty,
      maxStatusQty,
    };
  }, [room]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="물품 통계" width="max-w-2xl">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <SummaryCard label="가구 수" value={stats.totalFurniture} unit="개" color="#C4956A" />
        <SummaryCard label="물품 종류" value={stats.totalItems} unit="종" color="#6B8EC4" />
        <SummaryCard label="총 수량" value={stats.totalQuantity} unit="개" color="#7BC46B" />
        <SummaryCard label="주의 물품" value={stats.attentionItemCount} unit="종" color="#B64545" />
      </div>

      {/* Category Distribution */}
      <section className="mb-5">
        <h4 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-3">
          카테고리별 분포
        </h4>
        {stats.itemCategories.length === 0 ? (
          <p className="text-xs text-text-tertiary text-center py-4">등록된 물품이 없습니다.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {stats.itemCategories.map((cat) => (
              <div key={cat.name} className="flex items-center gap-2.5">
                <span className="text-xs text-text-secondary w-16 text-right shrink-0">{cat.name}</span>
                <div className="flex-1 h-5 bg-bg-tertiary rounded-md overflow-hidden">
                  <div
                    className="h-full rounded-md transition-all duration-300 flex items-center justify-end pr-2"
                    style={{
                      width: `${Math.max(12, (cat.quantity / stats.maxCategoryQty) * 100)}%`,
                      backgroundColor: ITEM_CATEGORY_COLORS[cat.name] ?? '#B0A090',
                    }}
                  >
                    <span className="text-[10px] font-semibold text-white drop-shadow-sm">
                      {cat.quantity}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] text-text-tertiary w-10 shrink-0">{cat.count}종</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Status Distribution */}
      <section className="mb-5">
        <h4 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-3">
          상태별 현황
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {stats.statusStats.map((entry) => {
            const meta = ITEM_STATUS_META[entry.status];
            return (
              <div key={entry.status} className="p-3 bg-bg-secondary rounded-lg border border-border-primary">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span
                    className="text-[10px] font-medium px-2 py-1 rounded-full border"
                    style={{ backgroundColor: meta.bg, color: meta.text, borderColor: meta.border }}
                  >
                    {entry.label}
                  </span>
                  <span className="text-[11px] text-text-secondary">
                    {entry.count}종 / {entry.quantity}개
                  </span>
                </div>
                <div className="h-2.5 bg-bg-tertiary rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.max(entry.quantity > 0 ? 12 : 0, (entry.quantity / stats.maxStatusQty) * 100)}%`,
                      backgroundColor: meta.text,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Attention Items */}
      <section className="mb-5">
        <h4 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-3">
          주의 필요 물품
        </h4>
        {stats.attentionItems.length === 0 ? (
          <p className="text-xs text-text-tertiary text-center py-4">주의가 필요한 물품이 없습니다.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {stats.attentionItems.slice(0, 8).map((item) => {
              const meta = ITEM_STATUS_META[item.status];
              return (
                <div key={item.id} className="p-2.5 bg-bg-secondary rounded-lg border border-border-primary">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-text-primary truncate">{item.name}</div>
                      <div className="mt-0.5 flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] text-text-tertiary bg-bg-tertiary px-1.5 py-px rounded">{item.category}</span>
                        <span className="text-[10px] text-text-tertiary">{item.furnitureName}</span>
                        <span className="text-[10px] text-text-tertiary">x{item.quantity}</span>
                      </div>
                    </div>
                    <span
                      className="text-[10px] font-medium px-2 py-1 rounded-full border shrink-0"
                      style={{ backgroundColor: meta.bg, color: meta.text, borderColor: meta.border }}
                    >
                      {meta.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Furniture Breakdown */}
      <section>
        <h4 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-3">
          가구별 보관 현황
        </h4>
        {stats.furnitureStats.length === 0 ? (
          <p className="text-xs text-text-tertiary text-center py-4">등록된 가구가 없습니다.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {stats.furnitureStats.map((f) => (
              <div key={f.id} className="p-2.5 bg-bg-secondary rounded-lg border border-border-primary">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: f.color }} />
                  <span className="text-sm font-medium text-text-primary flex-1 truncate">{f.name}</span>
                  {f.attentionCount > 0 && (
                    <span className="text-[10px] text-danger-text bg-danger-soft border border-danger-border px-1.5 py-0.5 rounded shrink-0">
                      주의 {f.attentionCount}
                    </span>
                  )}
                  <span className="text-[10px] text-text-tertiary bg-bg-tertiary px-1.5 py-0.5 rounded">
                    {CATEGORY_LABELS[f.category]}
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="flex-1 h-3 bg-bg-tertiary rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.max(5, (f.totalQuantity / stats.maxFurnitureQty) * 100)}%`,
                        backgroundColor: f.color,
                        opacity: 0.7,
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] text-text-secondary font-medium">{f.itemCount}종</span>
                    <span className="text-[11px] text-text-primary font-semibold">{f.totalQuantity}개</span>
                  </div>
                </div>
                {f.categories.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {f.categories.map((c) => (
                      <span
                        key={c}
                        className="text-[9px] px-1.5 py-px rounded"
                        style={{
                          backgroundColor: (ITEM_CATEGORY_COLORS[c] ?? '#B0A090') + '20',
                          color: ITEM_CATEGORY_COLORS[c] ?? '#B0A090',
                        }}
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </Modal>
  );
}

function SummaryCard({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  return (
    <div className="p-3 bg-bg-secondary rounded-lg border border-border-primary text-center">
      <div className="text-2xl font-bold" style={{ color }}>{value}</div>
      <div className="text-[10px] text-text-tertiary mt-0.5">
        {label} <span className="text-text-tertiary/60">{unit}</span>
      </div>
    </div>
  );
}
