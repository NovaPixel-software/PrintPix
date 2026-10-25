'use client';

import { useMemo, useState } from 'react';
import SheetPreview from '@/components/SheetPreview';
import { Icon, Spinner } from '@/components/ui';
import { ApiError, api } from '@/lib/api';
import { getPaper, getProduct, getShape, getTemplate, PAPERS, PRODUCTS, shapesForProduct, cutText, sizeText, templatesFor, type Template } from '@/lib/catalog';
import { computeLayout } from '@/lib/layout';
import type { PublicEvent } from '@/lib/server/events';

const field =
  'h-11 w-full appearance-none rounded-lg border border-surface-container-high bg-surface-container-low px-4 pr-11 text-body-lg text-navy outline-none transition focus:border-tertiary-container focus:ring-[3px] focus:ring-tertiary-container/20';

function Select({ id, value, onChange, children, icon = 'expand_more' }: { id: string; value: string; onChange: (v: string) => void; children: React.ReactNode; icon?: string }) {
  return (
    <div className="relative">
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={field}>
        {children}
      </select>
      <Icon name={icon} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-secondary" />
    </div>
  );
}

const Label = ({ n, children, htmlFor }: { n: number; children: React.ReactNode; htmlFor: string }) => (
  <label htmlFor={htmlFor} className="mb-1.5 block text-label-lg text-navy">
    {n}. {children} <span className="text-primary-container">*</span>
  </label>
);

// A new event starts on the first product, its first shape (Round) and that shape's first size.
const DEFAULT_PRODUCT = PRODUCTS[0].id;
const DEFAULT_SHAPE = shapesForProduct(DEFAULT_PRODUCT)[0].id;
const DEFAULT_TEMPLATE = templatesFor(DEFAULT_PRODUCT, DEFAULT_SHAPE)[0].id;

