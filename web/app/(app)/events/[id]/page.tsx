import { notFound } from 'next/navigation';
import { eventRepo, publicEvent } from '@/lib/server/events';
import { requireUser } from '@/lib/server/session';
import EventWorkspace from './EventWorkspace';

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireUser();
  const { id } = await params;
  const event = await eventRepo.get(id);
  if (!event || event.ownerId !== me.id) notFound();
  return <EventWorkspace initial={publicEvent(event)} />;
}
