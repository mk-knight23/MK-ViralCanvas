import { Copy, Download } from 'lucide-react';
import type { ExportFormat, ExportOptions } from '@/types/project';

const FORMATS: { value: ExportFormat; label: string }[] = [
  { value: 'png', label: 'PNG' },
  { value: 'jpeg', label: 'JPEG' },
  { value: 'webp', label: 'WebP' },
];

const MULTIPLIERS: (1 | 2)[] = [1, 2];

interface ExportControlsProps {
  options: ExportOptions;
  onOptionsChange: (options: ExportOptions) => void;
  onDownload: () => void;
  onCopy: () => void;
  isExporting: boolean;
}

export function ExportControls({
  options,
  onOptionsChange,
  onDownload,
  onCopy,
  isExporting,
}: ExportControlsProps) {
  const isLossy = options.format !== 'png';

  return (
    <div className="space-y-3">
      <label className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
        <Download className="w-3.5 h-3.5" /> Export
      </label>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex bg-surface-secondary rounded-xl p-1 border border-border">
          {FORMATS.map(format => (
            <button
              key={format.value}
              onClick={() => onOptionsChange({ ...options, format: format.value })}
              className={`flex-1 py-1.5 px-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                options.format === format.value
                  ? 'bg-surface-elevated text-brand-primary shadow-sm'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
              aria-pressed={options.format === format.value}
            >
              {format.label}
            </button>
          ))}
        </div>
        <div className="flex bg-surface-secondary rounded-xl p-1 border border-border">
          {MULTIPLIERS.map(multiplier => (
            <button
              key={multiplier}
              onClick={() => onOptionsChange({ ...options, multiplier })}
              className={`flex-1 py-1.5 px-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                options.multiplier === multiplier
                  ? 'bg-surface-elevated text-brand-primary shadow-sm'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
              aria-pressed={options.multiplier === multiplier}
            >
              {multiplier}x
            </button>
          ))}
        </div>
      </div>

      {isLossy && (
        <div>
          <span className="text-[10px] text-text-muted">
            Quality: {Math.round(options.quality * 100)}%
          </span>
          <input
            type="range"
            min="0.5"
            max="1"
            step="0.01"
            value={options.quality}
            onChange={e => onOptionsChange({ ...options, quality: Number(e.target.value) })}
            className="w-full"
            aria-label="Export quality"
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={onDownload}
          disabled={isExporting}
          className="bg-brand-primary hover:bg-brand-accent text-white font-bold p-3 rounded-xl shadow-lg shadow-brand-primary/20 flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" /> {isExporting ? 'Exporting…' : 'Download'}
        </button>
        <button
          onClick={onCopy}
          disabled={isExporting}
          className="bg-surface-secondary border border-border hover:border-brand-primary/30 text-text-secondary p-3 rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Copy className="w-4 h-4" /> Copy
        </button>
      </div>
    </div>
  );
}
