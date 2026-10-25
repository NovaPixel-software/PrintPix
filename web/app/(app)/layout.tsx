import TopNav from '@/components/TopNav';
import { requireUser } from '@/lib/server/session';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="flex min-h-screen flex-col">
      <TopNav user={{ name: user.name, email: user.email }} />
      <main className="mx-auto w-full max-w-[1360px] flex-1 px-gutter-mobile py-space-lg md:px-margin">{children}</main>
      <footer className="border-t border-surface-container-high px-gutter-mobile py-5 text-body-sm text-secondary md:px-margin">
        <div className="mx-auto flex max-w-[1360px] flex-wrap items-center justify-between gap-2">
          <span>PrintPix Event Engine · Photos stay on this device</span>
          <span>v0.1</span>
        </div>
      </footer>
    </div>
  );
}
