export type FurnitureShape = 'rect' | 'circle';
export type FurnitureCategory = 'storage' | 'seating' | 'table' | 'bed' | 'appliance' | 'other';
export type BorderStyle = 'solid' | 'dashed' | 'none';

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
}

export interface StorageItem {
  id: string;
  furnitureId: string;
  name: string;
  quantity: number;
  category: string;
  memo: string;
  floor: number;
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
