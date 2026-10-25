import { NextResponse } from 'next/server';
import { publicUser, userRepo } from '@/lib/server/db';
import { getSession } from '@/lib/server/session';

type Ctx = { params: Promise<{ id: string }> };

// Admin edits a user: name, active/inactive, or a reset password.
export async function PATCH(req: Request, { params }: Ctx) {
  const me = await getSession();
  if (!me) return NextResponse.json({ message: 'Not signed in.' }, { status: 401 });
  if (me.role !== 'admin') return NextResponse.json({ message: 'Admins only.' }, { status: 403 });

  const { id } = await params;
  const user = await userRepo.get(id);
  if (!user || user.role !== 'user') return NextResponse.json({ message: 'User not found.' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const patch: Parameters<typeof userRepo.update>[1] = {};

  if (typeof body.name === 'string' && body.name.trim()) patch.name = body.name.trim();
  if (body.status === 'active' || body.status === 'inactive') patch.status = body.status;
  if (typeof body.password === 'string' && body.password) {
    if (body.password.length < 8) return NextResponse.json({ message: 'Password must be at least 8 characters.' }, { status: 400 });
    patch.password = body.password;
  }

  const updated = await userRepo.update(id, patch);
  return NextResponse.json({ user: updated ? publicUser(updated) : null });
}
