import { NextResponse } from 'next/server';
import { eventRepo, publicEvent } from '@/lib/server/events';
import { getSession } from '@/lib/server/session';

type Ctx = { params: Promise<{ id: string }> };

// Adds one to the event's download or print counter. Only the event's owner can.
export async function POST(req: Request, { params }: Ctx) {
  const me = await getSession();
  if (!me) return NextResponse.json({ message: 'Not signed in.' }, { status: 401 });

  const { id } = await params;
  const event = await eventRepo.get(id);
  if (!event || event.ownerId !== me.id) return NextResponse.json({ message: 'Event not found.' }, { status: 404 });

  const body = await req.json().catch(() => null);
  const kind = body?.kind === 'download' ? 'downloads' : body?.kind === 'print' ? 'prints' : null;
  if (!kind) return NextResponse.json({ message: 'kind must be "download" or "print".' }, { status: 400 });

  const updated = await eventRepo.increment(id, kind);
  return NextResponse.json({ event: updated ? publicEvent(updated) : null });
}
