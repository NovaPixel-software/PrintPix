'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ApiError, api } from '@/lib/api';
import SupportLink, { withSupportLink } from '@/components/SupportLink';
import { Icon, Spinner } from '@/components/ui';

const input =
  'h-11 w-full rounded-[10px] border-[1.5px] bg-white px-3.5 text-body-lg text-navy outline-none transition focus:border-[#12306a] focus:ring-4 focus:ring-[#12306a]/10';

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ code?: string; message: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!email.trim() || !password) {
      setError({ code: 'MISSING', message: 'Enter your email and password.' });
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { redirectTo } = await api.login(email.trim(), password);
      router.replace(redirectTo);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) setError({ code: err.code, message: err.message });
      else setError({ message: 'Cannot reach the server. Check your connection and try again.' });
      setBusy(false);
    }
  };

  // An inactive or expired account is not a typing mistake, so it gets a calmer amber box instead of red.
  const inactive = error?.code === 'INACTIVE' || error?.code === 'EXPIRED';
  const border = error && !inactive ? 'border-error' : 'border-surface-container-high';

  return (
    <form
      onSubmit={submit}
      noValidate
      className="relative mx-auto w-full max-w-[430px] rounded-[20px] border border-surface-container-high bg-white px-5 pb-6 pt-7 shadow-[0_24px_60px_rgba(10,25,49,0.12)] sm:px-8 lg:justify-self-end"
    >
      <span className="absolute inset-x-8 -top-px h-1 rounded-b-md bg-gradient-to-r from-primary-container via-[#ff9a3c] to-[#12306a]" />

      <h1 className="text-headline-lg font-extrabold text-navy">Sign in</h1>
      <p className="mt-1 text-body-lg text-secondary">Use the email and password you were given.</p>

      <label htmlFor="email" className="mb-1.5 mt-5 block text-label-lg text-navy">
        Email
      </label>
      <input
        id="email"
        type="email"
        autoComplete="username"
        inputMode="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        className={`${input} ${border}`}
      />

      <label htmlFor="password" className="mb-1.5 mt-5 block text-label-lg text-navy">
        Password
      </label>
      <div className="relative">
        <input
          id="password"
          type={show ? 'text' : 'password'}
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          className={`${input} ${border} pr-16`}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? 'Hide password' : 'Show password'}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg px-2.5 py-2 text-label-md font-bold text-[#12306a] hover:bg-[#eef2fb]"
        >
          {show ? 'Hide' : 'Show'}
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className={`mt-4 flex items-start gap-2 rounded-lg border px-3 py-2.5 text-body-md ${inactive ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-error-container bg-error-container/50 text-on-error-container'}`}
        >
          <Icon name={error.code === 'EXPIRED' ? 'event_busy' : inactive ? 'block' : 'error'} className="!text-[18px]" fill />
          <span>{withSupportLink(error.message)}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={busy}
        className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-[10px] bg-primary-container text-label-lg text-white shadow-[0_10px_22px_rgba(255,94,0,0.28)] transition hover:-translate-y-px hover:bg-[#e65100] disabled:opacity-70"
      >
        {busy ? (
          <>
            <Spinner className="h-4 w-4" /> Signing in…
          </>
        ) : (
          'Sign in'
        )}
      </button>

      <p className="mt-4 text-center text-body-md text-secondary">
        Forgot your password? Contact <SupportLink />
      </p>

      <div className="mt-5 flex items-start gap-2.5 border-t border-surface-container-high pt-4 text-body-md text-secondary">
        <Icon name="verified_user" className="!text-[18px] text-emerald-600" fill />
        <p>
          <b className="text-navy">Your photos stay on your device.</b> They are never uploaded or saved.
        </p>
      </div>
    </form>
  );
}
