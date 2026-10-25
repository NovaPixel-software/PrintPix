import { redirect } from 'next/navigation';
import { getSession, homeFor } from '@/lib/server/session';
import LoginShell from '@/components/LoginShell';

export default async function LoginPage() {
  const me = await getSession();
  if (me) redirect(homeFor(me.role));
  return <LoginShell />;
}
