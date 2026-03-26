import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { matchesItemSearch } from '../constants/items';
import { runExperimentalLayout, type ExperimentalLayoutStrategy, type ExperimentalLayoutSummary } from '../utils/layoutEngine';
import type {
  Furniture,
  StorageItem,
  Room,
  RoomManagerData,
  FurnitureShape,
  FurnitureCategory,
  ItemStatus,
  ThemeMode,
  RoomManagerBackup,
  BackupImportMode,
  BackupImportSummary,
} from '../types';

const STORAGE_KEY = 'roommanager-data';
const THEME_KEY = 'roommanager-theme';
const DEFAULT_ROOM_CONFIG = {
  gridWidth: 20,
  gridHeight: 16,
  cellSize: 40,
} as const;
const DEFAULT_FURNITURE_OPACITY = 0.33;
const DEFAULT_ITEM_FLOOR = 1;
const DEFAULT_ITEM_STATUS: ItemStatus = 'stored';

function createDefaultRoom(name = '내 방'): Room {
  return {
    id: uuidv4(),
    name,
    ...DEFAULT_ROOM_CONFIG,
    furniture: [],
    items: [],
  };
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

function createBackupSnapshot(data: RoomManagerData, themeMode: ThemeMode): RoomManagerBackup {
  return {
    app: 'roommanager',
    version: 1,
    exportedAt: new Date().toISOString(),
    themeMode,
    data,
  };
}

function parseBackupPayload(input: unknown): { data: RoomManagerData; themeMode?: ThemeMode } | null {
  if (!isRecord(input)) return null;

  if (input.app === 'roommanager' && input.version === 1 && 'data' in input) {
    const data = migrateRoomManagerData(input.data);
    if (!data) return null;
    const themeMode = input.themeMode === 'dark' || input.themeMode === 'light' ? input.themeMode : undefined;
    return { data, themeMode };
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

  // Room management
  addRoom: (name: string) => void;
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

  // Room management
  addRoom: (name) => {
    const newRoom = createDefaultRoom(name);
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
      state.themeMode
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
      saveData(parsed.data);
      saveThemeMode(nextThemeMode);
      return {
        rooms: parsed.data.rooms,
        activeRoomId: parsed.data.activeRoomId,
        selectedFurnitureId: null,
        searchQuery: '',
        themeMode: nextThemeMode,
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
