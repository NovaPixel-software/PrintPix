'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import ChangePasswordForm from '@/components/ChangePasswordForm';
import ProfileMenu from '@/components/ProfileMenu';
import { Icon, Initials, Logo, Spinner } from '@/components/ui';
import { ApiError, api, type PublicUser } from '@/lib/api';

type Tab = 'all' | 'active' | 'inactive';

function ago(iso: string | null): string {
  if (!iso) return 'Never';
  const mins = Math.floor((Date.now() - Date.parse(iso)) / 60000);
  if (mins < 2) return 'Just now';
  if (mins < 60) return `${mins} minutes ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? 'Yesterday' : `${days} days ago`;
}

const genPassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint32Array(12));
  return [...bytes].map((b) => chars[b % chars.length]).join('');
};

const inputClass =
  'h-10 w-full rounded-lg border border-surface-container-high bg-surface-container-low px-3 text-body-lg outline-none focus:border-tertiary-container focus:ring-[3px] focus:ring-tertiary-container/20';

export default function AdminConsole({ initialUsers, me }: { initialUsers: PublicUser[]; me: { name: string; email: string } }) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [tab, setTab] = useState<Tab>('all');
  const [query, setQuery] = useState('');
  const [dialog, setDialog] = useState<'add' | 'myPassword' | { reset: PublicUser } | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const active = users.filter((u) => u.status === 'active').length;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users
      .filter((u) => tab === 'all' || u.status === tab)
      .filter((u) => !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [users, tab, query]);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  };

  const setStatus = async (u: PublicUser, status: 'active' | 'inactive') => {
    setPending(u.id);
    try {
      const { user } = await api.updateUser(u.id, { status });
      setUsers((prev) => prev.map((x) => (x.id === u.id ? user : x)));
      flash(status === 'active' ? `${u.name} is now active.` : `${u.name} is now inactive and cannot sign in.`);
    } catch (e) {
      flash(e instanceof ApiError ? e.message : 'Could not reach the server.');
    } finally {
      setPending(null);
    }
  };

  const logout = async () => {
    await api.logout().catch(() => {});
    router.replace('/login');
    router.refresh();
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'all', label: `All (${users.length})` },
    { id: 'active', label: `Active (${active})` },
    { id: 'inactive', label: `Inactive (${users.length - active})` },
  ];

  return (
    <div className="min-h-screen bg-surface">
      <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-surface-container-high bg-surface-container-lowest/95 px-gutter-mobile py-3 backdrop-blur md:px-margin">
        <div className="flex min-w-0 items-center gap-3">
          <Logo className="h-10 shrink-0" />
          <span className="shrink-0 rounded border border-primary-container/50 bg-primary-container/10 px-2 py-0.5 text-label-sm text-primary-container">ADMIN</span>
        </div>
        <ProfileMenu
          name={me.name}
          email={me.email}
          items={[
            { label: 'My password', icon: 'key', onClick: () => setDialog('myPassword') },
            { label: 'Log out', icon: 'logout', onClick: logout, danger: true },
          ]}
        />
      </header>

      <main className="mx-auto max-w-6xl space-y-space-lg px-gutter-mobile py-space-lg md:px-margin">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-headline-lg text-navy sm:text-display">Users</h1>
            <p className="mt-2 max-w-2xl text-body-lg text-secondary">Add users, reset their password, and switch them active or inactive. Inactive users cannot sign in.</p>
          </div>
          <button onClick={() => setDialog('add')} className="flex h-11 w-full items-center justify-center gap-2 sm:w-auto rounded-lg bg-primary-container px-5 text-label-lg text-white shadow-lg shadow-primary-container/30 hover:bg-[#e65100]">
            <Icon name="person_add" className="!text-[20px]" /> Add user
          </button>
        </div>

        <section className="rounded-2xl border border-surface-container-high bg-surface-container-lowest shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-container p-4">
            <div className="flex flex-wrap gap-1 rounded-xl bg-surface-container p-1">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`rounded-lg px-3 py-2 text-label-lg transition ${tab === t.id ? 'bg-white text-primary-container shadow-sm' : 'text-secondary hover:text-navy'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="relative w-full sm:w-80">
              <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name or email…"
                className="h-10 w-full rounded-lg border border-surface-container-high bg-surface-container-low pl-10 pr-3 text-body-md outline-none focus:border-tertiary-container focus:ring-[3px] focus:ring-tertiary-container/20"
              />
            </div>
          </div>

          <ul className="divide-y divide-surface-container md:hidden">
            {filtered.map((u) => {
              const busy = pending === u.id;
              const on = u.status === 'active';
              return (
                <li key={u.id} className={`space-y-3 p-4 ${on ? '' : 'bg-surface-container-low/60'}`}>
                  <div className="flex items-center gap-3">
                    <Initials name={u.name} className="h-10 w-10 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-label-lg text-navy">{u.name}</p>
                      <p className="truncate text-body-md text-secondary">{u.email}</p>
                    </div>
                    <StatusPill on={on} />
                  </div>
                  <p className="text-body-md text-secondary">Last login: {ago(u.lastLogin)}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setDialog({ reset: u })}
                      className="flex h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-surface-container-high text-label-md text-primary-container hover:bg-surface-container-low"
                    >
                      <Icon name="key" className="!text-[16px]" /> Reset password
                    </button>
                    <StatusButton on={on} busy={busy} onClick={() => setStatus(u, on ? 'inactive' : 'active')} className="h-10" />
                  </div>
                </li>
              );
            })}
            {filtered.length === 0 && (
              <li className="px-4 py-12 text-center text-secondary">{users.length === 0 ? 'No users yet. Add the first one.' : 'No users match this view.'}</li>
            )}
          </ul>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-body-lg">
              <thead className="bg-surface-container-low text-label-md text-secondary">
                <tr>
                  {['User', 'Status', 'Last login', 'Actions'].map((h, i) => (
                    <th key={h} className={`px-4 py-3 font-semibold ${i === 3 ? 'text-right' : ''}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {filtered.map((u) => {
                  const busy = pending === u.id;
                  const on = u.status === 'active';
                  return (
                    <tr key={u.id} className={on ? '' : 'bg-surface-container-low/60'}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Initials name={u.name} className="h-10 w-10" />
                          <div className="min-w-0">
                            <p className="truncate text-label-lg text-navy">{u.name}</p>
                            <p className="truncate text-body-md text-secondary">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill on={on} />
                      </td>
                      <td className="px-4 py-3 text-body-lg text-navy">{ago(u.lastLogin)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => setDialog({ reset: u })} className="px-2 text-label-lg text-primary-container hover:underline">
                            Reset password
                          </button>
                          <StatusButton on={on} busy={busy} onClick={() => setStatus(u, on ? 'inactive' : 'active')} className="min-w-[130px] py-2" />
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-14 text-center text-secondary">
                      {users.length === 0 ? 'No users yet. Add the first one.' : 'No users match this view.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {dialog === 'add' && (
        <AddUserDialog
          onClose={() => setDialog(null)}
          onCreated={(user) => {
            setUsers((prev) => [...prev, user]);
            setDialog(null);
            flash(`${user.name} added.`);
          }}
        />
      )}
      {dialog && typeof dialog === 'object' && (
        <ResetPasswordDialog
          user={dialog.reset}
          onClose={() => setDialog(null)}
          onDone={() => {
            flash(`Password reset for ${dialog.reset.name}.`);
            setDialog(null);
          }}
        />
      )}
      {dialog === 'myPassword' && (
        <Modal title="Change my password" onClose={() => setDialog(null)}>
          <ChangePasswordForm />
        </Modal>
      )}

      {toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-navy px-5 py-3 text-label-lg text-white shadow-xl">{toast}</div>}
    </div>
  );
}

function StatusPill({ on }: { on: boolean }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-label-md ${on ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-surface-container-high bg-surface-container text-secondary'}`}
    >
      <span className={`h-2 w-2 rounded-full ${on ? 'bg-emerald-500' : 'bg-secondary'}`} /> {on ? 'Active' : 'Inactive'}
    </span>
  );
}

function StatusButton({ on, busy, onClick, className = '' }: { on: boolean; busy: boolean; onClick: () => void; className?: string }) {
  return (
    <button
      disabled={busy}
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-label-md disabled:opacity-60 ${on ? 'bg-surface-container text-navy hover:bg-surface-container-high' : 'bg-primary-container text-white hover:bg-[#e65100]'} ${className}`}
    >
      {busy ? <Spinner className="h-4 w-4" /> : <Icon name={on ? 'block' : 'check_circle'} className="!text-[16px]" />}
      {on ? 'Make inactive' : 'Make active'}
    </button>
  );
}

function Modal({ title, subtitle, onClose, children }: { title: string; subtitle?: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="max-h-[94vh] w-full max-w-md space-y-4 overflow-auto rounded-2xl bg-surface-container-lowest p-5 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-headline-md text-navy">{title}</h2>
            {subtitle && <p className="text-body-md text-secondary">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-secondary hover:bg-surface-container" aria-label="Close">
            <Icon name="close" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function PasswordField({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center justify-between text-label-lg text-navy">
        {label}
        <button type="button" onClick={() => onChange(genPassword())} className="text-label-md text-primary-container hover:underline">
          Generate
        </button>
      </span>
      <input className={`${inputClass} font-mono`} value={value} onChange={(e) => onChange(e.target.value)} minLength={8} required />
      <span className="mt-1 block text-body-sm text-secondary">Share this with the user. They can change it after signing in.</span>
    </label>
  );
}

function AddUserDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (u: PublicUser) => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(genPassword());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { user } = await api.createUser({ name, email, password });
      onCreated(user);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reach the server.');
      setBusy(false);
    }
  };

  return (
    <Modal title="Add user" subtitle="The new user starts as active." onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <label className="block">
          <span className="mb-1 block text-label-lg text-navy">Full name</span>
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label className="block">
          <span className="mb-1 block text-label-lg text-navy">Email (their login)</span>
          <input className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <PasswordField label="Password" value={password} onChange={setPassword} />
        {error && <p role="alert" className="rounded-lg bg-error-container/50 px-3 py-2 text-body-md text-on-error-container">{error}</p>}
        <div className="flex justify-end gap-3 pt-1">
          <button type="button" onClick={onClose} className="h-10 rounded-lg px-4 text-label-lg text-secondary hover:bg-surface-container">
            Cancel
          </button>
          <button disabled={busy} className="flex h-10 items-center gap-2 rounded-lg bg-primary-container px-5 text-label-lg text-white hover:bg-[#e65100] disabled:opacity-60">
            {busy && <Spinner className="h-4 w-4" />} Add user
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ResetPasswordDialog({ user, onClose, onDone }: { user: PublicUser; onClose: () => void; onDone: () => void }) {
  const [password, setPassword] = useState(genPassword());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.updateUser(user.id, { password });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reach the server.');
      setBusy(false);
    }
  };

  return (
    <Modal title="Reset password" subtitle={user.email} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <PasswordField label="New password" value={password} onChange={setPassword} />
        {error && <p role="alert" className="rounded-lg bg-error-container/50 px-3 py-2 text-body-md text-on-error-container">{error}</p>}
        <div className="flex justify-end gap-3 pt-1">
          <button type="button" onClick={onClose} className="h-10 rounded-lg px-4 text-label-lg text-secondary hover:bg-surface-container">
            Cancel
          </button>
          <button disabled={busy} className="flex h-10 items-center gap-2 rounded-lg bg-primary-container px-5 text-label-lg text-white hover:bg-[#e65100] disabled:opacity-60">
            {busy && <Spinner className="h-4 w-4" />} Reset password
          </button>
        </div>
      </form>
    </Modal>
  );
}
