import { redirect } from 'next/navigation';
import { getSession, homeFor } from '@/lib/server/session';

export default async function Index() {
  const me = await getSession();
  redirect(me ? homeFor(me.role) : '/login');
}
