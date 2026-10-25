'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Icon } from '@/components/ui';

export interface EventRow {
  id: string;
  name: string;
  product: string | null; // null while the setup is not finished
  size: string | null;
  perSheet: number | null;
  created: string;
  downloads: number;
  prints: number;
}

type View = 'table' | 'cards';

const NotFinished = () => (
  <span className="inline-flex w-fit items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-label-md text-amber-900">
    <Icon name="pending" className="!text-[16px]" /> Setup not finished
  </span>
);

export default function EventsList({ rows }: { rows: EventRow[] }) {
  const router = useRouter();
  const [view, setView] = useState<View>('table');

  return (
    <div className="space-y-space-md">
      <div className="hidden justify-end md:flex">
        <div className="inline-flex gap-1 rounded-xl bg-surface-container p-1" role="group" aria-label="View">
          {(['table', 'cards'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              aria-pressed={view === v}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-label-lg capitalize transition ${view === v ? 'bg-white text-primary-container shadow-sm' : 'text-secondary hover:text-navy'}`}
            >
              <Icon name={v === 'table' ? 'table_rows' : 'grid_view'} className="!text-[18px]" /> {v}
            </button>
          ))}
        </div>
      </div>

      {/* Table: the default, from tablet width up. */}
      {view === 'table' && (
        <div className="hidden overflow-x-auto rounded-2xl border border-surface-container-high bg-surface-container-lowest shadow-sm md:block">
          <table className="w-full text-left text-body-lg">
            <thead className="bg-surface-container-low text-label-md text-secondary">
              <tr>
                {['Event', 'Product', 'Size', 'Per sheet', 'Created', 'Downloads', 'Prints'].map((h, i) => (
                  <th key={h} className={`whitespace-nowrap px-4 py-3 font-semibold ${i >= 5 ? 'text-right' : ''}`}>
                    {h}
                  </th>
                ))}
                <th className="w-10 px-2 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {rows.map((r) => (
                <tr key={r.id} onClick={() => router.push(`/events/${r.id}`)} className="cursor-pointer transition hover:bg-surface-container-low">
                  <td className="px-4 py-3">
                    <Link href={`/events/${r.id}`} onClick={(e) => e.stopPropagation()} className="text-label-lg text-navy hover:text-primary-container hover:underline">
                      {r.name}
                    </Link>
                  </td>
                  {r.product ? (
                    <>
                      <td className="whitespace-nowrap px-4 py-3 text-body-lg text-navy">{r.product}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-body-lg text-navy">{r.size}</td>
                      <td className="px-4 py-3 text-body-lg text-navy">{r.perSheet}</td>
                    </>
                  ) : (
                    <td colSpan={3} className="px-4 py-3">
                      <NotFinished />
                    </td>
                  )}
                  <td className="whitespace-nowrap px-4 py-3 text-body-lg text-secondary">{r.created}</td>
                  <td className="px-4 py-3 text-right text-body-lg font-semibold text-navy">{r.downloads}</td>
                  <td className="px-4 py-3 text-right text-body-lg font-semibold text-navy">{r.prints}</td>
                  <td className="px-2 py-3 text-secondary">
                    <Icon name="chevron_right" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Cards: the other view on tablet and up, and always on phones where a table will not fit. */}
      <ul className={`grid gap-space-md sm:grid-cols-2 xl:grid-cols-3 ${view === 'table' ? 'md:hidden' : ''}`}>
        {rows.map((r) => (
          <li key={r.id}>
            <Link
              href={`/events/${r.id}`}
              className="group flex h-full flex-col rounded-2xl border border-surface-container-high bg-surface-container-lowest p-5 shadow-sm transition hover:border-primary-container/50 hover:shadow-md"
            >
              <p className="truncate text-headline-sm text-navy group-hover:text-primary-container">{r.name}</p>
              <div className="mt-1">
                {r.product ? (
                  <p className="text-body-md text-secondary">
                    {r.product} · {r.size} · {r.perSheet} per sheet
                  </p>
                ) : (
                  <NotFinished />
                )}
              </div>
              <p className="text-body-sm text-secondary">Created {r.created}</p>
              <div className="mt-4 grid grid-cols-2 gap-2 border-t border-surface-container pt-4">
                <Count icon="download" label="Downloads" value={r.downloads} />
                <Count icon="print" label="Prints" value={r.prints} />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Count({ icon, label, value }: { icon: string; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-container text-tertiary">
        <Icon name={icon} className="!text-[18px]" />
      </span>
      <div className="leading-tight">
        <p className="text-headline-sm text-navy">{value}</p>
        <p className="text-body-sm text-secondary">{label}</p>
      </div>
    </div>
  );
}
