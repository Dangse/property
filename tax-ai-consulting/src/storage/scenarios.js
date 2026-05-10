/**
 * 시나리오 저장소 (localStorage 기반)
 *
 * 향후 Cloudflare KV/D1 등 클라우드 백엔드로 교체할 수 있도록 인터페이스 명확화.
 * 저장 데이터: 스키마 버전·시나리오 ID·입력값·계산 결과 전체·생성일·이름.
 *
 * 키 구조:
 *   localStorage[STORAGE_KEY] = JSON.stringify({ schemaVersion, items: [...] })
 */

const STORAGE_KEY    = 'tuzaga.tax.scenarios';
const SCHEMA_VERSION = 1;

/**
 * @typedef {object} SavedScenario
 * @property {string} id              로컬 고유 ID
 * @property {string} name            사용자 지정 이름
 * @property {number} scenarioId      SCENARIO_META.id (1~10)
 * @property {string} scenarioTitle   표시용 제목
 * @property {object} inputs          폼 입력값
 * @property {object} result          계산 결과 전체 (재렌더 가능)
 * @property {number} createdAt       Unix ms
 * @property {number} updatedAt       Unix ms
 */

function uid() {
  return 'sc_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function readStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { schemaVersion: SCHEMA_VERSION, items: [] };
    const parsed = JSON.parse(raw);
    // 향후 마이그레이션: parsed.schemaVersion < SCHEMA_VERSION 처리
    if (!Array.isArray(parsed.items)) return { schemaVersion: SCHEMA_VERSION, items: [] };
    return parsed;
  } catch {
    return { schemaVersion: SCHEMA_VERSION, items: [] };
  }
}

function writeStore(store) {
  store.schemaVersion = SCHEMA_VERSION;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

// ── CRUD ──────────────────────────────────────────────────────

/**
 * 새 시나리오 저장
 * @returns {SavedScenario}
 */
export function saveScenario({ name, scenarioId, scenarioTitle, inputs, result }) {
  const store = readStore();
  const now   = Date.now();
  const item = {
    id: uid(),
    name: name?.trim() || `${scenarioTitle} - ${new Date(now).toLocaleString('ko-KR')}`,
    scenarioId,
    scenarioTitle,
    inputs,
    result,
    createdAt: now,
    updatedAt: now,
  };
  store.items.unshift(item);
  writeStore(store);
  return item;
}

/** 모든 저장 시나리오 (최신순) */
export function listScenarios() {
  return readStore().items.slice();
}

/** ID로 단일 조회 */
export function getScenario(id) {
  return readStore().items.find(x => x.id === id) || null;
}

/** 이름 변경 */
export function renameScenario(id, newName) {
  const store = readStore();
  const item  = store.items.find(x => x.id === id);
  if (!item) return false;
  item.name = newName.trim() || item.name;
  item.updatedAt = Date.now();
  writeStore(store);
  return true;
}

/** 삭제 */
export function deleteScenario(id) {
  const store = readStore();
  const before = store.items.length;
  store.items = store.items.filter(x => x.id !== id);
  if (store.items.length === before) return false;
  writeStore(store);
  return true;
}

/** 전체 개수 */
export function countScenarios() {
  return readStore().items.length;
}

// ── JSON 파일 I/O ─────────────────────────────────────────────

/** 전체 저장소 JSON 다운로드 (백업·이전용) */
export function exportAllToJSON() {
  const store = readStore();
  const json  = JSON.stringify(store, null, 2);
  const blob  = new Blob([json], { type: 'application/json;charset=utf-8' });
  const url   = URL.createObjectURL(blob);
  const a     = document.createElement('a');
  const ymd   = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `tuzaga-tax-scenarios-${ymd}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * JSON 파일 import
 * @param {File} file
 * @param {object} [opts]
 * @param {'merge'|'replace'} [opts.mode='merge']  merge: 기존 + 신규(중복 ID 제외), replace: 전체 덮어쓰기
 * @returns {Promise<{ added: number, total: number }>}
 */
export async function importFromJSON(file, { mode = 'merge' } = {}) {
  const text = await file.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('JSON 파일 형식이 올바르지 않습니다.');
  }
  if (!parsed || !Array.isArray(parsed.items)) {
    throw new Error('Tuzaga 시나리오 백업 파일이 아닙니다.');
  }

  if (mode === 'replace') {
    writeStore({ schemaVersion: SCHEMA_VERSION, items: parsed.items });
    return { added: parsed.items.length, total: parsed.items.length };
  }

  const store    = readStore();
  const existing = new Set(store.items.map(x => x.id));
  let   added    = 0;
  for (const it of parsed.items) {
    if (!it.id || existing.has(it.id)) continue;
    if (!it.scenarioId || !it.result) continue; // 손상 데이터 거름
    store.items.unshift(it);
    existing.add(it.id);
    added++;
  }
  writeStore(store);
  return { added, total: store.items.length };
}
