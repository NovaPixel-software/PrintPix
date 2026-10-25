import { NextResponse } from 'next/server';
import { getPaper, getShape, getTemplate } from '@/lib/catalog';
import { eventRepo, publicEvent } from '@/lib/server/events';
import { getSession } from '@/lib/server/session';

type Ctx = { params: Promise<{ id: string }> };

// The owner chooses (or changes) the event's setup: product, shape, template size and paper.
export async function PATCH(req: Request, { params }: Ctx) {
  const me = await getSession();
  if (!me) return NextResponse.json({ message: 'Not signed in.' }, { status: 401 });

  const { id } = await params;
  const event = await eventRepo.get(id);
  if (!event || event.ownerId !== me.id) return NextResponse.json({ message: 'Event not found.' }, { status: 404 });

  const body = await req.json().catch(() => null);
  const productId = String(body?.productId ?? '');
  const shapeId = String(body?.shapeId ?? '');
  const templateId = String(body?.templateId ?? '');
  const paperId = String(body?.paperId ?? '');

  const template = getTemplate(templateId);
  if (!template || template.productId !== productId || template.shapeId !== shapeId || !getShape(shapeId) || !getPaper(paperId)) {
    return NextResponse.json({ message: 'Invalid product, shape, size or paper.' }, { status: 400 });
  }

  const updated = await eventRepo.setSetup(id, { productId, shapeId, templateId, paperId });
  return NextResponse.json({ event: updated ? publicEvent(updated) : null });
}
