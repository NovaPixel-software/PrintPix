import { NextResponse } from 'next/server';
import { publicUser, userRepo } from '@/lib/server/db';
import { getSession } from '@/lib/server/session';

async function adminOnly() {
  const me = await getSession();
  return me?.role === 'admin' ? null : NextResponse.json({ message: me ? 'Admins only.' : 'Not signed in.' }, { status: me ? 403 : 401 });
}

export async function GET() {
  const denied = await adminOnly();
  if (denied) return denied;
  const users = (await userRepo.list()).filter((u) => u.role === 'user');
  return NextResponse.json({ users: users.map(publicUser) });
}

// Only an admin can create users, and they are always plain users (never admins).
export async function POST(req: Request) {
  const denied = await adminOnly();
  if (denied) return denied;

  const body = await req.json().catch(() => null);
  const name = String(body?.name ?? '').trim();
  const email = String(body?.email ?? '').trim().toLowerCase();
  const password = String(body?.password ?? '');

  if (!name || !email.includes('@')) return NextResponse.json({ message: 'Name and a valid email are required.' }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ message: 'Password must be at least 8 characters.' }, { status: 400 });
  if (await userRepo.getByEmail(email)) return NextResponse.json({ message: 'A user with this email already exists.' }, { status: 409 });

  const user = await userRepo.create({ name, email, password, role: 'user', status: 'active' });
  return NextResponse.json({ user: publicUser(user) }, { status: 201 });
}
