import { requireUser } from '@/lib/server/session';
import ChangePasswordForm from '@/components/ChangePasswordForm';

export default async function SettingsPage() {
  const user = await requireUser();

  return (
    <div className="mx-auto max-w-2xl space-y-space-md">
      <h1 className="text-headline-lg text-navy">Settings</h1>

      <section className="rounded-2xl border border-surface-container-high bg-surface-container-lowest p-5 shadow-sm">
        <h2 className="mb-3 text-label-md uppercase tracking-wider text-secondary">Account</h2>
        <dl className="grid grid-cols-[120px_1fr] gap-y-2 text-body-lg">
          <dt className="text-secondary">Name</dt>
          <dd className="text-navy">{user.name}</dd>
          <dt className="text-secondary">Email</dt>
          <dd className="text-navy">{user.email}</dd>
        </dl>
      </section>

      <section className="rounded-2xl border border-surface-container-high bg-surface-container-lowest p-5 shadow-sm">
        <h2 className="mb-1 text-label-md uppercase tracking-wider text-secondary">Change password</h2>
        <p className="mb-4 text-body-md text-secondary">Your admin gave you the first password. Pick your own here.</p>
        <ChangePasswordForm />
      </section>
    </div>
  );
}
