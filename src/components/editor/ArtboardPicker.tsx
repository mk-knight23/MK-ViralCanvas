import { Frame } from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';
import {
  ARTBOARD_PRESETS,
  CUSTOM_PRESET_ID,
  MAX_ARTBOARD_SIZE,
  MIN_ARTBOARD_SIZE,
  getArtboardPreset,
} from '@/types/project';

function clampSize(value: number): number {
  if (!Number.isFinite(value)) return MIN_ARTBOARD_SIZE;
  return Math.round(Math.min(MAX_ARTBOARD_SIZE, Math.max(MIN_ARTBOARD_SIZE, value)));
}

export function ArtboardPicker() {
  const artboard = useProjectStore(s => s.project.artboard);
  const setArtboard = useProjectStore(s => s.setArtboard);

  const handlePresetChange = (presetId: string) => {
    if (presetId === CUSTOM_PRESET_ID) {
      setArtboard({ ...artboard, presetId: CUSTOM_PRESET_ID });
      return;
    }
    const preset = getArtboardPreset(presetId);
    if (preset) {
      setArtboard({ presetId: preset.id, width: preset.width, height: preset.height });
    }
  };

  const handleSizeChange = (dimension: 'width' | 'height', raw: string) => {
    const parsed = Number.parseInt(raw, 10);
    if (Number.isNaN(parsed)) return;
    setArtboard({ ...artboard, presetId: CUSTOM_PRESET_ID, [dimension]: clampSize(parsed) });
  };

  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
        <Frame className="w-3.5 h-3.5" /> Artboard
      </label>
      <select
        value={artboard.presetId}
        onChange={e => handlePresetChange(e.target.value)}
        className="w-full bg-surface-secondary border border-border rounded-xl px-3 py-2.5 text-sm outline-none cursor-pointer"
        aria-label="Artboard preset"
      >
        {ARTBOARD_PRESETS.map(preset => (
          <option key={preset.id} value={preset.id}>
            {preset.name}
          </option>
        ))}
        <option value={CUSTOM_PRESET_ID}>Custom size…</option>
      </select>

      {artboard.presetId === CUSTOM_PRESET_ID && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className="text-[10px] text-text-muted">Width (px)</span>
            <input
              type="number"
              min={MIN_ARTBOARD_SIZE}
              max={MAX_ARTBOARD_SIZE}
              value={artboard.width}
              onChange={e => handleSizeChange('width', e.target.value)}
              className="w-full bg-surface-secondary border border-border rounded-xl px-3 py-2 text-sm outline-none"
              aria-label="Custom artboard width"
            />
          </div>
          <div>
            <span className="text-[10px] text-text-muted">Height (px)</span>
            <input
              type="number"
              min={MIN_ARTBOARD_SIZE}
              max={MAX_ARTBOARD_SIZE}
              value={artboard.height}
              onChange={e => handleSizeChange('height', e.target.value)}
              className="w-full bg-surface-secondary border border-border rounded-xl px-3 py-2 text-sm outline-none"
              aria-label="Custom artboard height"
            />
          </div>
        </div>
      )}
      <p className="text-[10px] text-text-muted">
        Exports at {artboard.width}×{artboard.height}px (true size)
      </p>
    </div>
  );
}
