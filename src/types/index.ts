export type FurnitureShape = 'rect' | 'circle';
export type FurnitureCategory = 'storage' | 'seating' | 'table' | 'bed' | 'appliance' | 'other';
export type BorderStyle = 'solid' | 'dashed' | 'none';
export type ItemStatus = 'stored' | 'low-stock' | 'to-buy' | 'packed';
export type ThemeMode = 'light' | 'dark';
export type BackupImportMode = 'replace' | 'merge';

export interface Furniture {
  id: string;
  name: string;
  shape: FurnitureShape;
  category: FurnitureCategory;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  color: string;
  memo: string;
  borderStyle: BorderStyle;
  borderWidth: number;
  borderColor: string;
  opacity: number;
}

export interface StorageItem {
  id: string;
  furnitureId: string;
  name: string;
  quantity: number;
  category: string;
  memo: string;
  floor: number;
  status: ItemStatus;
  updatedAt: string;
}

export interface GeminiSuggestion {
  itemName: string;
  quantity: number;
  category: string;
  action: 'add' | 'update' | 'remove';
  confidence: number;
}

export interface Room {
  id: string;
  name: string;
  gridWidth: number;
  gridHeight: number;
  cellSize: number;
  furniture: Furniture[];
  items: StorageItem[];
}

export interface FurnitureSuggestion {
  name: string;
  category: FurnitureCategory;
  shape: FurnitureShape;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
}

export interface RoomManagerData {
  rooms: Room[];
  activeRoomId: string;
}

export interface RoomManagerBackup {
  app: 'roommanager';
  version: 1;
  exportedAt: string;
  themeMode: ThemeMode;
  data: RoomManagerData;
}

export interface RemoteBackupSaveResult {
  pin: string;
  savedAt: string;
}

export interface RemoteBackupRecord {
  pin: string;
  savedAt: string;
  backup: RoomManagerBackup;
}

export interface BackupImportSummary {
  mode: BackupImportMode;
  roomsImported: number;
  furnitureImported: number;
  itemsImported: number;
}
