// In-memory stand-in for the Redis commands in Kv, for unit tests only. Records TTLs and every
// response body is plain data, so tests can assert on keys, expiries and leaks.
import type { SetOptions, ZMember, ZRangeOptions } from '@devvit/web/server';
import type { Kv } from '../store/kv.ts';

type Value =
  | { kind: 'str'; v: string }
  | { kind: 'hash'; v: Map<string, string> }
  | { kind: 'zset'; v: Map<string, number> };

export class FakeKv implements Kv {
  readonly data = new Map<string, Value>();
  readonly ttl = new Map<string, number>();
  /** Throws this error on every write when set (simulates the storage quota). */
  failWrites: Error | null = null;

  private write(): void {
    if (this.failWrites !== null) throw this.failWrites;
  }
  private hash(key: string, create: boolean): Map<string, string> | undefined {
    const e = this.data.get(key);
    if (e?.kind === 'hash') return e.v;
    if (!create) return undefined;
    const v = new Map<string, string>();
    this.data.set(key, { kind: 'hash', v });
    return v;
  }
  private zset(key: string, create: boolean): Map<string, number> | undefined {
    const e = this.data.get(key);
    if (e?.kind === 'zset') return e.v;
    if (!create) return undefined;
    const v = new Map<string, number>();
    this.data.set(key, { kind: 'zset', v });
    return v;
  }

  async get(key: string): Promise<string | undefined> {
    const e = this.data.get(key);
    return e?.kind === 'str' ? e.v : undefined;
  }
  async set(key: string, value: string, options?: SetOptions): Promise<string> {
    this.write();
    if (options?.nx === true && this.data.has(key)) return '';
    this.data.set(key, { kind: 'str', v: value });
    if (options?.expiration !== undefined)
      this.ttl.set(
        key,
        Math.round((options.expiration.getTime() - Date.now()) / 1000)
      );
    return 'OK';
  }
  async del(...keys: string[]): Promise<void> {
    for (const k of keys) {
      this.data.delete(k);
      this.ttl.delete(k);
    }
  }
  async expire(key: string, seconds: number): Promise<void> {
    if (this.data.has(key)) this.ttl.set(key, seconds);
  }
  async incrBy(key: string, value: number): Promise<number> {
    this.write();
    const n = Number((await this.get(key)) ?? '0') + value;
    this.data.set(key, { kind: 'str', v: String(n) });
    return n;
  }
  async hGet(key: string, field: string): Promise<string | undefined> {
    return this.hash(key, false)?.get(field);
  }
  async hSet(
    key: string,
    fieldValues: { [field: string]: string }
  ): Promise<number> {
    this.write();
    const h = this.hash(key, true);
    let added = 0;
    for (const [f, v] of Object.entries(fieldValues)) {
      if (!h?.has(f)) added++;
      h?.set(f, v);
    }
    return added;
  }
  async hSetNX(key: string, field: string, value: string): Promise<number> {
    this.write();
    const h = this.hash(key, true);
    if (h === undefined || h.has(field)) return 0;
    h.set(field, value);
    return 1;
  }
  async hGetAll(key: string): Promise<Record<string, string>> {
    return Object.fromEntries(this.hash(key, false) ?? []);
  }
  async hIncrBy(key: string, field: string, value: number): Promise<number> {
    this.write();
    const h = this.hash(key, true);
    const n = Number(h?.get(field) ?? '0') + value;
    h?.set(field, String(n));
    return n;
  }
  async hDel(key: string, fields: string[]): Promise<number> {
    const h = this.hash(key, false);
    let n = 0;
    for (const f of fields) if (h?.delete(f) === true) n++;
    return n;
  }
  async hMGet(key: string, fields: string[]): Promise<(string | null)[]> {
    const h = this.hash(key, false);
    return fields.map((f) => h?.get(f) ?? null);
  }
  async zAdd(key: string, ...members: ZMember[]): Promise<number> {
    this.write();
    const z = this.zset(key, true);
    let added = 0;
    for (const m of members) {
      if (!z?.has(m.member)) added++;
      z?.set(m.member, m.score);
    }
    return added;
  }
  private sorted(key: string): { member: string; score: number }[] {
    return [...(this.zset(key, false) ?? new Map<string, number>())]
      .map(([member, score]) => ({ member, score }))
      .sort((a, b) => a.score - b.score || a.member.localeCompare(b.member));
  }
  async zRange(
    key: string,
    start: number | string,
    stop: number | string,
    options?: ZRangeOptions
  ): Promise<{ member: string; score: number }[]> {
    let list = this.sorted(key);
    if (options?.by === 'score') {
      list = list.filter(
        (m) => m.score >= Number(start) && m.score <= Number(stop)
      );
      if (options.reverse === true) list.reverse();
      if (options.limit !== undefined)
        list = list.slice(
          options.limit.offset,
          options.limit.offset + options.limit.count
        );
      return list;
    }
    if (options?.reverse === true) list.reverse();
    const n = list.length;
    const s = Number(start) < 0 ? n + Number(start) : Number(start);
    const e = Number(stop) < 0 ? n + Number(stop) : Number(stop);
    return list.slice(Math.max(0, s), e + 1);
  }
  async zRank(key: string, member: string): Promise<number | undefined> {
    const i = this.sorted(key).findIndex((m) => m.member === member);
    return i === -1 ? undefined : i;
  }
  async zScore(key: string, member: string): Promise<number | undefined> {
    return this.zset(key, false)?.get(member);
  }
  async zIncrBy(key: string, member: string, value: number): Promise<number> {
    this.write();
    const z = this.zset(key, true);
    const n = (z?.get(member) ?? 0) + value;
    z?.set(member, n);
    return n;
  }
  async zRem(key: string, members: string[]): Promise<number> {
    const z = this.zset(key, false);
    let n = 0;
    for (const m of members) if (z?.delete(m) === true) n++;
    return n;
  }
  async zCard(key: string): Promise<number> {
    return this.zset(key, false)?.size ?? 0;
  }

  /** Every key that was written but never given a TTL. */
  keysWithoutTtl(except: (key: string) => boolean = () => false): string[] {
    return [...this.data.keys()].filter((k) => !this.ttl.has(k) && !except(k));
  }
}