export default function SetupForm({ event, onSaved, onCancel }: { event: PublicEvent; onSaved: (e: PublicEvent) => void; onCancel?: () => void }) {
  const first = event.setup;
  const [productId, setProductId] = useState(first?.productId ?? DEFAULT_PRODUCT);
  const [shapeId, setShapeId] = useState(first?.shapeId ?? DEFAULT_SHAPE);
  const [templateId, setTemplateId] = useState(first?.templateId ?? DEFAULT_TEMPLATE);
  const [paperId, setPaperId] = useState(first?.paperId ?? 'a4');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const shapes = useMemo(() => shapesForProduct(productId), [productId]);
  const templates = useMemo(() => templatesFor(productId, shapeId), [productId, shapeId]);
  const paper = getPaper(paperId)!;
  const template = getTemplate(templateId)!;
  const shape = getShape(shapeId)!;

  const layout = useMemo(() => computeLayout(paper, 'portrait', template), [paper, template]);
  const yieldFor = (t: Template) => computeLayout(paper, 'portrait', t).count;
  const fits = layout.count > 0;

  const pickProduct = (id: string) => {
    const s = shapesForProduct(id)[0];
    setProductId(id);
    setShapeId(s.id);
    setTemplateId(templatesFor(id, s.id)[0].id);
  };
  const pickShape = (id: string) => {
    setShapeId(id);
    setTemplateId(templatesFor(productId, id)[0].id);
  };

  const save = async () => {
    if (!fits || busy) return;
    setBusy(true);
    setError('');
    try {
      const { event: updated } = await api.setupEvent(event.id, { productId, shapeId, templateId, paperId });
      onSaved(updated);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not reach the server.');
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-space-lg lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <section className="rounded-2xl border border-surface-container-high bg-surface-container-lowest p-5 shadow-sm sm:p-6">
        <h2 className="text-headline-md text-navy">Event setup</h2>
        <p className="mt-1 text-body-lg text-secondary">Choose what you are printing. Then you can add photos.</p>

        <div className="mt-space-lg space-y-space-md">
          <div className="grid gap-space-md sm:grid-cols-2">
            <div>
              <Label n={1} htmlFor="product">Product Type</Label>
              <Select id="product" value={productId} onChange={pickProduct}>
                {PRODUCTS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label n={2} htmlFor="shape">Photo Shape</Label>
              <Select id="shape" value={shapeId} onChange={pickShape} icon={shape.icon}>
                {shapes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div>
            <Label n={3} htmlFor="template">Template / Overlay Size</Label>
            <Select id="template" value={templateId} onChange={setTemplateId}>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label} · {yieldFor(t)} per sheet
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label n={4} htmlFor="paper">Paper Size</Label>
            <Select id="paper" value={paperId} onChange={setPaperId}>
              {PAPERS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label} · {Math.round((p.wmm * 300) / 25.4)} × {Math.round((p.hmm * 300) / 25.4)} px
                </option>
              ))}
            </Select>
          </div>

          <div className={`flex items-center gap-3 rounded-xl p-space-md ${fits ? 'bg-surface-container-low' : 'border border-error-container bg-error-container/40'}`}>
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${fits ? 'bg-primary-fixed text-primary' : 'bg-error-container text-error'}`}>
              <Icon name={fits ? 'grid_view' : 'warning'} />
            </span>
            <div>
              <p className="text-label-lg text-navy">
                {fits ? `${layout.count} ${layout.count === 1 ? 'photo fits' : 'photos fit'} on ${paper.label.split(' ')[0]}` : 'This size does not fit on the chosen paper'}
              </p>
              <p className="text-body-md text-secondary">{fits
                  ? template.cutW
                    ? `Photo ${template.wmm === template.hmm ? `${template.wmm} mm` : `${template.wmm}×${template.hmm} mm`} inside a ${cutText(template)} cut outline · ${template.gapXmm} mm across, ${template.gapYmm} mm down between pieces`
                    : '10 mm printer-safe margin · 4 mm die-cut gap'
                  : 'Choose a larger paper or a smaller template.'}</p>
            </div>
          </div>
        </div>

        {error && (
          <p role="alert" className="mt-space-md rounded-lg bg-error-container/50 px-3 py-2 text-body-md text-on-error-container">
            {error}
          </p>
        )}

        <div className="mt-space-lg flex flex-wrap items-center justify-end gap-3">
          {onCancel && (
            <button type="button" onClick={onCancel} className="h-11 rounded-lg px-5 text-label-lg text-secondary hover:bg-surface-container">
              Cancel
            </button>
          )}
          <button
            onClick={save}
            disabled={busy || !fits}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary-container px-6 text-label-lg text-white shadow-lg shadow-primary-container/30 transition hover:bg-[#e65100] active:bg-[#cc4800] disabled:opacity-50"
          >
            {busy && <Spinner className="h-4 w-4" />} {first ? 'Save setup' : 'Save & continue to photos'} {!busy && <Icon name="arrow_forward" />}
          </button>
        </div>
      </section>

      <aside className="rounded-2xl border border-surface-container-high bg-surface-container-lowest p-5 shadow-sm">
        <div className="mb-space-md flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-headline-md text-navy">
            <Icon name="layers" className="text-primary-container" /> Live Sheet Preview
          </h2>
          <span className="rounded-full bg-surface-container px-3 py-1 text-label-md text-on-secondary-container">{paper.label.split(' ')[0]} · 300 DPI</span>
        </div>
        <div className="rounded-xl bg-surface-container-low p-4">
          <div className="mx-auto" style={{ maxWidth: 330 }}>
            <SheetPreview layout={layout} clip={shape.clip} />
          </div>
          <p className="mt-3 text-center text-label-sm uppercase tracking-wider text-secondary">
            {layout.pageW} × {layout.pageH} mm · {layout.pxW} × {layout.pxH} px
          </p>
        </div>
        <p className="mt-space-md text-body-md text-secondary">
          {getProduct(productId)?.label} · {shape.label.replace(/ \(.*\)/, '')} · {sizeText(template)}
        </p>
      </aside>
    </div>
  );
}
