import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { Furniture, StorageItem, Room, FurnitureShape, FurnitureCategory } from '../types';

const STORAGE_KEY = 'roommanager-data';

function loadRoom(): Room {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Room;
  } catch { /* ignore */ }
  return {
    id: uuidv4(),
    name: '내 방',
    gridWidth: 20,
    gridHeight: 16,
    cellSize: 40,
    furniture: [],
    items: [],
  };
}

function saveRoom(room: Room) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(room));
}

interface RoomStore {
  room: Room;
  selectedFurnitureId: string | null;
  searchQuery: string;

  // Furniture actions
  addFurniture: (shape: FurnitureShape, category: FurnitureCategory, name: string) => void;
  updateFurniture: (id: string, updates: Partial<Furniture>) => void;
  deleteFurniture: (id: string) => void;
  selectFurniture: (id: string | null) => void;

  // Item actions
  addItem: (furnitureId: string, name: string, quantity: number, category: string, memo: string) => void;
  updateItem: (id: string, updates: Partial<StorageItem>) => void;
  deleteItem: (id: string) => void;
  bulkAddItems: (items: Omit<StorageItem, 'id' | 'updatedAt'>[]) => void;

  // Search
  setSearchQuery: (query: string) => void;
  getFilteredItems: () => StorageItem[];

  // Room
  updateRoom: (updates: Partial<Room>) => void;
}

export const useStore = create<RoomStore>((set, get) => ({
  room: loadRoom(),
  selectedFurnitureId: null,
  searchQuery: '',

  addFurniture: (shape, category, name) => {
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
      color: category === 'storage' ? '#8B5E3C' :
             category === 'bed' ? '#6B8EC4' :
             category === 'table' ? '#C4956B' :
             category === 'seating' ? '#7BC46B' :
             category === 'appliance' ? '#9B9B9B' : '#B0A090',
      memo: '',
    };
    set(state => {
      const room = { ...state.room, furniture: [...state.room.furniture, furniture] };
      saveRoom(room);
      return { room, selectedFurnitureId: furniture.id };
    });
  },

  updateFurniture: (id, updates) => {
    set(state => {
      const room = {
        ...state.room,
        furniture: state.room.furniture.map(f => f.id === id ? { ...f, ...updates } : f),
      };
      saveRoom(room);
      return { room };
    });
  },

  deleteFurniture: (id) => {
    set(state => {
      const room = {
        ...state.room,
        furniture: state.room.furniture.filter(f => f.id !== id),
        items: state.room.items.filter(i => i.furnitureId !== id),
      };
      saveRoom(room);
      return { room, selectedFurnitureId: state.selectedFurnitureId === id ? null : state.selectedFurnitureId };
    });
  },

  selectFurniture: (id) => set({ selectedFurnitureId: id }),

  addItem: (furnitureId, name, quantity, category, memo) => {
    const item: StorageItem = {
      id: uuidv4(),
      furnitureId,
      name,
      quantity,
      category,
      memo,
      updatedAt: new Date().toISOString(),
    };
    set(state => {
      const room = { ...state.room, items: [...state.room.items, item] };
      saveRoom(room);
      return { room };
    });
  },

  updateItem: (id, updates) => {
    set(state => {
      const room = {
        ...state.room,
        items: state.room.items.map(i => i.id === id ? { ...i, ...updates, updatedAt: new Date().toISOString() } : i),
      };
      saveRoom(room);
      return { room };
    });
  },

  deleteItem: (id) => {
    set(state => {
      const room = { ...state.room, items: state.room.items.filter(i => i.id !== id) };
      saveRoom(room);
      return { room };
    });
  },

  bulkAddItems: (newItems) => {
    set(state => {
      const items = newItems.map(item => ({
        ...item,
        id: uuidv4(),
        updatedAt: new Date().toISOString(),
      }));
      const room = { ...state.room, items: [...state.room.items, ...items] };
      saveRoom(room);
      return { room };
    });
  },

  setSearchQuery: (query) => set({ searchQuery: query }),

  getFilteredItems: () => {
    const { room, searchQuery } = get();
    if (!searchQuery.trim()) return room.items;
    const q = searchQuery.toLowerCase();
    return room.items.filter(item =>
      item.name.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      item.memo.toLowerCase().includes(q)
    );
  },

  updateRoom: (updates) => {
    set(state => {
      const room = { ...state.room, ...updates };
      saveRoom(room);
      return { room };
    });
  },
}));
