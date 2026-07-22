import { useEffect, useRef, useState } from 'react';
import { ImageIcon } from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';

const MEME_TEXT_SHADOW = '0 0 8px rgba(0,0,0,0.8), 2px 2px 4px rgba(0,0,0,0.6)';
const SELECTION_OUTLINE = '2px dashed rgba(147, 51, 234, 0.9)';

interface DragState {
  pointerId: number;
  layerId: string;
  startClientX: number;
  startClientY: number;
  originX: number;
  originY: number;
}

interface CanvasStageProps {
  stageRef: React.RefObject<HTMLDivElement | null>;
  /** Hides selection chrome while html2canvas captures the stage. */
  hideChrome: boolean;
}

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value));
}

/**
 * Artboard preview. Renders at a scaled-to-fit size while all text metrics are
 * defined in artboard pixels, so exports at true dimensions stay accurate.
 */
export function CanvasStage({ stageRef, hideChrome }: CanvasStageProps) {
  const project = useProjectStore(s => s.project);
  const selectedLayerId = useProjectStore(s => s.selectedLayerId);
  const selectLayer = useProjectStore(s => s.selectLayer);
  const updateLayer = useProjectStore(s => s.updateLayer);
  const { artboard, template, layers } = project;

  const [stageWidth, setStageWidth] = useState(0);
  const dragRef = useRef<DragState | null>(null);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    setStageWidth(el.clientWidth);
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(entries => {
      const width = entries[0]?.contentRect.width;
      if (typeof width === 'number') setStageWidth(width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [stageRef, artboard.width, artboard.height]);

  const scale = stageWidth > 0 ? stageWidth / artboard.width : 0;

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>, layerId: string) => {
    selectLayer(layerId);
    const layer = layers.find(l => l.id === layerId);
    if (!layer || layer.locked) return;
    event.preventDefault();
    dragRef.current = {
      pointerId: event.pointerId,
      layerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      originX: layer.x,
      originY: layer.y,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const stage = stageRef.current;
    if (!drag || !stage || event.pointerId !== drag.pointerId) return;
    const rect = stage.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const dx = ((event.clientX - drag.startClientX) / rect.width) * 100;
    const dy = ((event.clientY - drag.startClientY) / rect.height) * 100;
    updateLayer(drag.layerId, {
      x: clampPercent(drag.originX + dx),
      y: clampPercent(drag.originY + dy),
    });
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
      dragRef.current = null;
    }
  };

  const ratio = artboard.width / artboard.height;

  return (
    <div
      ref={stageRef}
      className="relative bg-black rounded-2xl overflow-hidden shadow-2xl mx-auto select-none"
      style={{
        aspectRatio: `${artboard.width} / ${artboard.height}`,
        width: '100%',
        maxWidth: `min(100%, calc(68vh * ${ratio}))`,
      }}
      data-testid="canvas-stage"
    >
      {template ? (
        <img
          src={template.url}
          alt="Artboard background"
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
          crossOrigin="anonymous"
          draggable={false}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-text-muted">
          <ImageIcon className="w-10 h-10 opacity-40" />
          <p className="text-sm">Pick a template or upload an image to start</p>
        </div>
      )}

      {scale > 0 &&
        layers.map(layer => {
          if (layer.hidden || layer.text.length === 0) return null;
          const isSelected = layer.id === selectedLayerId && !hideChrome;
          return (
            <div
              key={layer.id}
              role="button"
              tabIndex={0}
              aria-label={`Text layer: ${layer.text}`}
              onPointerDown={e => handlePointerDown(e, layer.id)}
              onPointerMove={handlePointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              className={`absolute font-black text-center uppercase whitespace-pre leading-tight ${
                layer.locked ? 'cursor-not-allowed' : 'cursor-move'
              }`}
              style={{
                left: `${layer.x}%`,
                top: `${layer.y}%`,
                transform: `translate(-50%, -50%) rotate(${layer.rotation}deg)`,
                fontSize: `${layer.fontSize * scale}px`,
                fontFamily: layer.fontFamily,
                fontWeight: layer.fontWeight,
                color: layer.color,
                opacity: layer.opacity,
                WebkitTextStroke:
                  layer.strokeWidth > 0
                    ? `${layer.strokeWidth * scale}px ${layer.strokeColor}`
                    : undefined,
                textShadow: layer.shadowEnabled ? MEME_TEXT_SHADOW : undefined,
                touchAction: 'none',
                outline: isSelected ? SELECTION_OUTLINE : undefined,
                outlineOffset: isSelected ? 4 : undefined,
                zIndex: 10,
              }}
            >
              {layer.text}
            </div>
          );
        })}
    </div>
  );
}
