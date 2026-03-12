import type { GeminiSuggestion } from '../types';

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
