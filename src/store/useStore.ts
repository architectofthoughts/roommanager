import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { matchesItemSearch } from '../constants/items';
import { runExperimentalLayout, type ExperimentalLayoutStrategy, type ExperimentalLayoutSummary } from '../utils/layoutEngine';
import type {
  Furniture,
  StorageItem,
  Room,
  RoomSite,
  RoomManagerData,
  FurnitureShape,
  FurnitureCategory,
  ItemStatus,
  ThemeMode,
  RoomManagerBackup,
  BackupImportMode,
  BackupImportSummary,
  JudgedItem,
  JudgeDecision,
  JudgeSource,
} from '../types';

const STORAGE_KEY = 'roommanager-data';
const THEME_KEY = 'roommanager-theme';
const JUDGED_KEY = 'roommanager-judged';
const DEFAULT_ROOM_CONFIG = {
  gridWidth: 20,
  gridHeight: 16,
  cellSize: 40,
} as const;
const DEFAULT_FURNITURE_OPACITY = 0.33;
const DEFAULT_ITEM_FLOOR = 1;
const DEFAULT_ITEM_STATUS: ItemStatus = 'stored';

function createDefaultRoom(name = '내 방', site: RoomSite = 'studio'): Room {
  return {
    id: uuidv4(),
    name,
    site,
    ...DEFAULT_ROOM_CONFIG,
    furniture: [],
    items: [],
  };
}

function isRoomSite(value: unknown): value is RoomSite {
  return value === 'studio' || value === 'office' || value === 'family' || value === 'etc';
}

function isJudgeDecision(value: unknown): value is JudgeDecision {
  return value === 'keep' || value === 'discard' || value === 'hold';
}

function getDefaultFurnitureColor(category: FurnitureCategory) {
  return category === 'storage' ? '#8B5E3C' :
    category === 'bed' ? '#6B8EC4' :
    category === 'table' ? '#C4956B' :
    category === 'seating' ? '#7BC46B' :
    category === 'appliance' ? '#9B9B9B' : '#B0A090';
}

function isFurnitureCategory(value: unknown): value is FurnitureCategory {
  return value === 'storage' ||
    value === 'seating' ||
    value === 'table' ||
    value === 'bed' ||
    value === 'appliance' ||
    value === 'other';
}

function isFurnitureShape(value: unknown): value is FurnitureShape {
  return value === 'rect' || value === 'circle';
}

function isItemStatus(value: unknown): value is ItemStatus {
  return value === 'stored' ||
    value === 'low-stock' ||
    value === 'to-buy' ||
    value === 'packed';
}

function normalizePositiveNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback;
}

function normalizeNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalizeText(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function migrateFurniture(furniture: Partial<Furniture>): Furniture {
  const category = isFurnitureCategory(furniture.category) ? furniture.category : 'other';
  const color = normalizeText(furniture.color, getDefaultFurnitureColor(category));

  return {
    id: normalizeText(furniture.id, uuidv4()),
    name: normalizeText(furniture.name, '가구'),
    shape: isFurnitureShape(furniture.shape) ? furniture.shape : 'rect',
    category,
    x: normalizeNumber(furniture.x, 0),
    y: normalizeNumber(furniture.y, 0),
    width: normalizePositiveNumber(furniture.width, 1),
    height: normalizePositiveNumber(furniture.height, 1),
    rotation: normalizeNumber(furniture.rotation, 0),
    color,
    memo: normalizeText(furniture.memo),
    borderStyle: furniture.borderStyle === 'dashed' || furniture.borderStyle === 'none' ? furniture.borderStyle : 'solid',
    borderWidth: normalizePositiveNumber(furniture.borderWidth, 1),
    borderColor: normalizeText(furniture.borderColor, color),
    opacity: Math.min(1, Math.max(0, normalizeNumber(furniture.opacity, DEFAULT_FURNITURE_OPACITY))),
  };
}

function migrateItem(item: Partial<StorageItem>): StorageItem {
  return {
    id: normalizeText(item.id, uuidv4()),
    furnitureId: normalizeText(item.furnitureId),
    name: normalizeText(item.name, '이름 없음'),
    quantity: normalizePositiveNumber(item.quantity, 1),
    category: normalizeText(item.category, '기타'),
    memo: normalizeText(item.memo),
    floor: normalizePositiveNumber(item.floor, DEFAULT_ITEM_FLOOR),
    status: isItemStatus(item.status) ? item.status : DEFAULT_ITEM_STATUS,
    updatedAt: normalizeText(item.updatedAt, new Date(0).toISOString()),
  };
}

function migrateRoom(room: Partial<Room>, index = 0): Room {
  const name = normalizeText(room.name, '').trim() || (index === 0 ? '내 방' : `방 ${index + 1}`);

  return {
    id: normalizeText(room.id, uuidv4()),
    name,
    site: isRoomSite(room.site) ? room.site : 'etc',
    gridWidth: normalizePositiveNumber(room.gridWidth, DEFAULT_ROOM_CONFIG.gridWidth),
    gridHeight: normalizePositiveNumber(room.gridHeight, DEFAULT_ROOM_CONFIG.gridHeight),
    cellSize: normalizePositiveNumber(room.cellSize, DEFAULT_ROOM_CONFIG.cellSize),
    furniture: Array.isArray(room.furniture) ? room.furniture.map(migrateFurniture) : [],
    items: Array.isArray(room.items) ? room.items.map(migrateItem) : [],
  };
}

function cloneRoomWithNewIds(source: Room, name = `${source.name} (복사)`): Room {
  const furnitureIdMap = new Map<string, string>();
  const furniture = source.furniture.map((item) => {
    const nextId = uuidv4();
    furnitureIdMap.set(item.id, nextId);
    return { ...item, id: nextId };
  });

  return {
    ...source,
    id: uuidv4(),
    name,
    furniture,
    items: source.items.map((item) => ({
      ...item,
      id: uuidv4(),
      furnitureId: furnitureIdMap.get(item.furnitureId) ?? item.furnitureId,
    })),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function createFallbackRoomManagerData(): RoomManagerData {
  const room = createDefaultRoom();
  return { rooms: [room], activeRoomId: room.id };
}

function migrateRoomManagerData(input: unknown): RoomManagerData | null {
  if (!isRecord(input)) return null;

  if (Array.isArray(input.rooms)) {
    const rooms = input.rooms.map((room, index) => migrateRoom(isRecord(room) ? room as Partial<Room> : {}, index));
    if (rooms.length === 0) {
      return createFallbackRoomManagerData();
    }

    const activeRoomId = typeof input.activeRoomId === 'string' && rooms.some((room) => room.id === input.activeRoomId)
      ? input.activeRoomId
      : rooms[0].id;

    return { rooms, activeRoomId };
  }

  const looksLikeLegacyRoom = 'name' in input || 'gridWidth' in input || 'gridHeight' in input || 'furniture' in input || 'items' in input;
  if (!looksLikeLegacyRoom) return null;

  const room = migrateRoom(input as Partial<Room>);
  return { rooms: [room], activeRoomId: room.id };
}

function loadData(): RoomManagerData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const data = migrateRoomManagerData(parsed);
      if (data) return data;
    }
  } catch {
    // Ignore malformed persisted data and fall back to a fresh workspace.
  }

  return createFallbackRoomManagerData();
}

function saveData(data: RoomManagerData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore persistence failures so the UI can continue running.
  }
}

function migrateJudgedItem(input: unknown): JudgedItem | null {
  if (!isRecord(input)) return null;
  const name = normalizeText(input.name, '').trim();
  if (!name) return null;
  return {
    id: normalizeText(input.id, uuidv4()),
    name,
    category: normalizeText(input.category, '기타'),
    quantity: normalizePositiveNumber(input.quantity, 1),
    decision: isJudgeDecision(input.decision) ? input.decision : 'hold',
    roomId: normalizeText(input.roomId),
    roomName: normalizeText(input.roomName, '알 수 없는 방'),
    furnitureId: typeof input.furnitureId === 'string' ? input.furnitureId : undefined,
    source: input.source === 'photo' ? 'photo' : 'manual',
    decidedAt: normalizeText(input.decidedAt, new Date(0).toISOString()),
  };
}

function migrateJudgedItems(input: unknown): JudgedItem[] {
  if (!Array.isArray(input)) return [];
  return input.map(migrateJudgedItem).filter((item): item is JudgedItem => item !== null);
}

