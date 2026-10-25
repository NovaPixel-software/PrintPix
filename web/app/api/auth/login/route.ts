import { NextResponse } from 'next/server';
import { publicUser, userRepo, verifyPassword } from '@/lib/server/db';
import { formatIsoDate, isExpired } from '@/lib/server/expiry';
import { cookieOptions, createSessionToken, homeFor, SESSION_COOKIE } from '@/lib/server/session';

// One sign-in for everyone. The account's role decides where they land.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = String(body?.email ?? '').trim();
  const password = String(body?.password ?? '');

  if (!email || !password) return NextResponse.json({ code: 'MISSING', message: 'Enter your email and password.' }, { status: 400 });

  const user = await userRepo.getByEmail(email);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ code: 'INVALID', message: 'Incorrect email or password.' }, { status: 401 });
  }
  if (user.status !== 'active') {
    return NextResponse.json({ code: 'INACTIVE', message: 'Your account is inactive. Contact your admin.' }, { status: 403 });
  }

  if (isExpired(user)) {
    return NextResponse.json({ code: 'EXPIRED', message: `Your account expired on ${formatIsoDate(user.expiresAt!)}. Contact your admin.` }, { status: 403 });
  }

  await userRepo.update(user.id, { lastLogin: new Date().toISOString() });

  const res = NextResponse.json({ user: publicUser(user), redirectTo: homeFor(user.role) });
  res.cookies.set(SESSION_COOKIE, createSessionToken(user.id), cookieOptions());
  return res;
}
