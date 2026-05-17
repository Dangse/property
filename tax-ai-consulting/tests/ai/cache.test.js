import { describe, it, expect, beforeEach } from 'vitest';
import * as cache from '../../src/ai/cache.js';

describe('cache — localStorage TTL 캐시', () => {
  beforeEach(() => cache.clear());

  it('makeKey: 같은 입력은 같은 키, 다른 입력은 다른 키', async () => {
    const a = await cache.makeKey(['review', 'q1']);
    const b = await cache.makeKey(['review', 'q1']);
    const c = await cache.makeKey(['review', 'q2']);
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).toMatch(/^tuzaga:cache:v1:[0-9a-f]{64}$/);
  });

  it('set/get round-trip', async () => {
    const k = await cache.makeKey(['x']);
    cache.set(k, { hello: 'world' });
    expect(cache.get(k)).toEqual({ hello: 'world' });
  });

  it('TTL 만료 후 null 반환', async () => {
    const k = await cache.makeKey(['ttl']);
    cache.set(k, 42, -1);  // 이미 만료
    expect(cache.get(k)).toBeNull();
  });

  it('clear: 네임스페이스 키만 삭제', async () => {
    const k = await cache.makeKey(['c']);
    cache.set(k, 1);
    cache.clear();
    expect(cache.get(k)).toBeNull();
  });
});
