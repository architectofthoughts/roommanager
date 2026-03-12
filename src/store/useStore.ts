import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { Furniture, StorageItem, Room, RoomManagerData, FurnitureShape, FurnitureCategory } from '../types';

const STORAGE_KEY = 'roommanager-data';

function createDefaultRoom(name = '내 방'): Room {
  return {
    id: uuidv4(),
    name,
    gridWidth: 20,
    gridHeight: 16,
    cellSize: 40,
    furniture: [],
    items: [],
  };
}

function migrateRoom(room: Room): Room {
  room.furniture = room.furniture.map(f => ({
    ...f,
    borderStyle: f.borderStyle ?? 'solid',
    borderWidth: f.borderWidth ?? 1,
    borderColor: f.borderColor ?? f.color,
    opacity: f.opacity ?? 0.33,
  }));
  room.items = room.items.map(i => ({
    ...i,
    floor: i.floor ?? 1,
  }));
  return room;
}

function loadData(): RoomManagerData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // New multi-room format
      if (parsed.rooms && Array.isArray(parsed.rooms)) {
        const data = parsed as RoomManagerData;
        data.rooms = data.rooms.map(migrateRoom);
        if (!data.rooms.find(r => r.id === data.activeRoomId)) {
          data.activeRoomId = data.rooms[0].id;
        }
        return data;
      }
      // Legacy single-room format — migrate
      const room = migrateRoom(parsed as Room);
      return { rooms: [room], activeRoomId: room.id };
    }
  } catch { /* ignore */ }
  const room = createDefaultRoom();
  return { rooms: [room], activeRoomId: room.id };
}

function saveData(data: RoomManagerData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

interface RoomStore {
  rooms: Room[];
  activeRoomId: string;
  selectedFurnitureId: string | null;
  searchQuery: string;

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

  // Bulk furniture
  bulkAddFurniture: (items: Array<{ name: string; shape: import('../types').FurnitureShape; category: import('../types').FurnitureCategory; x: number; y: number; width: number; height: number }>) => void;

  // Item actions
  addItem: (furnitureId: string, name: string, quantity: number, category: string, memo: string, floor?: number) => void;
  updateItem: (id: string, updates: Partial<StorageItem>) => void;
  deleteItem: (id: string) => void;
  bulkAddItems: (items: Omit<StorageItem, 'id' | 'updatedAt'>[]) => void;

  // Search
  setSearchQuery: (query: string) => void;
  getFilteredItems: () => StorageItem[];

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
      const newRoom: Room = {
        ...JSON.parse(JSON.stringify(source)),
        id: uuidv4(),
        name: `${source.name} (복사)`,
      };
      // Reassign all IDs
      newRoom.furniture = newRoom.furniture.map((f: Furniture) => ({ ...f, id: uuidv4() }));
      const oldToNew: Record<string, string> = {};
      source.furniture.forEach((f, i) => { oldToNew[f.id] = newRoom.furniture[i].id; });
      newRoom.items = newRoom.items.map((item: StorageItem) => ({
        ...item,
        id: uuidv4(),
        furnitureId: oldToNew[item.furnitureId] ?? item.furnitureId,
      }));
      const rooms = [...state.rooms, newRoom];
      const data: RoomManagerData = { rooms, activeRoomId: newRoom.id };
      saveData(data);
      return { rooms, activeRoomId: newRoom.id, selectedFurnitureId: null };
    });
  },

  // Furniture actions
  addFurniture: (shape, category, name) => {
    const defaultColor = category === 'storage' ? '#8B5E3C' :
             category === 'bed' ? '#6B8EC4' :
             category === 'table' ? '#C4956B' :
             category === 'seating' ? '#7BC46B' :
             category === 'appliance' ? '#9B9B9B' : '#B0A090';
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
      opacity: 0.33,
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

  bulkAddFurniture: (items) => {
    const colorMap: Record<string, string> = {
      storage: '#8B5E3C', bed: '#6B8EC4', table: '#C4956B',
      seating: '#7BC46B', appliance: '#9B9B9B', other: '#B0A090',
    };
    const newFurniture: Furniture[] = items.map((item) => {
      const color = colorMap[item.category] ?? '#B0A090';
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
        opacity: 0.33,
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

  addItem: (furnitureId, name, quantity, category, memo, floor = 1) => {
    const item: StorageItem = {
      id: uuidv4(),
      furnitureId,
      name,
      quantity,
      category,
      memo,
      floor,
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
        floor: item.floor ?? 1,
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

  getFilteredItems: () => {
    const state = get();
    const active = getActiveRoom(state.rooms, state.activeRoomId);
    if (!state.searchQuery.trim()) return active.items;
    const q = state.searchQuery.toLowerCase();
    return active.items.filter(item =>
      item.name.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      item.memo.toLowerCase().includes(q)
    );
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
