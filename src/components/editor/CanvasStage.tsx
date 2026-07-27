import { useEffect, useRef, useState } from 'react';
import { ImageIcon } from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';
import { buildLayerRenderModel } from '@/renderer/layerRenderModel';
import type { LayerRenderModel } from '@/renderer/types';

const SELECTION_OUTLINE = '2px dashed var(--mk-accent)';

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
  /** Hides selection chrome while the rasterizer captures the stage. */
  hideChrome: boolean;
}

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function layerAriaLabel(model: LayerRenderModel): string {
  if (model.kind === 'text') return `Text layer: ${model.text}`;
  return `${model.kind === 'image' ? 'Image' : 'Shape'} layer`;
}

/**
 * Artboard preview. Renders at a scaled-to-fit size while all metrics are
 * defined in artboard pixels, so exports at true dimensions stay accurate.
 * All visual layer properties come from the shared render model
 * (src/renderer/layerRenderModel.ts) that exports also rasterize.
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
      className="relative bg-black rounded-sm overflow-hidden shadow-2xl mx-auto select-none"
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
          const model = buildLayerRenderModel(layer, scale);
          if (model === null) return null;
          const isSelected = layer.id === selectedLayerId && !hideChrome;
          const sharedStyle: React.CSSProperties = {
            left: `${model.leftPercent}%`,
            top: `${model.topPercent}%`,
            transform: model.transform,
            opacity: model.opacity,
            touchAction: 'none',
            outline: isSelected ? SELECTION_OUTLINE : undefined,
            outlineOffset: isSelected ? 4 : undefined,
            zIndex: 10,
          };
          const interactionProps = {
            role: 'button' as const,
            tabIndex: 0,
            'aria-label': layerAriaLabel(model),
            onPointerDown: (e: React.PointerEvent<HTMLDivElement>) =>
              handlePointerDown(e, layer.id),
            onPointerMove: handlePointerMove,
            onPointerUp: endDrag,
            onPointerCancel: endDrag,
          };
          const cursorClass = model.interactive ? 'cursor-move' : 'cursor-not-allowed';

          if (model.kind === 'text') {
            return (
              <div
                key={layer.id}
                {...interactionProps}
                className={`absolute font-black text-center uppercase whitespace-pre leading-tight ${cursorClass}`}
                style={{
                  ...sharedStyle,
                  fontSize: `${model.fontSizePx}px`,
                  fontFamily: model.fontFamily,
                  fontWeight: model.fontWeight,
                  color: model.color,
                  WebkitTextStroke: model.webkitTextStroke,
                  textShadow: model.textShadow,
                }}
              >
                {model.text}
              </div>
            );
          }

          if (model.kind === 'image') {
            return (
              <div
                key={layer.id}
                {...interactionProps}
                className={`absolute ${cursorClass}`}
                style={{
                  ...sharedStyle,
                  width: `${model.widthPercent}%`,
                  height: `${model.heightPercent}%`,
                }}
              >
                <img
                  src={model.url}
                  alt=""
                  className="w-full h-full object-contain pointer-events-none"
                  crossOrigin="anonymous"
                  draggable={false}
                />
              </div>
            );
          }

          return (
            <div
              key={layer.id}
              {...interactionProps}
              className={`absolute ${cursorClass}`}
              style={{
                ...sharedStyle,
                width: `${model.widthPercent}%`,
                height: `${model.heightPercent}%`,
                backgroundColor: model.fill,
                borderRadius: model.borderRadius,
                border: model.border,
              }}
            />
          );
        })}
    </div>
  );
}