function loadJudgedItems(): JudgedItem[] {
  try {
    const raw = localStorage.getItem(JUDGED_KEY);
    if (raw) return migrateJudgedItems(JSON.parse(raw));
  } catch {
    // Ignore malformed persisted data.
  }
  return [];
}

function saveJudgedItems(judgedItems: JudgedItem[]) {
  try {
    localStorage.setItem(JUDGED_KEY, JSON.stringify(judgedItems));
  } catch {
    // Ignore persistence failures so the UI can continue running.
  }
}

function loadThemeMode(): ThemeMode {
  try {
    const raw = localStorage.getItem(THEME_KEY);
    return raw === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

function saveThemeMode(themeMode: ThemeMode) {
  try {
    localStorage.setItem(THEME_KEY, themeMode);
  } catch {
    // Ignore persistence failures so the UI can continue running.
  }
}

function createBackupSnapshot(data: RoomManagerData, themeMode: ThemeMode, judgedItems: JudgedItem[]): RoomManagerBackup {
  return {
    app: 'roommanager',
    version: 1,
    exportedAt: new Date().toISOString(),
    themeMode,
    data,
    judgedItems,
  };
}

function parseBackupPayload(input: unknown): { data: RoomManagerData; themeMode?: ThemeMode; judgedItems?: JudgedItem[] } | null {
  if (!isRecord(input)) return null;

  if (input.app === 'roommanager' && input.version === 1 && 'data' in input) {
    const data = migrateRoomManagerData(input.data);
    if (!data) return null;
    const themeMode = input.themeMode === 'dark' || input.themeMode === 'light' ? input.themeMode : undefined;
    const judgedItems = Array.isArray(input.judgedItems) ? migrateJudgedItems(input.judgedItems) : undefined;
    return { data, themeMode, judgedItems };
  }

  const data = migrateRoomManagerData(input);
  if (!data) return null;
  return { data };
}

function summarizeImportedRooms(rooms: Room[], mode: BackupImportMode): BackupImportSummary {
  return {
    mode,
    roomsImported: rooms.length,
    furnitureImported: rooms.reduce((sum, room) => sum + room.furniture.length, 0),
    itemsImported: rooms.reduce((sum, room) => sum + room.items.length, 0),
  };
}

interface RoomStore {
  rooms: Room[];
  activeRoomId: string;
  selectedFurnitureId: string | null;
  searchQuery: string;
  themeMode: ThemeMode;
  judgedItems: JudgedItem[];

  // Room management
  addRoom: (name: string, site?: RoomSite) => void;
  setRoomSite: (roomId: string, site: RoomSite) => void;
  switchRoom: (roomId: string) => void;
  deleteRoom: (roomId: string) => void;
  renameRoom: (roomId: string, name: string) => void;
  duplicateRoom: (roomId: string) => void;

  // Furniture actions
  addFurniture: (shape: FurnitureShape, category: FurnitureCategory, name: string) => void;
  updateFurniture: (id: string, updates: Partial<Furniture>) => void;
  deleteFurniture: (id: string) => void;
  selectFurniture: (id: string | null) => void;
  applyExperimentalLayout: (strategy: ExperimentalLayoutStrategy) => ExperimentalLayoutSummary | null;

  // Bulk furniture
  bulkAddFurniture: (items: Array<{ name: string; shape: import('../types').FurnitureShape; category: import('../types').FurnitureCategory; x: number; y: number; width: number; height: number }>) => void;

  // Item actions
  addItem: (furnitureId: string, name: string, quantity: number, category: string, memo: string, floor?: number, status?: ItemStatus) => void;
  updateItem: (id: string, updates: Partial<StorageItem>) => void;
  deleteItem: (id: string) => void;
  bulkAddItems: (items: Array<Omit<StorageItem, 'id' | 'updatedAt' | 'status'> & { status?: ItemStatus }>) => void;

  // Judge (판정 게이트)
  recordJudgement: (entries: Array<{ name: string; category: string; quantity: number; decision: JudgeDecision; furnitureId?: string; source: JudgeSource }>) => void;
  resolveHeldItem: (id: string, decision: 'keep' | 'discard', furnitureId?: string) => void;

  // Search
  setSearchQuery: (query: string) => void;
  getFilteredItems: () => StorageItem[];
  setThemeMode: (themeMode: ThemeMode) => void;
  exportBackup: () => RoomManagerBackup;
  importBackup: (payload: unknown, mode: BackupImportMode) => BackupImportSummary;

  // Room properties
  updateRoom: (updates: Partial<Room>) => void;
}

function getActiveRoom(rooms: Room[], activeRoomId: string): Room {
  return rooms.find(r => r.id === activeRoomId) ?? rooms[0];
}

function updateActiveRoom(rooms: Room[], activeRoomId: string, updates: Partial<Room>): Room[] {
  return rooms.map(r => r.id === activeRoomId ? { ...r, ...updates } : r);
}

const initialData = loadData();

export const useStore = create<RoomStore>((set, get) => ({
  rooms: initialData.rooms,
  activeRoomId: initialData.activeRoomId,
  selectedFurnitureId: null,
  searchQuery: '',
  themeMode: loadThemeMode(),
  judgedItems: loadJudgedItems(),

  // Room management
  addRoom: (name, site = 'studio') => {
    const newRoom = createDefaultRoom(name, site);
    set(state => {
      const rooms = [...state.rooms, newRoom];
      const data: RoomManagerData = { rooms, activeRoomId: newRoom.id };
      saveData(data);
      return { rooms, activeRoomId: newRoom.id, selectedFurnitureId: null };
    });
  },

  switchRoom: (roomId) => {
    set(state => {
      if (!state.rooms.find(r => r.id === roomId)) return state;
      const data: RoomManagerData = { rooms: state.rooms, activeRoomId: roomId };
      saveData(data);
      return { activeRoomId: roomId, selectedFurnitureId: null };
    });
  },

  deleteRoom: (roomId) => {
    set(state => {
      if (state.rooms.length <= 1) return state; // Can't delete last room
      const rooms = state.rooms.filter(r => r.id !== roomId);
      const activeRoomId = state.activeRoomId === roomId ? rooms[0].id : state.activeRoomId;
      const data: RoomManagerData = { rooms, activeRoomId };
      saveData(data);
      return { rooms, activeRoomId, selectedFurnitureId: null };
    });
  },

  setRoomSite: (roomId, site) => {
    set(state => {
      const rooms = state.rooms.map(r => r.id === roomId ? { ...r, site } : r);
      const data: RoomManagerData = { rooms, activeRoomId: state.activeRoomId };
      saveData(data);
      return { rooms };
    });
  },

  renameRoom: (roomId, name) => {
    set(state => {
      const rooms = state.rooms.map(r => r.id === roomId ? { ...r, name } : r);
      const data: RoomManagerData = { rooms, activeRoomId: state.activeRoomId };
      saveData(data);
      return { rooms };
    });
  },

  duplicateRoom: (roomId) => {
    set(state => {
      const source = state.rooms.find(r => r.id === roomId);
      if (!source) return state;
      const newRoom = cloneRoomWithNewIds(source);
      const rooms = [...state.rooms, newRoom];
      const data: RoomManagerData = { rooms, activeRoomId: newRoom.id };
      saveData(data);
      return { rooms, activeRoomId: newRoom.id, selectedFurnitureId: null };
    });
  },

  // Furniture actions
  addFurniture: (shape, category, name) => {
    const defaultColor = getDefaultFurnitureColor(category);
    const furniture: Furniture = {
      id: uuidv4(),
      name,
      shape,
      category,
      x: 2,
      y: 2,
      width: shape === 'circle' ? 3 : 4,
      height: shape === 'circle' ? 3 : 3,
      rotation: 0,
      color: defaultColor,
      memo: '',
      borderStyle: 'solid',
      borderWidth: 1,
      borderColor: defaultColor,
      opacity: DEFAULT_FURNITURE_OPACITY,
    };
    set(state => {
      const active = getActiveRoom(state.rooms, state.activeRoomId);
      const rooms = updateActiveRoom(state.rooms, state.activeRoomId, {
        furniture: [...active.furniture, furniture],
      });
      saveData({ rooms, activeRoomId: state.activeRoomId });
      return { rooms, selectedFurnitureId: furniture.id };
    });
  },

  updateFurniture: (id, updates) => {
    set(state => {
      const active = getActiveRoom(state.rooms, state.activeRoomId);
      const rooms = updateActiveRoom(state.rooms, state.activeRoomId, {
        furniture: active.furniture.map(f => f.id === id ? { ...f, ...updates } : f),
      });
      saveData({ rooms, activeRoomId: state.activeRoomId });
      return { rooms };
    });
  },

  deleteFurniture: (id) => {
    set(state => {
      const active = getActiveRoom(state.rooms, state.activeRoomId);
      const rooms = updateActiveRoom(state.rooms, state.activeRoomId, {
        furniture: active.furniture.filter(f => f.id !== id),
        items: active.items.filter(i => i.furnitureId !== id),
      });
      saveData({ rooms, activeRoomId: state.activeRoomId });
      return { rooms, selectedFurnitureId: state.selectedFurnitureId === id ? null : state.selectedFurnitureId };
    });
  },

  selectFurniture: (id) => set({ selectedFurnitureId: id }),

  applyExperimentalLayout: (strategy) => {
    const state = get();
    const active = getActiveRoom(state.rooms, state.activeRoomId);
    if (active.furniture.length === 0) return null;

    const result = runExperimentalLayout(active, strategy);
    const rooms = updateActiveRoom(state.rooms, state.activeRoomId, {
      furniture: result.furniture,
    });
    saveData({ rooms, activeRoomId: state.activeRoomId });
    set({ rooms, selectedFurnitureId: state.selectedFurnitureId });

    return result.summary;
  },

  bulkAddFurniture: (items) => {
    const newFurniture: Furniture[] = items.map((item) => {
      const color = getDefaultFurnitureColor(item.category);
      return {
        id: uuidv4(),
        name: item.name,
        shape: item.shape,
        category: item.category,
        x: item.x,
        y: item.y,
        width: item.width,
        height: item.height,
        rotation: 0,
        color,
        memo: 'AI 방 분석으로 추가됨',
        borderStyle: 'solid' as const,
        borderWidth: 1,
        borderColor: color,
        opacity: DEFAULT_FURNITURE_OPACITY,
      };
    });
    set(state => {
      const active = getActiveRoom(state.rooms, state.activeRoomId);
      const rooms = updateActiveRoom(state.rooms, state.activeRoomId, {
        furniture: [...active.furniture, ...newFurniture],
      });
      saveData({ rooms, activeRoomId: state.activeRoomId });
      return { rooms };
    });
  },

  addItem: (furnitureId, name, quantity, category, memo, floor = 1, status = 'stored') => {
    const item: StorageItem = {
      id: uuidv4(),
      furnitureId,
      name,
      quantity,
      category,
      memo,
      floor,
      status,
      updatedAt: new Date().toISOString(),
    };
    set(state => {
      const active = getActiveRoom(state.rooms, state.activeRoomId);
      const rooms = updateActiveRoom(state.rooms, state.activeRoomId, {
        items: [...active.items, item],
      });
      saveData({ rooms, activeRoomId: state.activeRoomId });
      return { rooms };
    });
  },

  updateItem: (id, updates) => {
    set(state => {
      const active = getActiveRoom(state.rooms, state.activeRoomId);
      const rooms = updateActiveRoom(state.rooms, state.activeRoomId, {
        items: active.items.map(i => i.id === id ? { ...i, ...updates, updatedAt: new Date().toISOString() } : i),
      });
      saveData({ rooms, activeRoomId: state.activeRoomId });
      return { rooms };
    });
  },

  deleteItem: (id) => {
    set(state => {
      const active = getActiveRoom(state.rooms, state.activeRoomId);
      const rooms = updateActiveRoom(state.rooms, state.activeRoomId, {
        items: active.items.filter(i => i.id !== id),
      });
      saveData({ rooms, activeRoomId: state.activeRoomId });
      return { rooms };
    });
  },

  bulkAddItems: (newItems) => {
    set(state => {
      const items = newItems.map(item => ({
        ...item,
        id: uuidv4(),
        floor: item.floor ?? DEFAULT_ITEM_FLOOR,
        status: item.status ?? DEFAULT_ITEM_STATUS,
        updatedAt: new Date().toISOString(),
      }));
      const active = getActiveRoom(state.rooms, state.activeRoomId);
      const rooms = updateActiveRoom(state.rooms, state.activeRoomId, {
        items: [...active.items, ...items],
      });
      saveData({ rooms, activeRoomId: state.activeRoomId });
      return { rooms };
    });
  },

  recordJudgement: (entries) => {
    set(state => {
      const active = getActiveRoom(state.rooms, state.activeRoomId);
      const now = new Date().toISOString();
      const recorded: JudgedItem[] = entries.map(entry => ({
        id: uuidv4(),
        name: entry.name,
        category: entry.category,
        quantity: entry.quantity,
        decision: entry.decision,
        roomId: active.id,
        roomName: active.name,
        furnitureId: entry.furnitureId,
        source: entry.source,
        decidedAt: now,
      }));
      const judgedItems = [...state.judgedItems, ...recorded];
      saveJudgedItems(judgedItems);
      return { judgedItems };
    });
  },

  resolveHeldItem: (id, decision, furnitureId) => {
    set(state => {
      const target = state.judgedItems.find(item => item.id === id);
      if (!target || target.decision !== 'hold') return state;

      const judgedItems = state.judgedItems.map(item =>
        item.id === id
          ? { ...item, decision, furnitureId, decidedAt: new Date().toISOString() }
          : item
      );
      saveJudgedItems(judgedItems);

      // '남긴다' 판정이면 해당 방의 가구 인벤토리에 실제 물품으로 등록
      if (decision === 'keep' && furnitureId) {
        const targetRoom = state.rooms.find(room => room.id === target.roomId);
        if (targetRoom && targetRoom.furniture.some(f => f.id === furnitureId)) {
          const item: StorageItem = {
            id: uuidv4(),
            furnitureId,
            name: target.name,
            quantity: target.quantity,
            category: target.category,
            memo: '판정 게이트에서 등록됨 (보류 → 남김)',
            floor: DEFAULT_ITEM_FLOOR,
            status: DEFAULT_ITEM_STATUS,
            updatedAt: new Date().toISOString(),
          };
          const rooms = state.rooms.map(room =>
            room.id === targetRoom.id ? { ...room, items: [...room.items, item] } : room
          );
          saveData({ rooms, activeRoomId: state.activeRoomId });
          return { judgedItems, rooms };
        }
      }

      return { judgedItems };
    });
  },

  setSearchQuery: (query) => set({ searchQuery: query }),

  setThemeMode: (themeMode) => {
    saveThemeMode(themeMode);
    set({ themeMode });
  },

  exportBackup: () => {
    const state = get();
    return createBackupSnapshot(
      {
        rooms: state.rooms,
        activeRoomId: state.activeRoomId,
      },
      state.themeMode,
      state.judgedItems
    );
  },

  importBackup: (payload, mode) => {
    const parsed = parseBackupPayload(payload);
    if (!parsed) {
      throw new Error('지원하지 않는 백업 파일입니다. roommanager JSON 백업 파일인지 확인하세요.');
    }

    const summary = summarizeImportedRooms(parsed.data.rooms, mode);

    set((state) => {
      if (mode === 'merge') {
        const importedRooms = parsed.data.rooms.map((room) => cloneRoomWithNewIds(room, room.name));
        const rooms = [...state.rooms, ...importedRooms];
        saveData({ rooms, activeRoomId: state.activeRoomId });
        return {
          rooms,
          selectedFurnitureId: null,
        };
      }

      const nextThemeMode = parsed.themeMode ?? state.themeMode;
      const nextJudgedItems = parsed.judgedItems ?? state.judgedItems;
      saveData(parsed.data);
      saveThemeMode(nextThemeMode);
      saveJudgedItems(nextJudgedItems);
      return {
        rooms: parsed.data.rooms,
        activeRoomId: parsed.data.activeRoomId,
        selectedFurnitureId: null,
        searchQuery: '',
        themeMode: nextThemeMode,
        judgedItems: nextJudgedItems,
      };
    });

    return summary;
  },

  getFilteredItems: () => {
    const state = get();
    const active = getActiveRoom(state.rooms, state.activeRoomId);
    if (!state.searchQuery.trim()) return active.items;
    return active.items.filter(item => matchesItemSearch(item, state.searchQuery));
  },

  updateRoom: (updates) => {
    set(state => {
      const rooms = updateActiveRoom(state.rooms, state.activeRoomId, updates);
      saveData({ rooms, activeRoomId: state.activeRoomId });
      return { rooms };
    });
  },
}));

/** Derived selector: returns the currently active room */
export function useRoom(): Room {
  return useStore(state => getActiveRoom(state.rooms, state.activeRoomId));
}
