import { randomUUID } from 'node:crypto';
import { getDb, mongoEnabled } from './mongo';

/*
 * Events live on the server, but only their name, setup and two counters. Photos are never sent or
 * stored here. Like users, everything goes through EventRepo so a database can replace the memory
 * copy by writing one new class.
 *
 * An event starts with just a name. The setup (product, shape, size, paper) is filled in inside the
 * event, so those four fields are null until then.
 */

export interface EventSetup {
  productId: string;
  shapeId: string;
  templateId: string;
  paperId: string;
}

export interface EventRecord {
  id: string;
  ownerId: string;
  name: string;
  setup: EventSetup | null;
  downloads: number;
  prints: number;
  createdAt: string;
}

export interface EventRepo {
  create(input: { ownerId: string; name: string }): Promise<EventRecord>;
  get(id: string): Promise<EventRecord | null>;
  listByOwner(ownerId: string): Promise<EventRecord[]>;
  setSetup(id: string, setup: EventSetup): Promise<EventRecord | null>;
  increment(id: string, kind: 'downloads' | 'prints'): Promise<EventRecord | null>;
}

class MemoryEventRepo implements EventRepo {
  private events: EventRecord[] = [];

  async create(input: { ownerId: string; name: string }) {
    const event: EventRecord = { ...input, id: randomUUID(), setup: null, downloads: 0, prints: 0, createdAt: new Date().toISOString() };
    this.events.push(event);
    return event;
  }
  async get(id: string) {
    return this.events.find((e) => e.id === id) ?? null;
  }
  async listByOwner(ownerId: string) {
    return this.events.filter((e) => e.ownerId === ownerId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async setSetup(id: string, setup: EventSetup) {
    const event = this.events.find((e) => e.id === id);
    if (!event) return null;
    event.setup = setup;
    return event;
  }
  async increment(id: string, kind: 'downloads' | 'prints') {
    const event = this.events.find((e) => e.id === id);
    if (!event) return null;
    event[kind] += 1;
    return event;
  }
}

type EventDoc = Omit<EventRecord, 'id'> & { _id: string };

const toRecord = ({ _id, ...rest }: EventDoc): EventRecord => ({ id: _id, ...rest });

class MongoEventRepo implements EventRepo {
  private col = async () => (await getDb()).collection<EventDoc>('events');

  async create(input: { ownerId: string; name: string }) {
    const doc: EventDoc = { ...input, _id: randomUUID(), setup: null, downloads: 0, prints: 0, createdAt: new Date().toISOString() };
    await (await this.col()).insertOne(doc);
    return toRecord(doc);
  }
  async get(id: string) {
    const doc = await (await this.col()).findOne({ _id: id });
    return doc ? toRecord(doc) : null;
  }
  async listByOwner(ownerId: string) {
    return (await (await this.col()).find({ ownerId }).sort({ createdAt: -1 }).toArray()).map(toRecord);
  }
  async setSetup(id: string, setup: EventSetup) {
    const doc = await (await this.col()).findOneAndUpdate({ _id: id }, { $set: { setup } }, { returnDocument: 'after' });
    return doc ? toRecord(doc) : null;
  }
  async increment(id: string, kind: 'downloads' | 'prints') {
    // $inc is atomic, so two quick downloads or prints are never lost.
    const doc = await (await this.col()).findOneAndUpdate({ _id: id }, { $inc: { [kind]: 1 } }, { returnDocument: 'after' });
    return doc ? toRecord(doc) : null;
  }
}

// Kept on globalThis so Next.js dev reloads do not wipe the in-memory data.
// The key changed with the schema so an old dev-server copy is not reused.
const g = globalThis as unknown as { __printpixEventsV4?: EventRepo };
export const eventRepo: EventRepo = (g.__printpixEventsV4 ??= mongoEnabled() ? new MongoEventRepo() : new MemoryEventRepo());

/** What the browser is allowed to see. */
export function publicEvent(e: EventRecord) {
  const { ownerId: _omit, ...rest } = e;
  return rest;
}

export type PublicEvent = ReturnType<typeof publicEvent>;
