import type { TextLayer } from '@/types/project';
import type { LayerUpdates } from '@/utils/layers';

const FONT_OPTIONS = [
  { value: "'Impact', 'Arial Black', sans-serif", label: 'Impact' },
  { value: "'Comic Sans MS', cursive", label: 'Comic Sans' },
  { value: "'Arial', sans-serif", label: 'Arial' },
  { value: "'Georgia', serif", label: 'Georgia' },
  { value: "'Courier New', monospace", label: 'Courier' },
  { value: "'Trebuchet MS', sans-serif", label: 'Trebuchet' },
];

const WEIGHT_OPTIONS = [
  { value: 400, label: 'Regular' },
  { value: 600, label: 'Semibold' },
  { value: 700, label: 'Bold' },
  { value: 900, label: 'Black' },
];

const QUICK_COLORS = [
  '#ffffff',
  '#000000',
  '#ff0000',
  '#00ff00',
  '#0000ff',
  '#ffff00',
  '#ff6b00',
  '#ff00ff',
];

interface LayerStylePanelProps {
  /** The selected text layer, if any. Controls disable without one. */
  layer?: TextLayer;
  onUpdate: (updates: LayerUpdates) => void;
}

/** Style controls for the selected text layer: font, color, stroke, position. */
export function LayerStylePanel({ layer, onUpdate }: LayerStylePanelProps) {
  const disabled = !layer || layer.locked;

  const update = (updates: LayerUpdates) => {
    if (layer && !layer.locked) {
      onUpdate(updates);
    }
  };

  return (
    <div className={`space-y-3 ${disabled ? 'opacity-60' : ''}`}>
      <label className="text-xs font-semibold text-text-muted uppercase tracking-wider block">
        Layer Style {layer?.locked ? '(locked)' : ''}
      </label>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <span className="text-[10px] text-text-muted">Font</span>
          <select
            value={layer?.fontFamily ?? FONT_OPTIONS[0].value}
            disabled={disabled}
            onChange={e => update({ fontFamily: e.target.value })}
            aria-label="Font family"
            className="w-full bg-surface-secondary border border-border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary outline-none cursor-pointer disabled:cursor-not-allowed"
          >
            {FONT_OPTIONS.map(f => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <span className="text-[10px] text-text-muted">Weight</span>
          <select
            value={layer?.fontWeight ?? 900}
            disabled={disabled}
            onChange={e => update({ fontWeight: Number(e.target.value) })}
            aria-label="Font weight"
            className="w-full bg-surface-secondary border border-border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary outline-none cursor-pointer disabled:cursor-not-allowed"
          >
            {WEIGHT_OPTIONS.map(w => (
              <option key={w.value} value={w.value}>
                {w.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <span className="text-[10px] text-text-muted">Size: {layer?.fontSize ?? 0}px</span>
          <input
            type="range"
            min="16"
            max="300"
            value={layer?.fontSize ?? 80}
            disabled={disabled}
            onChange={e => update({ fontSize: parseInt(e.target.value) })}
            aria-label="Font size"
            className="w-full"
          />
        </div>
        <div>
          <span className="text-[10px] text-text-muted">Rotation: {layer?.rotation ?? 0}°</span>
          <input
            type="range"
            min="-45"
            max="45"
            value={layer?.rotation ?? 0}
            disabled={disabled}
            onChange={e => update({ rotation: parseInt(e.target.value) })}
            aria-label="Text rotation"
            className="w-full"
          />
        </div>
      </div>

      <div>
        <span className="text-[10px] text-text-muted block mb-1">Text Color</span>
        <div className="flex items-center gap-1.5 flex-wrap">
          {QUICK_COLORS.map(c => (
            <button
              key={c}
              disabled={disabled}
              onClick={() => update({ color: c })}
              className={`w-6 h-6 rounded-full border-2 transition-all cursor-pointer disabled:cursor-not-allowed ${
                layer?.color === c
                  ? 'border-brand-primary scale-110'
                  : 'border-border hover:scale-105'
              }`}
              style={{ backgroundColor: c }}
              aria-label={`Color ${c}`}
            />
          ))}
          <input
            type="color"
            value={layer?.color ?? '#ffffff'}
            disabled={disabled}
            onChange={e => update({ color: e.target.value })}
            className="w-6 h-6 rounded-full cursor-pointer border-0 bg-transparent disabled:cursor-not-allowed"
            aria-label="Custom text color"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <span className="text-[10px] text-text-muted">Stroke Color</span>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={layer?.strokeColor ?? '#000000'}
              disabled={disabled}
              onChange={e => update({ strokeColor: e.target.value })}
              className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent disabled:cursor-not-allowed"
              aria-label="Stroke color"
            />
            <span className="text-xs text-text-muted">{layer?.strokeColor ?? '—'}</span>
          </div>
        </div>
        <div>
          <span className="text-[10px] text-text-muted">Stroke: {layer?.strokeWidth ?? 0}px</span>
          <input
            type="range"
            min="0"
            max="20"
            value={layer?.strokeWidth ?? 0}
            disabled={disabled}
            onChange={e => update({ strokeWidth: parseInt(e.target.value) })}
            aria-label="Stroke width"
            className="w-full mt-2"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <span className="text-[10px] text-text-muted">
            Opacity: {Math.round((layer?.opacity ?? 1) * 100)}%
          </span>
          <input
            type="range"
            min="0.05"
            max="1"
            step="0.05"
            value={layer?.opacity ?? 1}
            disabled={disabled}
            onChange={e => update({ opacity: Number(e.target.value) })}
            aria-label="Text opacity"
            className="w-full"
          />
        </div>
        <div className="flex items-end justify-between pb-1">
          <span className="text-[10px] text-text-muted">Shadow</span>
          <button
            onClick={() => update({ shadowEnabled: !layer?.shadowEnabled })}
            disabled={disabled}
            className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer disabled:cursor-not-allowed ${
              layer?.shadowEnabled ? 'bg-brand-primary' : 'bg-border'
            }`}
            role="switch"
            aria-checked={layer?.shadowEnabled ?? false}
            aria-label="Toggle text shadow"
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
                layer?.shadowEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <span className="text-[10px] text-text-muted">X: {Math.round(layer?.x ?? 50)}%</span>
          <input
            type="range"
            min="0"
            max="100"
            value={layer?.x ?? 50}
            disabled={disabled}
            onChange={e => update({ x: parseInt(e.target.value) })}
            aria-label="Horizontal position"
            className="w-full"
          />
        </div>
        <div>
          <span className="text-[10px] text-text-muted">Y: {Math.round(layer?.y ?? 50)}%</span>
          <input
            type="range"
            min="0"
            max="100"
            value={layer?.y ?? 50}
            disabled={disabled}
            onChange={e => update({ y: parseInt(e.target.value) })}
            aria-label="Vertical position"
            className="w-full"
          />
        </div>
      </div>
      <p className="text-[10px] text-text-muted">
        Tip: drag text directly on the canvas to reposition it.
      </p>
    </div>
  );
}
