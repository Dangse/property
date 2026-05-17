/**
 * 검토 결과·판례 검색 캐시
 *
 * 같은 질문을 반복할 때 비용을 줄이기 위해 reviewer 응답을 캐싱한다.
 * localStorage 기반 (브라우저 단독 — 백엔드 없음).
 *
 * 키 = SHA-256(question + contextHash)
 * TTL = 기본 7일 (판례·예규는 갱신 빈도가 낮음)
 */

const NS = 'tuzaga:cache:v1';
const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const storage = typeof localStorage !== 'undefined'
  ? localStorage
  : memoryStorage();

function memoryStorage() {
  const m = new Map();
  return {
    getItem: (k) => m.has(k) ? m.get(k) : null,
    setItem: (k, v) => m.set(k, v),
    removeItem: (k) => m.delete(k),
    clear: () => m.clear(),
    get length() { return m.size; },
    key: (i) => Array.from(m.keys())[i] ?? null,
  };
}

async function hash(text) {
  // 브라우저 환경
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  // Node (테스트)
  const { createHash } = await import('node:crypto');
  return createHash('sha256').update(text).digest('hex');
}

export async function makeKey(parts) {
  const text = parts.map(p => typeof p === 'string' ? p : JSON.stringify(p)).join('|');
  return `${NS}:${await hash(text)}`;
}

export function get(key) {
  const raw = storage.getItem(key);
  if (!raw) return null;
  try {
    const { value, expiresAt } = JSON.parse(raw);
    if (Date.now() > expiresAt) {
      storage.removeItem(key);
      return null;
    }
    return value;
  } catch {
    storage.removeItem(key);
    return null;
  }
}

export function set(key, value, ttlMs = DEFAULT_TTL_MS) {
  const expiresAt = Date.now() + ttlMs;
  storage.setItem(key, JSON.stringify({ value, expiresAt }));
}

export function clear() {
  for (let i = storage.length - 1; i >= 0; i--) {
    const k = storage.key(i);
    if (k && k.startsWith(NS)) storage.removeItem(k);
  }
}

