import type { Furniture, FurnitureCategory, Room } from '../types';

export type ExperimentalLayoutStrategy = 'perimeter' | 'zoned';

export interface ExperimentalLayoutSummary {
  strategy: ExperimentalLayoutStrategy;
  placedCount: number;
  totalCount: number;
  changedCount: number;
  unplacedCount: number;
}

interface PlacementRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CandidateZone {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  reverseX?: boolean;
  reverseY?: boolean;
}

interface PlacementCandidate {
  x: number;
  y: number;
}

interface PreparedFurniture {
  original: Furniture;
  width: number;
  height: number;
}

const PERIMETER_PRIORITY: Record<FurnitureCategory, number> = {
  storage: 0,
  appliance: 1,
  bed: 2,
  table: 3,
  seating: 4,
  other: 5,
};

const ZONED_PRIORITY: Record<FurnitureCategory, number> = {
  bed: 0,
  storage: 1,
  appliance: 2,
  table: 3,
  seating: 4,
  other: 5,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function overlaps(a: PlacementRect, b: PlacementRect) {
  return a.x < b.x + b.width
    && a.x + a.width > b.x
    && a.y < b.y + b.height
    && a.y + a.height > b.y;
}

function canPlace(rect: PlacementRect, room: Room, placed: PlacementRect[]) {
  return rect.x >= 0
    && rect.y >= 0
    && rect.x + rect.width <= room.gridWidth
    && rect.y + rect.height <= room.gridHeight
    && placed.every((other) => !overlaps(rect, other));
}

function pushCandidate(list: PlacementCandidate[], seen: Set<string>, x: number, y: number) {
  const key = `${x}:${y}`;
  if (seen.has(key)) return;
  seen.add(key);
  list.push({ x, y });
}

function appendZoneCandidates(
  list: PlacementCandidate[],
  seen: Set<string>,
  room: Room,
  width: number,
  height: number,
  zone: CandidateZone,
) {
  const maxX = room.gridWidth - width;
  const maxY = room.gridHeight - height;
  if (maxX < 0 || maxY < 0) return;

  const startX = clamp(zone.minX, 0, maxX);
  const endX = clamp(zone.maxX, 0, maxX);
  const startY = clamp(zone.minY, 0, maxY);
  const endY = clamp(zone.maxY, 0, maxY);
  if (endX < startX || endY < startY) return;

  const xValues = Array.from({ length: endX - startX + 1 }, (_, index) => startX + index);
  const yValues = Array.from({ length: endY - startY + 1 }, (_, index) => startY + index);

  if (zone.reverseX) xValues.reverse();
  if (zone.reverseY) yValues.reverse();

  for (const y of yValues) {
    for (const x of xValues) {
      pushCandidate(list, seen, x, y);
    }
  }
}

function appendPerimeterCandidates(
  list: PlacementCandidate[],
  seen: Set<string>,
  room: Room,
  width: number,
  height: number,
  inset: number,
) {
  const maxX = room.gridWidth - width - inset;
  const maxY = room.gridHeight - height - inset;
  if (maxX < inset || maxY < inset) return;

  for (let x = inset; x <= maxX; x += 1) {
    pushCandidate(list, seen, x, inset);
  }
  for (let y = inset; y <= maxY; y += 1) {
    pushCandidate(list, seen, maxX, y);
  }
  for (let x = maxX; x >= inset; x -= 1) {
    pushCandidate(list, seen, x, maxY);
  }
  for (let y = maxY; y >= inset; y -= 1) {
    pushCandidate(list, seen, inset, y);
  }
}

function appendFullScanCandidates(
  list: PlacementCandidate[],
  seen: Set<string>,
  room: Room,
  width: number,
  height: number,
) {
  const maxX = room.gridWidth - width;
  const maxY = room.gridHeight - height;
  if (maxX < 0 || maxY < 0) return;

  for (let y = 0; y <= maxY; y += 1) {
    if (y % 2 === 0) {
      for (let x = 0; x <= maxX; x += 1) {
        pushCandidate(list, seen, x, y);
      }
      continue;
    }

    for (let x = maxX; x >= 0; x -= 1) {
      pushCandidate(list, seen, x, y);
    }
  }
}

function getPerimeterCandidates(room: Room, width: number, height: number) {
  const candidates: PlacementCandidate[] = [];
  const seen = new Set<string>();

  appendPerimeterCandidates(candidates, seen, room, width, height, 0);
  appendPerimeterCandidates(candidates, seen, room, width, height, 1);
  appendFullScanCandidates(candidates, seen, room, width, height);

  return candidates;
}

function getZonedCandidates(room: Room, furniture: PreparedFurniture) {
  const { original, width, height } = furniture;
  const candidates: PlacementCandidate[] = [];
  const seen = new Set<string>();
  const sideBandWidth = Math.max(2, Math.floor(room.gridWidth * 0.28));
  const topBandHeight = Math.max(2, Math.floor(room.gridHeight * 0.24));
  const centerWidth = Math.max(width, Math.floor(room.gridWidth * 0.45));
  const centerHeight = Math.max(height, Math.floor(room.gridHeight * 0.4));
  const centerStartX = Math.floor((room.gridWidth - centerWidth) / 2);
  const centerStartY = Math.floor((room.gridHeight - centerHeight) / 2);

  const categoryZones: Record<FurnitureCategory, CandidateZone[]> = {
    bed: [
      { minX: 0, maxX: room.gridWidth - width, minY: 0, maxY: topBandHeight - height },
      { minX: 0, maxX: room.gridWidth - width, minY: room.gridHeight - topBandHeight, maxY: room.gridHeight - height, reverseY: true },
    ],
    storage: [
      { minX: 0, maxX: sideBandWidth - width, minY: 0, maxY: room.gridHeight - height },
      { minX: room.gridWidth - sideBandWidth, maxX: room.gridWidth - width, minY: 0, maxY: room.gridHeight - height, reverseX: true },
    ],
    appliance: [
      { minX: room.gridWidth - sideBandWidth, maxX: room.gridWidth - width, minY: 0, maxY: room.gridHeight - height, reverseX: true },
      { minX: 0, maxX: sideBandWidth - width, minY: 0, maxY: room.gridHeight - height },
    ],
    table: [
      {
        minX: centerStartX,
        maxX: centerStartX + centerWidth - width,
        minY: centerStartY,
        maxY: centerStartY + centerHeight - height,
      },
    ],
    seating: [
      {
        minX: Math.max(0, centerStartX - 2),
        maxX: Math.min(room.gridWidth - width, centerStartX + centerWidth - width + 2),
        minY: Math.max(0, centerStartY - 2),
        maxY: Math.min(room.gridHeight - height, centerStartY + centerHeight - height + 2),
      },
    ],
    other: [
      {
        minX: centerStartX,
        maxX: centerStartX + centerWidth - width,
        minY: 0,
        maxY: room.gridHeight - height,
      },
    ],
  };

  for (const zone of categoryZones[original.category]) {
    appendZoneCandidates(candidates, seen, room, width, height, zone);
  }
  appendFullScanCandidates(candidates, seen, room, width, height);

  return candidates;
}

function prepareFurniture(furniture: Furniture[]) {
  return furniture.map((item) => ({
    original: item,
    width: Math.max(1, Math.round(item.width)),
    height: Math.max(1, Math.round(item.height)),
  }));
}

function sortFurniture(items: PreparedFurniture[], strategy: ExperimentalLayoutStrategy) {
  const priorityTable = strategy === 'perimeter' ? PERIMETER_PRIORITY : ZONED_PRIORITY;

  return [...items].sort((a, b) => {
    const priorityDiff = priorityTable[a.original.category] - priorityTable[b.original.category];
    if (priorityDiff !== 0) return priorityDiff;

    const areaDiff = (b.width * b.height) - (a.width * a.height);
    if (areaDiff !== 0) return areaDiff;

    return a.original.name.localeCompare(b.original.name, 'ko');
  });
}

export function runExperimentalLayout(room: Room, strategy: ExperimentalLayoutStrategy) {
  const prepared = sortFurniture(prepareFurniture(room.furniture), strategy);
  const placements = new Map<string, PlacementRect>();
  const occupied: PlacementRect[] = [];

  for (const furniture of prepared) {
    const candidates = strategy === 'perimeter'
      ? getPerimeterCandidates(room, furniture.width, furniture.height)
      : getZonedCandidates(room, furniture);

    const placement = candidates.find((candidate) => canPlace({
      x: candidate.x,
      y: candidate.y,
      width: furniture.width,
      height: furniture.height,
    }, room, occupied));

    if (!placement) continue;

    const rect = {
      x: placement.x,
      y: placement.y,
      width: furniture.width,
      height: furniture.height,
    };

    placements.set(furniture.original.id, rect);
    occupied.push(rect);
  }

  const furniture = room.furniture.map((item) => {
    const next = placements.get(item.id);
    if (!next) return item;

    return {
      ...item,
      x: next.x,
      y: next.y,
      rotation: 0,
    };
  });

  const placedCount = placements.size;
  const changedCount = furniture.reduce((count, item, index) => {
    const previous = room.furniture[index];
    return previous.x !== item.x || previous.y !== item.y || previous.rotation !== item.rotation
      ? count + 1
      : count;
  }, 0);

  return {
    furniture,
    summary: {
      strategy,
      placedCount,
      totalCount: room.furniture.length,
      changedCount,
      unplacedCount: room.furniture.length - placedCount,
    } satisfies ExperimentalLayoutSummary,
  };
}
