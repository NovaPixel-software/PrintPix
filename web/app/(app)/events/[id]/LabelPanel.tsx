'use client';

import { Icon } from '@/components/ui';
import { DEFAULT_LABEL, LABEL_COLORS, LABEL_FONTS, LABEL_STYLES, MAX_LABEL_CHARS } from '@/lib/labels';
import type { NameLabel } from '@/lib/types';

const input =
  'h-10 w-full rounded-lg border border-surface-container-high bg-surface-container-low px-3 text-body-lg outline-none focus:border-tertiary-container focus:ring-[3px] focus:ring-tertiary-container/20';

/** Name label for the selected photo: the name, its design, colour, font and size. */
export default function LabelPanel({
  label,
  hasPhoto,
  slotNo,
  placedCount,
  onChange,
  onApplyToAll,
}: {
  label: NameLabel | null | undefined;
  hasPhoto: boolean;
  slotNo: number;
  placedCount: number;
  onChange: (change: Partial<NameLabel>) => void;
  onApplyToAll: () => void;
}) {
  const l = label ?? DEFAULT_LABEL;
  const active = 'bg-primary-container text-white shadow';
  const idle = 'bg-surface-container text-navy hover:bg-surface-container-high';

  return (
    <div className="rounded-2xl border border-surface-container-high bg-surface-container-lowest p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-2 text-label-lg text-navy">
          <Icon name="label" className="text-primary-container" /> Name label
        </p>
        <span className="rounded-md bg-surface-container px-2 py-1 text-label-md">Slot #{String(slotNo).padStart(2, '0')}</span>
      </div>

      {!hasPhoto ? (
        <p className="text-body-md text-secondary">Add a photo to this slot first, then write a name on it.</p>
      ) : (
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1 flex items-center justify-between text-label-lg text-navy">
              Name on this photo <span className="text-body-sm font-normal text-secondary">{l.text.length}/{MAX_LABEL_CHARS}</span>
            </span>
            <input className={input} value={l.text} maxLength={MAX_LABEL_CHARS} onChange={(e) => onChange({ text: e.target.value })} placeholder="e.g. Johnathan" />
          </label>

          <fieldset>
            <legend className="mb-1.5 text-label-lg text-navy">Design</legend>
            <div className="grid grid-cols-4 gap-2">
              {LABEL_STYLES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onChange({ style: s.id })}
                  aria-pressed={l.style === s.id}
                  className={`flex h-14 flex-col items-center justify-center gap-0.5 rounded-lg text-label-md transition ${l.style === s.id ? active : idle}`}
                >
                  <Icon name={s.icon} className="!text-[18px]" /> {s.label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-1.5 text-label-lg text-navy">Colour</legend>
            <div className="flex flex-wrap gap-2">
              {LABEL_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  title={c.name}
                  aria-label={c.name}
                  aria-pressed={l.color === c.value}
                  onClick={() => onChange({ color: c.value })}
                  style={{ backgroundColor: c.value }}
                  className={`h-8 w-8 rounded-full border transition ${c.value === '#ffffff' ? 'border-outline-variant' : 'border-transparent'} ${l.color === c.value ? 'ring-[3px] ring-primary-container ring-offset-2' : 'hover:scale-110'}`}
                />
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-1.5 text-label-lg text-navy">Font</legend>
            <div className="grid grid-cols-3 gap-2">
              {LABEL_FONTS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => onChange({ font: f.id })}
                  aria-pressed={l.font === f.id}
                  style={{ fontFamily: `var(${f.cssVar})`, fontWeight: f.weight }}
                  className={`h-11 rounded-lg text-[17px] transition ${l.font === f.id ? active : idle}`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="block">
            <span className="mb-1 flex items-center justify-between text-label-lg text-navy">
              Size <span className="text-primary-container">{Math.round(l.size * 100)}%</span>
            </span>
            <input type="range" className="slider w-full" min={60} max={160} step={5} value={Math.round(l.size * 100)} onChange={(e) => onChange({ size: Number(e.target.value) / 100 })} aria-label="Label size" />
          </label>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onApplyToAll}
              disabled={placedCount < 2}
              className="flex h-10 items-center justify-center gap-1.5 rounded-lg bg-surface-container text-label-md text-navy hover:bg-surface-container-high disabled:opacity-40"
            >
              <Icon name="content_copy" className="!text-[16px]" /> Same design for all
            </button>
            <button
              type="button"
              onClick={() => onChange({ text: '' })}
              disabled={!l.text}
              className="flex h-10 items-center justify-center gap-1.5 rounded-lg border border-error-container text-label-md text-error hover:bg-error-container/40 disabled:opacity-40"
            >
              <Icon name="delete" className="!text-[16px]" /> Remove name
            </button>
          </div>
          <p className="text-body-sm text-secondary">Each photo has its own name. &ldquo;Same design for all&rdquo; copies the design, colour, font and size, and keeps each photo&rsquo;s own name.</p>
        </div>
      )}
    </div>
  );
}
