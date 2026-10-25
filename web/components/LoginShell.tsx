import LoginForm from '@/app/login/LoginForm';
import { Logo } from '@/components/ui';

const steps = [
  { n: 1, title: 'Create an event', text: 'Just give it a name.', color: 'bg-navy' },
  { n: 2, title: 'Set up and add photos', text: 'Pick the product, shape, size and paper.', color: 'bg-[#12306a]' },
  { n: 3, title: 'Download or print', text: 'Counted for every event.', color: 'bg-primary-container' },
];

export default function LoginShell() {
  return (
    <div className="flex min-h-screen flex-col bg-[#f4f7fb]">
      <header className="border-b border-surface-container-high bg-white">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between px-gutter-mobile py-3 md:px-7">
          <Logo className="h-10" />
          <span className="hidden text-body-md text-secondary sm:block">Need help? Contact your admin</span>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-[1180px] flex-1 items-center gap-8 px-gutter-mobile py-7 md:px-7 lg:grid-cols-[1.1fr_1fr] lg:gap-14 lg:py-12">
        <section>
          <span className="inline-flex items-center gap-2 rounded-full bg-[#fff1ea] px-3 py-1.5 text-label-md tracking-wide text-[#b43f00]">
            <span className="h-1.5 w-1.5 rounded-full bg-primary-container" /> EVENT PRINTING MADE SIMPLE
          </span>
          <h2 className="mt-4 text-[28px] font-extrabold leading-[1.12] tracking-tight text-navy lg:text-[38px]">
            Photo sheets, ready to <span className="bg-gradient-to-r from-primary-container to-[#ff9a3c] bg-clip-text text-transparent">print</span> in minutes.
          </h2>
          <p className="mt-3 hidden max-w-[470px] text-body-lg text-secondary sm:block">
            Create an event, set up your product and paper, drop in photos, then download or print. Every event keeps its own counts.
          </p>

          <ol className="mt-7 hidden max-w-[470px] gap-3 sm:grid">
            {steps.map((s) => (
              <li key={s.n} className="flex items-center gap-3.5 rounded-xl border border-surface-container-high bg-white px-4 py-3 shadow-sm">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-label-lg font-extrabold text-white ${s.color}`}>{s.n}</span>
                <div>
                  <p className="text-label-lg text-navy">{s.title}</p>
                  <p className="text-body-md text-secondary">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <LoginForm />
      </main>

      <footer className="py-4 text-center text-body-sm text-secondary">© 2026 PrintPix Event Engine</footer>
    </div>
  );
}
