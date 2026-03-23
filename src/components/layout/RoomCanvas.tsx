import { useRef, useEffect, useCallback, useState } from 'react';
import { Stage, Layer, Rect, Circle, Text, Group, Transformer, Line } from 'react-konva';
import type Konva from 'konva';
import { useStore, useRoom } from '../../store/useStore';

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export default function RoomCanvas() {
  const room = useRoom();
  const { selectedFurnitureId, selectFurniture, updateFurniture, themeMode } = useStore();
  const { gridWidth, gridHeight, cellSize } = room;

  const stageWidth = gridWidth * cellSize;
  const stageHeight = gridHeight * cellSize;

  const containerRef = useRef<HTMLDivElement>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const shapeRefs = useRef<Record<string, Konva.Node>>({});
  const [stageScale, setStageScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [containerSize, setContainerSize] = useState({ width: stageWidth, height: stageHeight });

  const themeColors = themeMode === 'dark'
    ? {
        grid: '#57473D',
        gridStrong: '#6B574A',
        surface: '#2A221D',
        border: '#90725B',
        label: '#F6ECDF',
        accent: '#C79A72',
      }
    : {
        grid: '#E0DBD4',
        gridStrong: '#C8C0B6',
        surface: '#FAFAF8',
        border: '#C8C0B6',
        label: '#1A1A1A',
        accent: '#C4956A',
      };

  // Fit stage into container
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const fitStage = () => {
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      setContainerSize({ width: cw, height: ch });
      const scaleX = cw / stageWidth;
      const scaleY = ch / stageHeight;
      const scale = Math.min(scaleX, scaleY, 1) * 0.95;
      setStageScale(scale);
      setStagePos({
        x: (cw - stageWidth * scale) / 2,
        y: (ch - stageHeight * scale) / 2,
      });
    };

    fitStage();
    const observer = new ResizeObserver(fitStage);
    observer.observe(container);
    return () => observer.disconnect();
  }, [stageWidth, stageHeight]);

  // Attach transformer to selected shape
  useEffect(() => {
    const tr = transformerRef.current;
    if (!tr) return;

    if (selectedFurnitureId && shapeRefs.current[selectedFurnitureId]) {
      tr.nodes([shapeRefs.current[selectedFurnitureId]]);
    } else {
      tr.nodes([]);
    }
    tr.getLayer()?.batchDraw();
  }, [selectedFurnitureId, room.furniture]);

  const halfCell = cellSize / 2;
  const snap = useCallback((val: number) => Math.round(val / halfCell) * halfCell, [halfCell]);

  const clampNodeToRoom = useCallback((node: Konva.Node) => {
    const box = node.getClientRect({ skipStroke: true });
    const nextX = node.x()
      + (box.x < 0 ? -box.x : 0)
      - (box.x + box.width > stageWidth ? box.x + box.width - stageWidth : 0);
    const nextY = node.y()
      + (box.y < 0 ? -box.y : 0)
      - (box.y + box.height > stageHeight ? box.y + box.height - stageHeight : 0);

    node.position({ x: nextX, y: nextY });
    return { x: nextX, y: nextY };
  }, [stageWidth, stageHeight]);

  const handleDragEnd = useCallback((id: string, e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    node.position({ x: snap(node.x()), y: snap(node.y()) });
    const clamped = clampNodeToRoom(node);

    updateFurniture(id, { x: clamped.x / cellSize, y: clamped.y / cellSize });
  }, [snap, clampNodeToRoom, cellSize, updateFurniture]);

  const handleTransformEnd = useCallback((id: string, e: Konva.KonvaEventObject<Event>) => {
    const node = e.target;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    const furniture = room.furniture.find(f => f.id === id);
    if (!furniture) return;

    const newWidth = Math.max(1, Math.round((furniture.width * cellSize * scaleX) / cellSize));
    const newHeight = Math.max(1, Math.round((furniture.height * cellSize * scaleY) / cellSize));

    node.scaleX(1);
    node.scaleY(1);

    const maxX = Math.max(0, gridWidth - newWidth);
    const maxY = Math.max(0, gridHeight - newHeight);
    const newX = clamp(Math.round(node.x() / cellSize), 0, maxX);
    const newY = clamp(Math.round(node.y() / cellSize), 0, maxY);
    const nextRotation = Math.round(node.rotation());

    node.rotation(nextRotation);
    node.position({ x: newX * cellSize, y: newY * cellSize });
    const clamped = clampNodeToRoom(node);

    updateFurniture(id, {
      x: clamped.x / cellSize,
      y: clamped.y / cellSize,
      width: newWidth,
      height: newHeight,
      rotation: nextRotation,
    });
  }, [room.furniture, cellSize, clampNodeToRoom, gridWidth, gridHeight, updateFurniture]);

  const handleStageClick = useCallback((e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (e.target === e.target.getStage()) {
      selectFurniture(null);
    }
  }, [selectFurniture]);

  // Grid lines
  const gridLines = [];
  for (let i = 0; i <= gridWidth; i++) {
    gridLines.push(
      <Line
        key={`v-${i}`}
        points={[i * cellSize, 0, i * cellSize, stageHeight]}
        stroke={i % 5 === 0 ? themeColors.gridStrong : themeColors.grid}
        strokeWidth={i % 5 === 0 ? 0.8 : 0.3}
        listening={false}
      />
    );
  }
  for (let j = 0; j <= gridHeight; j++) {
    gridLines.push(
      <Line
        key={`h-${j}`}
        points={[0, j * cellSize, stageWidth, j * cellSize]}
        stroke={j % 5 === 0 ? themeColors.gridStrong : themeColors.grid}
        strokeWidth={j % 5 === 0 ? 0.8 : 0.3}
        listening={false}
      />
    );
  }

  return (
    <div ref={containerRef} className="flex-1 bg-bg-secondary overflow-hidden relative">
      {/* Dimensions label */}
      <div className="absolute top-2 left-3 z-10 text-[10px] text-text-tertiary bg-bg-primary/80 px-2 py-0.5 rounded-md border border-border-primary">
        {gridWidth} x {gridHeight} ({cellSize}px)
      </div>

      <Stage
        width={containerSize.width}
        height={containerSize.height}
        scaleX={stageScale}
        scaleY={stageScale}
        x={stagePos.x}
        y={stagePos.y}
        onClick={handleStageClick}
        onTap={handleStageClick}
      >
        <Layer>
          {/* Background */}
          <Rect
            x={0}
            y={0}
            width={stageWidth}
            height={stageHeight}
            fill={themeColors.surface}
            cornerRadius={4}
            listening={false}
          />

          {/* Grid */}
          {gridLines}

          {/* Room border */}
          <Rect
            x={0}
            y={0}
            width={stageWidth}
            height={stageHeight}
            stroke={themeColors.border}
            strokeWidth={1.5}
            cornerRadius={4}
            listening={false}
          />

          {/* Furniture */}
          {room.furniture.map((f) => {
            const px = f.x * cellSize;
            const py = f.y * cellSize;
            const pw = f.width * cellSize;
            const ph = f.height * cellSize;
            const isSelected = selectedFurnitureId === f.id;

            const bs = f.borderStyle ?? 'solid';
            const bw = f.borderWidth ?? 1;
            const bc = f.borderColor ?? f.color;
            const showBorder = bs !== 'none';
            const strokeColor = isSelected ? themeColors.accent : (showBorder ? bc : undefined);
            const strokeWidth = isSelected ? 2 : (showBorder ? bw : 0);
            const dashArray = bs === 'dashed' && !isSelected ? [6, 4] : undefined;
            const alpha = Math.round((f.opacity ?? 0.33) * 255).toString(16).padStart(2, '0');

            return (
              <Group
                key={f.id}
                ref={(node: Konva.Node | null) => {
                  if (node) shapeRefs.current[f.id] = node;
                  else delete shapeRefs.current[f.id];
                }}
                x={px}
                y={py}
                rotation={f.rotation}
                draggable
                onClick={(e) => { e.cancelBubble = true; selectFurniture(f.id); }}
                onTap={(e) => { e.cancelBubble = true; selectFurniture(f.id); }}
                onDragEnd={(e) => handleDragEnd(f.id, e)}
                onTransformEnd={(e) => handleTransformEnd(f.id, e)}
                onDragMove={(e) => {
                  const node = e.target;
                  node.position({ x: snap(node.x()), y: snap(node.y()) });
                  clampNodeToRoom(node);
                }}
              >
                {f.shape === 'circle' ? (
                  <Circle
                    x={pw / 2}
                    y={ph / 2}
                    radiusX={pw / 2}
                    radiusY={ph / 2}
                    fill={f.color + alpha}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    dash={dashArray}
                  />
                ) : (
                  <Rect
                    width={pw}
                    height={ph}
                    fill={f.color + alpha}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    dash={dashArray}
                    cornerRadius={3}
                  />
                )}

                {/* Label */}
                <Text
                  text={f.name}
                  x={f.shape === 'circle' ? -pw * 0.3 : 0}
                  y={f.shape === 'circle' ? -6 : (ph - 14) / 2}
                  width={f.shape === 'circle' ? pw * 1.6 : pw}
                  align="center"
                  fontSize={11}
                  fontFamily="Pretendard Variable, system-ui, sans-serif"
                  fill={themeColors.label}
                  listening={false}
                />
              </Group>
            );
          })}

          {/* Transformer */}
          <Transformer
            ref={transformerRef}
            rotateEnabled={true}
            flipEnabled={false}
            rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
            boundBoxFunc={(oldBox, newBox) => {
              if (Math.abs(newBox.width) < cellSize || Math.abs(newBox.height) < cellSize) {
                return oldBox;
              }
              if (
                newBox.x < 0 ||
                newBox.y < 0 ||
                newBox.x + newBox.width > stageWidth ||
                newBox.y + newBox.height > stageHeight
              ) {
                return oldBox;
              }
              return newBox;
            }}
            anchorFill={themeColors.surface}
            anchorStroke={themeColors.accent}
            anchorSize={8}
            anchorCornerRadius={2}
            borderStroke={themeColors.accent}
            borderDash={[4, 3]}
          />
        </Layer>
      </Stage>
    </div>
  );
}
