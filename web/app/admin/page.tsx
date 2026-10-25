import { publicUser, userRepo } from '@/lib/server/db';
import { requireAdmin } from '@/lib/server/session';
import AdminConsole from './AdminConsole';

export default async function AdminPage() {
  const admin = await requireAdmin();
  const users = (await userRepo.list()).filter((u) => u.role === 'user').map(publicUser);
  return <AdminConsole initialUsers={users} me={{ name: admin.name, email: admin.email }} />;
}
