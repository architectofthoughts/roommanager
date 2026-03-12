import type { GeminiSuggestion, FurnitureSuggestion, FurnitureCategory, FurnitureShape } from '../types';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent';

function getApiKey(): string | null {
  return import.meta.env.VITE_GEMINI_API_KEY || null;
}

export function isGeminiAvailable(): boolean {
  return !!getApiKey();
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const PROMPT = `You are analyzing a photo of furniture or a storage space.
Identify all visible items and suggest an inventory list.

For each item, provide:
- itemName: name of the item (in Korean if possible)
- quantity: estimated count
- category: category (의류, 책, 전자기기, 식품, 생활용품, 문구, 주방용품, 기타)
- action: "add" for new items
- confidence: 0.0-1.0 how confident you are

Respond ONLY with a JSON array. No markdown, no explanation. Example:
[{"itemName":"노트북","quantity":1,"category":"전자기기","action":"add","confidence":0.95}]`;

export async function analyzeImageWithGemini(file: File): Promise<GeminiSuggestion[]> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return getDemoSuggestions();
  }

  const base64 = await fileToBase64(file);

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: PROMPT },
          { inlineData: { mimeType: file.type, data: base64 } },
        ],
      }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';

  // Extract JSON from response (handle markdown code blocks)
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  return JSON.parse(jsonMatch[0]) as GeminiSuggestion[];
}

function getDemoSuggestions(): GeminiSuggestion[] {
  return [
    { itemName: '노트북', quantity: 1, category: '전자기기', action: 'add', confidence: 0.95 },
    { itemName: '충전기', quantity: 2, category: '전자기기', action: 'add', confidence: 0.85 },
    { itemName: '책', quantity: 5, category: '책', action: 'add', confidence: 0.80 },
    { itemName: '텀블러', quantity: 1, category: '생활용품', action: 'add', confidence: 0.90 },
    { itemName: '필기구 세트', quantity: 1, category: '문구', action: 'add', confidence: 0.75 },
  ];
}

// --- Room Photo Analysis ---

const ROOM_ANALYSIS_PROMPT = `You are analyzing a photo of a room to identify furniture and their approximate positions.

The room is represented as a grid of {W} columns × {H} rows.
- Top-left is (0, 0), bottom-right is ({W}, {H}).
- Furniture along walls should be placed at the edges (x=0 for left wall, x near {W} for right wall, y=0 for top/back wall, y near {H} for front/bottom).

For each piece of furniture visible in the photo, provide:
- name: furniture name in Korean (e.g. "침대", "책상", "옷장", "소파", "TV 선반", "서랍장")
- category: one of "storage", "seating", "table", "bed", "appliance", "other"
- shape: "rect" or "circle"
- x: estimated grid column position (integer, 0 to {W})
- y: estimated grid row position (integer, 0 to {H})
- width: estimated width in grid units (integer, minimum 2)
- height: estimated height in grid units (integer, minimum 2)
- confidence: 0.0-1.0 how confident you are about this furniture

Rules:
- Furniture must not overlap each other
- Furniture must fit within the grid ({W}×{H})
- Be realistic about furniture sizes relative to room size
- Include ALL visible furniture, even partially visible ones

Respond ONLY with a JSON array. No markdown, no explanation. Example:
[{"name":"침대","category":"bed","shape":"rect","x":1,"y":1,"width":6,"height":8,"confidence":0.9}]`;

const VALID_CATEGORIES: FurnitureCategory[] = ['storage', 'seating', 'table', 'bed', 'appliance', 'other'];
const VALID_SHAPES: FurnitureShape[] = ['rect', 'circle'];

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(v)));
}

function sanitizeFurnitureSuggestions(raw: unknown[], gridW: number, gridH: number): FurnitureSuggestion[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Record<string, unknown> => item !== null && typeof item === 'object')
    .map((item) => {
      const w = clamp(Number(item.width) || 3, 2, gridW - 1);
      const h = clamp(Number(item.height) || 3, 2, gridH - 1);
      return {
        name: String(item.name || '가구'),
        category: VALID_CATEGORIES.includes(item.category as FurnitureCategory) ? (item.category as FurnitureCategory) : 'other',
        shape: VALID_SHAPES.includes(item.shape as FurnitureShape) ? (item.shape as FurnitureShape) : 'rect',
        x: clamp(Number(item.x) || 0, 0, gridW - w),
        y: clamp(Number(item.y) || 0, 0, gridH - h),
        width: w,
        height: h,
        confidence: Math.max(0, Math.min(1, Number(item.confidence) || 0.5)),
      };
    });
}

export async function analyzeRoomPhoto(file: File, gridWidth: number, gridHeight: number): Promise<FurnitureSuggestion[]> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return getDemoRoomSuggestions(gridWidth, gridHeight);
  }

  const base64 = await fileToBase64(file);
  const prompt = ROOM_ANALYSIS_PROMPT
    .replace(/\{W\}/g, String(gridWidth))
    .replace(/\{H\}/g, String(gridHeight));

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: prompt },
          { inlineData: { mimeType: file.type, data: base64 } },
        ],
      }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  const parsed = JSON.parse(jsonMatch[0]);
  return sanitizeFurnitureSuggestions(parsed, gridWidth, gridHeight);
}

function getDemoRoomSuggestions(gridW: number, gridH: number): FurnitureSuggestion[] {
  return sanitizeFurnitureSuggestions([
    { name: '침대', category: 'bed', shape: 'rect', x: 1, y: 1, width: 6, height: 8, confidence: 0.95 },
    { name: '옷장', category: 'storage', shape: 'rect', x: gridW - 5, y: 1, width: 4, height: 7, confidence: 0.90 },
    { name: '책상', category: 'table', shape: 'rect', x: 8, y: 1, width: 5, height: 3, confidence: 0.85 },
    { name: '의자', category: 'seating', shape: 'circle', x: 9, y: 5, width: 3, height: 3, confidence: 0.80 },
    { name: '서랍장', category: 'storage', shape: 'rect', x: 1, y: 10, width: 4, height: 3, confidence: 0.75 },
    { name: '스탠드 조명', category: 'appliance', shape: 'circle', x: 0, y: 0, width: 2, height: 2, confidence: 0.65 },
  ], gridW, gridH);
}
