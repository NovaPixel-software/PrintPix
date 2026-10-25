'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import ProfileMenu from './ProfileMenu';
import { Icon, Logo } from './ui';

interface Props {
  user: { name: string; email: string };
}

export default function TopNav({ user }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  const logout = async () => {
    await api.logout().catch(() => {});
    router.replace('/login');
    router.refresh();
  };

  const onEvents = pathname === '/events' || (pathname.startsWith('/events/') && pathname !== '/events/new');
  const links = (
    <>
      <Link
        href="/events"
        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-label-lg transition-colors md:py-2 ${onEvents ? 'bg-surface-container text-navy' : 'text-secondary hover:bg-surface-container-low'}`}
      >
        <Icon name="event" className="!text-[18px] md:hidden" /> My Events
      </Link>
      <Link
        href="/events/new"
        className="flex items-center gap-1.5 rounded-lg bg-primary-container px-3 py-1.5 text-label-lg text-white shadow-sm md:py-2 transition-colors hover:bg-[#e65100]"
      >
        <Icon name="add" className="!text-[18px] md:hidden" /> New Event
      </Link>
    </>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-surface-container-high/70 bg-surface-container-lowest/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1360px] h-14 items-center gap-4 px-gutter-mobile md:h-auto md:px-margin md:py-3">
        <Link href="/events" className="shrink-0">
          <Logo className="h-10" />
        </Link>

        <nav className="ml-2 hidden items-center gap-1 md:flex">{links}</nav>

        <div className="ml-auto flex items-center gap-2">
          <ProfileMenu
            name={user.name}
            email={user.email}
            items={[
              { label: 'Settings', icon: 'settings', href: '/settings' },
              { label: 'Log out', icon: 'logout', onClick: logout, danger: true },
            ]}
          />
        </div>
      </div>

      <nav className="flex h-[45px] items-center gap-2 border-t border-surface-container px-gutter-mobile md:hidden">{links}</nav>
    </header>
  );
}
