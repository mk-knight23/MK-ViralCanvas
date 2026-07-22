import {
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  EyeOff,
  Layers,
  Lock,
  LockOpen,
  Plus,
  Trash2,
} from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';
import { MAX_LAYERS } from '@/types/project';

function layerPlaceholder(index: number, total: number): string {
  if (index === 0) return 'Enter top text...';
  if (index === 1 && total >= 2) return 'Enter bottom text...';
  return 'Enter text...';
}

const ICON_BUTTON_CLASS =
  'p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-surface-secondary transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed';

export function LayersPanel() {
  const layers = useProjectStore(s => s.project.layers);
  const selectedLayerId = useProjectStore(s => s.selectedLayerId);
  const selectLayer = useProjectStore(s => s.selectLayer);
  const addLayer = useProjectStore(s => s.addLayer);
  const removeLayer = useProjectStore(s => s.removeLayer);
  const updateLayer = useProjectStore(s => s.updateLayer);
  const moveLayer = useProjectStore(s => s.moveLayer);
  const duplicateLayer = useProjectStore(s => s.duplicateLayer);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5" /> Text Layers ({layers.length})
        </label>
        <button
          onClick={() => addLayer()}
          disabled={layers.length >= MAX_LAYERS}
          className="flex items-center gap-1 text-xs font-semibold text-brand-primary hover:text-brand-accent transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Add text layer"
        >
          <Plus className="w-3.5 h-3.5" /> Add layer
        </button>
      </div>

      <div className="space-y-1.5">
        {layers.map((layer, index) => {
          const isSelected = layer.id === selectedLayerId;
          return (
            <div
              key={layer.id}
              onClick={() => selectLayer(layer.id)}
              className={`rounded-xl border p-2 space-y-1.5 transition-all cursor-pointer ${
                isSelected
                  ? 'border-brand-primary/60 bg-brand-primary/5'
                  : 'border-border bg-surface-secondary hover:border-border-hover'
              }`}
            >
              <input
                type="text"
                value={layer.text}
                disabled={layer.locked}
                placeholder={layerPlaceholder(index, layers.length)}
                onFocus={() => selectLayer(layer.id)}
                onChange={e => updateLayer(layer.id, { text: e.target.value })}
                className="w-full bg-surface-elevated border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary outline-none transition-all disabled:opacity-50"
                aria-label={`Layer ${index + 1} text`}
              />
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => updateLayer(layer.id, { hidden: !layer.hidden })}
                  className={ICON_BUTTON_CLASS}
                  aria-label={layer.hidden ? 'Show layer' : 'Hide layer'}
                >
                  {layer.hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => updateLayer(layer.id, { locked: !layer.locked })}
                  className={ICON_BUTTON_CLASS}
                  aria-label={layer.locked ? 'Unlock layer' : 'Lock layer'}
                >
                  {layer.locked ? (
                    <Lock className="w-3.5 h-3.5" />
                  ) : (
                    <LockOpen className="w-3.5 h-3.5" />
                  )}
                </button>
                <button
                  onClick={() => moveLayer(layer.id, 'up')}
                  disabled={index === 0}
                  className={ICON_BUTTON_CLASS}
                  aria-label="Move layer up"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => moveLayer(layer.id, 'down')}
                  disabled={index === layers.length - 1}
                  className={ICON_BUTTON_CLASS}
                  aria-label="Move layer down"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => duplicateLayer(layer.id)}
                  disabled={layers.length >= MAX_LAYERS}
                  className={ICON_BUTTON_CLASS}
                  aria-label="Duplicate layer"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => removeLayer(layer.id)}
                  disabled={layers.length <= 1}
                  className={`${ICON_BUTTON_CLASS} hover:text-red-500 ml-auto`}
                  aria-label="Delete layer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
