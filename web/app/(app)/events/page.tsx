import Link from 'next/link';
import { Icon } from '@/components/ui';
import { getProduct } from '@/lib/catalog';
import { resolveSetup } from '@/lib/event';
import { eventRepo } from '@/lib/server/events';
import { requireUser } from '@/lib/server/session';
import EventsList, { type EventRow } from './EventsList';

export default async function MyEventsPage() {
  const me = await requireUser();
  const events = await eventRepo.listByOwner(me.id);

  const rows: EventRow[] = events.map((e) => {
    const created = new Date(e.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const base = { id: e.id, name: e.name, created, downloads: e.downloads, prints: e.prints };
    if (!e.setup) return { ...base, product: null, size: null, perSheet: null };
    const { template, layout } = resolveSetup(e.setup);
    const size = template.wmm === template.hmm ? `${template.wmm} mm` : `${template.wmm}×${template.hmm} mm`;
    return { ...base, product: getProduct(e.setup.productId)?.label ?? e.setup.productId, size, perSheet: layout.count };
  });

  const newEvent = (
    <Link
      href="/events/new"
      className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary-container px-5 text-label-lg text-white shadow-lg shadow-primary-container/30 transition hover:bg-[#e65100]"
    >
      <Icon name="add" className="!text-[20px]" /> New Event
    </Link>
  );

  return (
    <div className="space-y-space-lg">
      <div>
        <h1 className="text-headline-lg text-navy sm:text-display">My Events</h1>
        <p className="mt-1 text-body-lg text-secondary">Open an event to set it up, add photos, print, and see its counts.</p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-outline-variant bg-surface-container-lowest p-10 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-fixed text-primary">
            <Icon name="event" className="!text-[28px]" />
          </span>
          <h2 className="mt-4 text-headline-sm text-navy">No events yet</h2>
          <p className="mx-auto mt-1 max-w-sm text-body-lg text-secondary">Create your first event with just a name. You will set it up inside.</p>
          <div className="mt-5 flex justify-center">{newEvent}</div>
        </div>
      ) : (
        <EventsList rows={rows} />
      )}
    </div>
  );
}
