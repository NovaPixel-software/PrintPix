import type { ClipKind } from '@/lib/catalog';
import type { SheetLayout } from '@/lib/layout';

/** Vector preview of an empty sheet: the page, the slot grid in the chosen shape, and slot numbers. */
export default function SheetPreview({ layout, clip, className = '' }: { layout: SheetLayout; clip: ClipKind; className?: string }) {
  const { pageW, pageH, slots, slotW, slotH } = layout;
  const u = Math.min(slotW, slotH);
  return (
    <svg viewBox={`0 0 ${pageW} ${pageH}`} className={`h-auto w-full rounded bg-white shadow-md ${className}`} role="img" aria-label="Sheet preview">
      {slots.map((s, i) => {
        const common = { fill: '#eff4ff', stroke: '#9fb4d6', strokeWidth: 0.35, strokeDasharray: '1.4 1' };
        return (
          <g key={i}>
            {clip === 'ellipse' ? (
              <ellipse cx={s.x + s.w / 2} cy={s.y + s.h / 2} rx={s.w / 2} ry={s.h / 2} {...common} />
            ) : (
              <rect x={s.x} y={s.y} width={s.w} height={s.h} rx={clip === 'rounded' ? u * 0.12 : 0} {...common} />
            )}
            <text x={s.x + s.w / 2} y={s.y + s.h / 2 - u * 0.04} textAnchor="middle" fontSize={u * 0.2} fontWeight={700} fill="#0a1931">
              {String(i + 1).padStart(2, '0')}
            </text>
            <text x={s.x + s.w / 2} y={s.y + s.h / 2 + u * 0.14} textAnchor="middle" fontSize={u * 0.1} fill="#64748b">
              {slotW === slotH ? `${slotW}mm` : `${slotW}×${slotH}mm`}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
