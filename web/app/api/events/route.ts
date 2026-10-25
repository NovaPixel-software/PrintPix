import { NextResponse } from 'next/server';
import { eventRepo, publicEvent } from '@/lib/server/events';
import { getSession } from '@/lib/server/session';

// A user creates an event with just a name. The setup is chosen inside the event.
export async function POST(req: Request) {
  const me = await getSession();
  if (!me) return NextResponse.json({ message: 'Not signed in.' }, { status: 401 });
  if (me.role !== 'user') return NextResponse.json({ message: 'Only users create events.' }, { status: 403 });

  const body = await req.json().catch(() => null);
  const name = String(body?.name ?? '').trim().slice(0, 32);
  if (!name) return NextResponse.json({ message: 'Please enter an event name.' }, { status: 400 });

  const event = await eventRepo.create({ ownerId: me.id, name });
  return NextResponse.json({ event: publicEvent(event) }, { status: 201 });
}
