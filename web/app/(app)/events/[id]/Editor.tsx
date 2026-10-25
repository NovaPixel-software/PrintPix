'use client';

import { createPortal } from 'react-dom';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icon, Spinner } from '@/components/ui';
import { getProduct, sizeText } from '@/lib/catalog';
import { resolveSetup, type ConfiguredEvent } from '@/lib/event';
import { ApiError, api } from '@/lib/api';
import { DEFAULT_LABEL, ensureLabelFonts } from '@/lib/labels';
import { clampPan, drawSheet, exportPng, hitSlot, importPhoto } from '@/lib/render';
import type { PublicEvent } from '@/lib/server/events';
import type { NameLabel, Photo, SlotData } from '@/lib/types';
import LabelPanel from './LabelPanel';

const CANVAS_PX_PER_MM = 4.5;
const norm = (d: number) => {
  const r = ((((d + 180) % 360) + 360) % 360) - 180;
  return r === -180 ? 180 : r;
};

interface Drag {
  slot: number;
  x: number;
  y: number;
  ox: number;
  oy: number;
  moved: boolean;
}

export default function Editor({ event, onEvent }: { event: ConfiguredEvent; onEvent: (e: PublicEvent) => void }) {
  const { layout, shape, template } = useMemo(() => resolveSetup(event.setup), [event.setup]);

  // Photos live in memory only. They are never saved or uploaded, and a refresh clears them.
  const [photos, setPhotos] = useState<(Photo | null)[]>(() => Array(layout.count).fill(null));
  const [selected, setSelected] = useState(0);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pickTarget = useRef<number | null>(null);
  const drag = useRef<Drag | null>(null);

  // Label fonts download on first use, so redraw once they are in, or the first names show in a fallback font.
  const [fontsReady, setFontsReady] = useState(0);
  useEffect(() => {
    let live = true;
    void ensureLabelFonts().then(() => live && setFontsReady((n) => n + 1));
    return () => {
      live = false;
    };
  }, []);

  /* ---- draw ---- */
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    drawSheet(c, layout, shape.clip, photos, CANVAS_PX_PER_MM, { selected });
  }, [photos, selected, layout, shape, fontsReady]);

  /* ---- photos are not saved, so warn before a refresh or close throws them away ---- */
  const hasPhotos = photos.some(Boolean);
  useEffect(() => {
    if (!hasPhotos) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    addEventListener('beforeunload', warn);
    return () => removeEventListener('beforeunload', warn);
  }, [hasPhotos]);

  const patch = useCallback(
    (i: number, change: Partial<SlotData>) => {
      setPhotos((prev) =>
        prev.map((p, idx) => {
          if (idx !== i || !p) return p;
          const next = { ...p, ...change };
          const s = layout.slots[i];
          return { ...next, ...clampPan(next, s.w, s.h) };
        }),
      );
    },
    [layout],
  );

  /* ---- adding photos ---- */
  const addFiles = async (files: FileList | null, first: number | null) => {
    if (!files || files.length === 0) return;
    const empties = photos.map((p, i) => (p ? -1 : i)).filter((i) => i >= 0 && i !== first);
    const targets = first != null ? [first, ...empties] : empties;
    if (targets.length === 0) {
      setBanner('All slots are full. Remove a photo or use Replace.');
      return;
    }
    setBusy(true);
    const next = [...photos];
    let failed = 0;
    for (const [n, file] of [...files].slice(0, targets.length).entries()) {
      try {
        const replaced = photos[targets[n]];
        const fresh = await importPhoto(file);
        if (replaced?.label) fresh.label = replaced.label; // replacing a photo keeps the name written on it
        next[targets[n]] = fresh;
      } catch {
        failed++;
      }
    }
    setPhotos(next);
    setSelected(targets[0]);
    setBusy(false);
    setBanner(failed ? `${failed} file${failed > 1 ? 's' : ''} could not be read as images.` : null);
    if (files.length > targets.length) setBanner(`Only ${targets.length} slot${targets.length > 1 ? 's were' : ' was'} free, extra photos were skipped.`);
  };

  const pick = (target: number | null) => {
    pickTarget.current = target;
    if (fileRef.current) {
      fileRef.current.value = '';
      fileRef.current.click();
    }
  };

  /* ---- canvas pointer handling ---- */
  const toMm = (e: React.PointerEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * layout.pageW, y: ((e.clientY - r.top) / r.height) * layout.pageH };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const { x, y } = toMm(e);
    const i = hitSlot(layout, shape.clip, x, y);
    if (i < 0) return;
    setSelected(i);
    const p = photos[i];
    drag.current = { slot: i, x: e.clientX, y: e.clientY, ox: p?.ox ?? 0, oy: p?.oy ?? 0, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = drag.current;
    if (!d || !photos[d.slot]) return;
    const r = canvasRef.current!.getBoundingClientRect();
    const s = layout.slots[d.slot];
    const dx = (((e.clientX - d.x) / r.width) * layout.pageW) / s.w;
    const dy = (((e.clientY - d.y) / r.height) * layout.pageH) / s.h;
    if (Math.abs(dx) + Math.abs(dy) > 0.015) d.moved = true;
    patch(d.slot, { ox: d.ox + dx, oy: d.oy + dy });
  };

  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    if (d && !d.moved && !photos[d.slot]) pick(d.slot);
  };

  /* ---- tools for the selected slot ---- */
  const sel = photos[selected] ?? null;

  const autoRotate = () => {
    setPhotos((prev) =>
      prev.map((p, i) => {
        if (!p) return p;
        const s = layout.slots[i];
        if (Math.abs(s.w - s.h) < 0.5) return { ...p, rot: 0, tilt: 0, ox: 0, oy: 0 };
        const photoLandscape = p.bmp.width >= p.bmp.height;
        return { ...p, rot: photoLandscape === s.w > s.h ? 0 : -90, tilt: 0, ox: 0, oy: 0 };
      }),
    );
  };

  const resetSheet = () => {
    if (hasPhotos && !confirm('Remove all photos from this sheet and start again?')) return;
    photos.forEach((p) => p?.bmp.close());
    setPhotos(Array(layout.count).fill(null));
    setSelected(0);
    setBanner(null);
  };

  /* ---- name labels ---- */
  // Merges into the label as it is right now (not as it was at the last render), so quick clicks on design,
  // colour and font in a row do not undo each other.
  const setLabel = (change: Partial<NameLabel>) => {
    const i = selected;
    setPhotos((prev) => prev.map((p, idx) => (idx === i && p ? { ...p, label: { ...(p.label ?? DEFAULT_LABEL), ...change } } : p)));
  };

  const sameDesignForAll = () => {
    const from = sel?.label ?? DEFAULT_LABEL;
    setPhotos((prev) =>
      prev.map((p) => (p ? { ...p, label: { ...(p.label ?? DEFAULT_LABEL), style: from.style, color: from.color, font: from.font, size: from.size } } : p)),
    );
  };

  const remove = () => {
    setPhotos((prev) => prev.map((p, i) => (i === selected ? null : p)));
  };

  /* ---- output: each download or print adds one to the event's counter on the server ---- */
  const count = async (kind: 'download' | 'print') => {
    try {
      const { event: updated } = await api.countEvent(event.id, kind);
      onEvent(updated);
    } catch (e) {
      setBanner(e instanceof ApiError ? e.message : 'Could not update the count. Check your connection.');
    }
  };

  const download = async () => {
    const blob = await exportPng(layout, shape.clip, photos);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${event.name} - sheet ${event.downloads + 1}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    void count('download');
  };

  /* The sheet image is mounted in #print-root, the only thing visible when printing. */
  const [printUrl, setPrintUrl] = useState<string | null>(null);
  const print = async () => setPrintUrl(URL.createObjectURL(await exportPng(layout, shape.clip, photos)));
  useEffect(() => {
    if (!printUrl) return;
    // The browser fires this when the print dialog closes. It cannot tell Print from Cancel, so a
    // cancelled dialog is counted too. With Chrome in --kiosk-printing mode there is no dialog to cancel.
    const done = () => {
      setPrintUrl(null);
      void count('print');
    };
    addEventListener('afterprint', done, { once: true });
    const t = setTimeout(() => window.print(), 250);
    return () => {
      clearTimeout(t);
      removeEventListener('afterprint', done);
      URL.revokeObjectURL(printUrl);
    };
  }, [printUrl]);

  const placed = photos.filter(Boolean).length;
  const zoomPct = Math.round((sel?.zoom ?? 1) * 100);

  return (
    <div>
      <div className="space-y-space-md">
        {banner && (
          <div className="flex flex-wrap items-center gap-3 rounded-xl bg-gradient-to-r from-primary-container to-[#c24100] px-4 py-3 text-body-md text-white shadow-lg">
            <Icon name="info" fill />
            <span className="min-w-0 flex-1 font-medium">{banner}</span>
            <button onClick={() => setBanner(null)} className="rounded-lg bg-navy/70 px-3 py-1.5 text-label-md hover:bg-navy">Dismiss ×</button>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-navy p-4 text-white shadow-lg">
          <div className="flex min-w-0 items-center gap-4">
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 text-label-lg">
                <span className="truncate">Sheet editor</span>
              </p>
              <p className="truncate text-body-md text-white/70">
                {getProduct(event.setup.productId)?.label} · {sizeText(template)} · {layout.count}-Up Matrix
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-label-md">
              <Icon name="grid_view" className="!text-[16px] text-tertiary-container" /> {placed} / {layout.count} Photos Placed
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-space-md lg:grid lg:grid-cols-[minmax(0,1fr)_380px]">
          {/* stage */}
          <section className="sticky top-[102px] z-20 overflow-hidden rounded-2xl bg-gradient-to-br from-navy via-[#10264a] to-[#2a1a22] p-2 shadow-lg sm:p-5 md:top-[66px] lg:static lg:self-start">
            <div className="mb-3 hidden flex-wrap items-center justify-between gap-2 text-label-md uppercase tracking-wider text-white/80 lg:flex">
              <span className="flex items-center gap-2">
                <Icon name="crop_free" className="!text-[16px]" /> {layout.pageW > layout.pageH ? 'Landscape' : 'Portrait'} grid ({layout.pageW} × {layout.pageH} mm)
              </span>
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-tertiary-container" /> Scale: 1:1 true spec
              </span>
            </div>
            <div className="relative mx-auto" style={{ maxWidth: layout.pageW > layout.pageH ? 760 : 540 }}>
              <canvas
                ref={canvasRef}
                width={Math.round(layout.pageW * CANVAS_PX_PER_MM)}
                height={Math.round(layout.pageH * CANVAS_PX_PER_MM)}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                className="mx-auto block h-auto w-auto max-h-[36vh] max-w-full touch-none rounded bg-white shadow-2xl lg:max-h-none lg:w-full"
                style={{ cursor: sel ? 'grab' : 'pointer' }}
              />
              {busy && (
                <div className="absolute inset-0 flex items-center justify-center rounded bg-navy/50 text-white">
                  <span className="flex items-center gap-2 rounded-full bg-navy px-4 py-2 text-label-lg">
                    <Spinner /> Preparing photos…
                  </span>
                </div>
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-3 lg:mt-4">
              <span className="hidden items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-label-md text-white sm:flex">
                <Icon name="pan_tool" className="!text-[16px]" /> Drag photo in frame to reposition
              </span>
              <button
                disabled={!sel}
                onClick={() => patch(selected, { zoom: 1, rot: 0, tilt: 0, ox: 0, oy: 0 })}
                className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-label-md text-white hover:bg-white/10 disabled:opacity-40 sm:px-4 sm:py-2"
              >
                Reset Fit
              </button>
            </div>
          </section>

          {/* controls */}
          <aside className="space-y-space-md">
            <Panel>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-label-lg text-navy">Target Slot</p>
                <p className="text-label-md uppercase tracking-wider text-primary-container">Active: #{String(selected + 1).padStart(2, '0')}</p>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {photos.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => setSelected(i)}
                    className={`flex h-10 items-center justify-center gap-1 rounded-lg text-label-lg transition ${
                      i === selected
                        ? 'bg-primary-container text-white shadow'
                        : p
                          ? 'bg-surface-container text-on-secondary-container hover:bg-surface-container-high'
                          : 'border border-dashed border-outline-variant bg-surface-container-low text-secondary hover:bg-surface-container'
                    }`}
                  >
                    <Icon name={i === selected ? 'crop_free' : p ? 'check_circle' : 'add'} className="!text-[16px]" />
                    {String(i + 1).padStart(2, '0')}
                  </button>
                ))}
              </div>
            </Panel>

            <Panel>
              <div className="mb-4 flex items-center justify-between">
                <p className="flex items-center gap-2 text-label-lg text-navy">
                  <Icon name="tune" className="text-primary-container" /> Precision Transform
                </p>
                <span className="rounded-md bg-surface-container px-2 py-1 text-label-md">Slot #{String(selected + 1).padStart(2, '0')}</span>
              </div>

              <div className={sel ? '' : 'pointer-events-none opacity-50'}>
                <div className="mb-1 flex items-center justify-between text-label-lg">
                  <span className="flex items-center gap-2 text-navy"><Icon name="zoom_in" className="!text-[18px]" /> Crop Zoom</span>
                  <span className="text-primary-container">{zoomPct}%</span>
                </div>
                <div className="flex items-center gap-3">
                  <StepButton icon="remove" label="Zoom out" onClick={() => patch(selected, { zoom: Math.max(1, (sel?.zoom ?? 1) - 0.1) })} />
                  <input
                    type="range"
                    className="slider flex-1"
                    min={100}
                    max={300}
                    value={zoomPct}
                    onChange={(e) => patch(selected, { zoom: Number(e.target.value) / 100 })}
                    aria-label="Crop zoom"
                  />
                  <StepButton icon="add" label="Zoom in" onClick={() => patch(selected, { zoom: Math.min(3, (sel?.zoom ?? 1) + 0.1) })} />
                </div>

                <p className="mb-2 mt-5 flex items-center gap-2 text-label-lg text-navy"><Icon name="rotate_right" className="!text-[18px]" /> Quick Orientation</p>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => patch(selected, { rot: norm((sel?.rot ?? 0) - 90), ox: 0, oy: 0 })} className="flex h-10 items-center justify-center gap-2 rounded-lg bg-surface-container text-label-lg text-navy hover:bg-surface-container-high">
                    <Icon name="rotate_left" className="!text-[20px]" /> −90°
                  </button>
                  <button onClick={() => patch(selected, { rot: norm((sel?.rot ?? 0) + 90), ox: 0, oy: 0 })} className="flex h-10 items-center justify-center gap-2 rounded-lg bg-surface-container text-label-lg text-navy hover:bg-surface-container-high">
                    <Icon name="rotate_right" className="!text-[20px]" /> +90°
                  </button>
                </div>

                <div className="mb-1 mt-5 flex items-center justify-between text-label-lg">
                  <span className="text-navy">Fine Tilt Alignment</span>
                  <span className="font-mono text-navy">{(sel?.tilt ?? 0).toFixed(1).replace('.0', '')}°</span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    className="slider blue flex-1"
                    min={-45}
                    max={45}
                    step={0.5}
                    value={sel?.tilt ?? 0}
                    onChange={(e) => patch(selected, { tilt: Number(e.target.value) })}
                    aria-label="Fine tilt"
                  />
                  <button onClick={() => patch(selected, { tilt: 0 })} className="rounded-md bg-surface-container px-3 py-1.5 text-label-md text-navy hover:bg-surface-container-high">Zero</button>
                </div>
              </div>
              {!sel && <p className="mt-3 text-body-md text-secondary">Tap an empty slot on the sheet to add a photo, then adjust it here.</p>}
            </Panel>

            <LabelPanel label={sel?.label} hasPhoto={!!sel} slotNo={selected + 1} placedCount={photos.filter(Boolean).length} onChange={setLabel} onApplyToAll={sameDesignForAll} />

            <Panel>
              <p className="mb-3 text-label-md uppercase tracking-wider text-secondary">Automation &amp; Queue</p>
              <div className="space-y-2">
                <button onClick={() => pick(null)} className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary-fixed text-label-lg text-on-primary-fixed-variant hover:bg-primary-fixed-dim/60">
                  <Icon name="add_photo_alternate" /> Add Photos (Fill Empty Slots)
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={autoRotate} disabled={placed === 0} className="flex h-10 items-center justify-center gap-2 rounded-lg bg-surface-container text-label-lg text-navy hover:bg-surface-container-high disabled:opacity-50">
                    <Icon name="auto_fix_high" className="!text-[18px]" /> Auto-Rotate All
                  </button>
                  <button onClick={() => pick(selected)} className="flex h-10 items-center justify-center gap-2 rounded-lg bg-surface-container text-label-lg text-navy hover:bg-surface-container-high">
                    <Icon name="sync" className="!text-[18px]" /> {sel ? 'Replace Photo' : 'Add to Slot'}
                  </button>
                </div>
                <button onClick={remove} disabled={!sel} className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-error-container/50 text-label-lg text-error hover:bg-error-container disabled:opacity-40">
                  <Icon name="delete" className="!text-[18px]" /> Remove Photo from Slot {selected + 1}
                </button>
                <button onClick={resetSheet} disabled={placed === 0} className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-surface-container-high text-label-lg text-navy hover:bg-surface-container-low disabled:opacity-40">
                  <Icon name="restart_alt" className="!text-[18px]" /> Reset Sheet
                </button>
              </div>
            </Panel>

            <Panel>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-label-lg text-navy">Output · {layout.pxW} × {layout.pxH} px</p>
                  <p className="text-body-md text-secondary">{layout.pageW}×{layout.pageH} mm · 300 DPI PNG</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={print} disabled={placed === 0} className="flex h-10 items-center gap-2 rounded-lg bg-surface-container px-4 text-label-lg text-navy hover:bg-surface-container-high disabled:opacity-40">
                    <Icon name="print" className="!text-[18px]" /> Print
                  </button>
                  <button onClick={download} disabled={placed === 0} className="flex h-10 items-center gap-2 rounded-lg bg-navy px-4 text-label-lg text-white hover:bg-[#16305c] disabled:opacity-40">
                    <Icon name="download" className="!text-[18px]" /> PNG
                  </button>
                </div>
              </div>
            </Panel>
          </aside>
        </div>
      </div>

      {printUrl &&
        createPortal(
          // eslint-disable-next-line @next/next/no-img-element
          <img src={printUrl} alt="" />,
          document.getElementById('print-root')!,
        )}

      <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => addFiles(e.target.files, pickTarget.current)} />
    </div>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-surface-container-high bg-surface-container-lowest p-5 shadow-sm">{children}</div>;
}

function StepButton({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} aria-label={label} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-container text-navy hover:bg-surface-container-high">
      <Icon name={icon} className="!text-[20px]" />
    </button>
  );
}

