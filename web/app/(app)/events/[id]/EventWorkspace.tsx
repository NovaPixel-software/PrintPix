'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Icon } from '@/components/ui';
import { getProduct, sizeText } from '@/lib/catalog';
import { isConfigured, resolveSetup } from '@/lib/event';
import type { PublicEvent } from '@/lib/server/events';
import Editor from './Editor';
import SetupForm from './SetupForm';

type Tab = 'photos' | 'setup';

/** Everything for one event lives here: its counts, its setup, and the photo editor. */
export default function EventWorkspace({ initial }: { initial: PublicEvent }) {
  const [event, setEvent] = useState(initial);
  const [tab, setTab] = useState<Tab>(isConfigured(initial) ? 'photos' : 'setup');
  // Changing the setup changes the sheet, so the editor starts again with an empty sheet.
  const [sheetKey, setSheetKey] = useState(0);

  const summary = isConfigured(event)
    ? (() => {
        const { template, layout } = resolveSetup(event.setup);
        const size = sizeText(template);
        return `${getProduct(event.setup.productId)?.label} · ${size} · ${layout.count} per sheet`;
      })()
    : 'Setup not finished';

  return (
    <div className="space-y-space-md">
      <Link href="/events" className="inline-flex items-center gap-1 text-body-md text-secondary hover:text-navy">
        <Icon name="arrow_back" className="!text-[18px]" /> My Events
      </Link>

      <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-navy p-5 text-white shadow-lg">
        <div className="min-w-0">
          <h1 className="truncate text-headline-md">{event.name}</h1>
          <p className="truncate text-body-md text-white/70">{summary}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Chip icon="download" label="Downloads" value={event.downloads} />
          <Chip icon="print" label="Prints" value={event.prints} />
        </div>
      </header>

      {isConfigured(event) && (
        <div className="inline-flex gap-1 rounded-xl bg-surface-container p-1">
          <TabButton active={tab === 'photos'} onClick={() => setTab('photos')} icon="add_photo_alternate">
            Photos
          </TabButton>
          <TabButton active={tab === 'setup'} onClick={() => setTab('setup')} icon="tune">
            Setup
          </TabButton>
        </div>
      )}

      {(tab === 'setup' || !isConfigured(event)) && (
        <SetupForm
          event={event}
          onCancel={isConfigured(event) ? () => setTab('photos') : undefined}
          onSaved={(updated) => {
            if (JSON.stringify(updated.setup) !== JSON.stringify(event.setup)) setSheetKey((k) => k + 1);
            setEvent(updated);
            setTab('photos');
          }}
        />
      )}

      {/* Kept mounted (just hidden) while the Setup tab is open, so the photos on the sheet are not lost. */}
      {isConfigured(event) && (
        <div hidden={tab !== 'photos'}>
          <Editor key={sheetKey} event={event} onEvent={setEvent} />
        </div>
      )}
    </div>
  );
}

function Chip({ icon, label, value }: { icon: string; label: string; value: number }) {
  return (
    <span className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-label-lg">
      <Icon name={icon} className="!text-[18px] text-tertiary-container" /> {value} {label}
    </span>
  );
}

function TabButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-label-lg transition ${active ? 'bg-white text-primary-container shadow-sm' : 'text-secondary hover:text-navy'}`}
    >
      <Icon name={icon} className="!text-[18px]" /> {children}
    </button>
  );
}
