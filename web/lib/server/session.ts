import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { userRepo, type Role, type UserRecord } from './db';

export const SESSION_COOKIE = 'printpix_session';
const SESSION_DAYS = 7;

const g = globalThis as unknown as { __printpixSecret?: string };
const secret = () => (g.__printpixSecret ??= process.env.SESSION_SECRET || randomBytes(32).toString('hex'));

const sign = (payload: string) => createHmac('sha256', secret()).update(payload).digest('base64url');

export function createSessionToken(userId: string, days = SESSION_DAYS): string {
  const payload = Buffer.from(JSON.stringify({ uid: userId, exp: Date.now() + days * 864e5 })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export const cookieOptions = () => ({
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  secure: process.env.NODE_ENV === 'production',
  maxAge: SESSION_DAYS * 24 * 3600,
});

function readToken(token: string | undefined): string | null {
  if (!token) return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const { uid, exp } = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return typeof uid === 'string' && typeof exp === 'number' && exp > Date.now() ? uid : null;
  } catch {
    return null;
  }
}

/** Where each role lands after sign-in. */
export const homeFor = (role: Role) => (role === 'admin' ? '/admin' : '/events');

/**
 * The signed-in account, or null when there is no valid session or the account is inactive.
 * Checked against the repo on every call, so an admin marking someone inactive takes effect on
 * their very next request.
 */
export async function getSession(): Promise<UserRecord | null> {
  const store = await cookies();
  const uid = readToken(store.get(SESSION_COOKIE)?.value);
  if (!uid) return null;
  const user = await userRepo.get(uid);
  return user && user.status === 'active' ? user : null;
}

/** For user pages. Signed-out goes to /login; an admin goes to the admin page. */
export async function requireUser(): Promise<UserRecord> {
  const user = await getSession();
  if (!user) redirect('/login');
  if (user.role !== 'user') redirect(homeFor(user.role));
  return user;
}

/** For admin pages. Signed-out goes to /login; a user goes to their events. */
export async function requireAdmin(): Promise<UserRecord> {
  const user = await getSession();
  if (!user) redirect('/login');
  if (user.role !== 'admin') redirect(homeFor(user.role));
  return user;
}
