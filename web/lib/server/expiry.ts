import type { UserRecord } from './db';

/*
 * Account expiry. A user's `expiresAt` is a plain date (YYYY-MM-DD) and the account works through the
 * end of that day. "Today" is worked out in APP_TIMEZONE (default India) so the day changes at local
 * midnight, not at midnight UTC. Admins have no expiry (expiresAt is null).
 */

const TZ = process.env.APP_TIMEZONE || 'Asia/Kolkata';

const DAY = 864e5;
const at = (iso: string) => Date.parse(iso + 'T00:00:00Z');

export const isIsoDate = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(at(s));

/** Today as YYYY-MM-DD in the app's time zone. */
export const todayIso = () => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());

/** Adds whole months, keeping the day where it exists (31 Jan + 1 month = 28 Feb, not 3 Mar). */
export function addMonthsIso(iso: string, months: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1 + months, 1));
  const daysInMonth = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate();
  t.setUTCDate(Math.min(d, daysInMonth));
  return t.toISOString().slice(0, 10);
}

/** Days from today to the expiry date: 0 on the last valid day, negative once expired. Null when there is no expiry. */
export function daysLeft(expiresAt: string | null): number | null {
  return expiresAt ? Math.round((at(expiresAt) - at(todayIso())) / DAY) : null;
}

export function isExpired(u: Pick<UserRecord, 'role' | 'expiresAt'>): boolean {
  const left = u.role === 'user' ? daysLeft(u.expiresAt) : null;
  return left !== null && left < 0;
}

export const formatIsoDate = (iso: string) =>
  new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
