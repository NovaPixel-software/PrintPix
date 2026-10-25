import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { Collection } from 'mongodb';
import { getDb, mongoEnabled } from './mongo';

/*
 * Data layer. Everything the server needs goes through UserRepo, so moving to a
 * real database later means writing one new implementation of this interface
 * and changing `userRepo` at the bottom of the file.
 */

export type Role = 'admin' | 'user';
export type UserStatus = 'active' | 'inactive';

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  lastLogin: string | null; // ISO timestamp
  passwordHash: string;
  createdAt: string;
}

export type NewUser = Pick<UserRecord, 'name' | 'email' | 'role' | 'status'> & { password: string };
export type UserPatch = Partial<Pick<UserRecord, 'name' | 'status' | 'lastLogin'>> & { password?: string };

export interface UserRepo {
  list(): Promise<UserRecord[]>;
  get(id: string): Promise<UserRecord | null>;
  getByEmail(email: string): Promise<UserRecord | null>;
  create(input: NewUser): Promise<UserRecord>;
  update(id: string, patch: UserPatch): Promise<UserRecord | null>;
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 32).toString('hex')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const a = Buffer.from(hash, 'hex');
  const b = scryptSync(password, salt, 32);
  return a.length === b.length && timingSafeEqual(a, b);
}

function seed(): UserRecord[] {
  const make = (name: string, email: string, role: Role, status: UserStatus, password: string, lastLoginHoursAgo: number | null): UserRecord => ({
    id: randomBytes(6).toString('hex'),
    name,
    email,
    role,
    status,
    lastLogin: lastLoginHoursAgo == null ? null : new Date(Date.now() - lastLoginHoursAgo * 36e5).toISOString(),
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
  });
  return [
    make('Sarah Jenkins', 'admin@printpix.io', 'admin', 'active', 'admin123', 0),
    make('Marcus Vance', 'marcus@printpix.io', 'user', 'active', 'user12345', 2),
    make('Elena Rostova', 'elena@printpix.io', 'user', 'active', 'user12345', 18),
    make('David Kalu', 'david@printpix.io', 'user', 'inactive', 'user12345', 120),
  ];
}

class MemoryUserRepo implements UserRepo {
  private users: UserRecord[] = seed();

  async list() {
    return [...this.users];
  }
  async get(id: string) {
    return this.users.find((u) => u.id === id) ?? null;
  }
  async getByEmail(email: string) {
    const e = email.trim().toLowerCase();
    return this.users.find((u) => u.email.toLowerCase() === e) ?? null;
  }
  async create(input: NewUser) {
    const { password, ...rest } = input;
    const user: UserRecord = {
      ...rest,
      id: randomBytes(6).toString('hex'),
      lastLogin: null,
      passwordHash: hashPassword(password),
      createdAt: new Date().toISOString(),
    };
    this.users.push(user);
    return user;
  }
  async update(id: string, patch: UserPatch) {
    const user = this.users.find((u) => u.id === id);
    if (!user) return null;
    const { password, ...rest } = patch;
    Object.assign(user, rest);
    if (password) user.passwordHash = hashPassword(password);
    return user;
  }
}

type UserDoc = Omit<UserRecord, 'id'> & { _id: string };

const toRecord = ({ _id, ...rest }: UserDoc): UserRecord => ({ id: _id, ...rest });

class MongoUserRepo implements UserRepo {
  private ready?: Promise<Collection<UserDoc>>;

  /** The users collection. The first time, it creates the admin from ADMIN_EMAIL / ADMIN_PASSWORD if there is none yet. */
  private col(): Promise<Collection<UserDoc>> {
    this.ready ??= (async () => {
      const col = (await getDb()).collection<UserDoc>('users');
      const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
      const password = process.env.ADMIN_PASSWORD;
      if (email && password && (await col.countDocuments({ role: 'admin' })) === 0) {
        await col
          .insertOne({
            _id: randomBytes(6).toString('hex'),
            name: process.env.ADMIN_NAME?.trim() || 'Admin',
            email,
            role: 'admin',
            status: 'active',
            lastLogin: null,
            passwordHash: hashPassword(password),
            createdAt: new Date().toISOString(),
          })
          // Two serverless instances can start together and both try to create the admin. The unique
          // email index lets only one win, so the other must not fail the request.
          .catch((e: { code?: number }) => {
            if (e.code !== 11000) throw e;
          });
      }
      return col;
    })().catch((e) => {
      this.ready = undefined;
      throw e;
    });
    return this.ready;
  }

  async list() {
    return (await (await this.col()).find().sort({ createdAt: 1 }).toArray()).map(toRecord);
  }
  async get(id: string) {
    const doc = await (await this.col()).findOne({ _id: id });
    return doc ? toRecord(doc) : null;
  }
  async getByEmail(email: string) {
    const doc = await (await this.col()).findOne({ email: email.trim().toLowerCase() });
    return doc ? toRecord(doc) : null;
  }
  async create(input: NewUser) {
    const { password, ...rest } = input;
    const doc: UserDoc = {
      ...rest,
      email: rest.email.trim().toLowerCase(),
      _id: randomBytes(6).toString('hex'),
      lastLogin: null,
      passwordHash: hashPassword(password),
      createdAt: new Date().toISOString(),
    };
    await (await this.col()).insertOne(doc);
    return toRecord(doc);
  }
  async update(id: string, patch: UserPatch) {
    const { password, ...rest } = patch;
    const set: Partial<UserDoc> = { ...rest };
    if (password) set.passwordHash = hashPassword(password);
    const doc = await (await this.col()).findOneAndUpdate({ _id: id }, { $set: set }, { returnDocument: 'after' });
    return doc ? toRecord(doc) : null;
  }
}

// Kept on globalThis so Next.js dev reloads do not wipe the in-memory data or reopen the database.
// The key changed with the schema so an old dev-server copy is not reused.
const g = globalThis as unknown as { __printpixUsersV3?: UserRepo };
export const userRepo: UserRepo = (g.__printpixUsersV3 ??= mongoEnabled() ? new MongoUserRepo() : new MemoryUserRepo());

export function publicUser(u: UserRecord) {
  const { passwordHash: _omit, ...rest } = u;
  return rest;
}

export type PublicUser = ReturnType<typeof publicUser>;
