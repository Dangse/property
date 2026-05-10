/**
 * 메인 앱 컨트롤러 — 라우팅, 폼 초기화, 결과 렌더링
 */

import { SCENARIO_FORMS, SCENARIO_META } from './forms.js';
import { renderHomeHTML, renderScenarioHTML, renderResultHTML, renderLoadedHTML } from './renderer.js';
import {
  runScenario1, runScenario2, runScenario3, runScenario4, runScenario5,
  runScenario6, runScenario7, runScenario8, runScenario9, runScenario10,
} from '../scenario/index.js';
import { parseInput }    from './formatter.js';
import { initChatPanel } from './chat-panel.js';
import { exportPDF }     from '../export/pdf-export.js';
import { exportWord }    from '../export/word-export.js';
import { saveScenario, getScenario }                        from '../storage/scenarios.js';
import { renderSavedSectionHTML, bindSavedSection }         from './scenario-list.js';

const RUNNERS = {
  1: runScenario1,  2: runScenario2,  3: runScenario3,
  4: runScenario4,  5: runScenario5,  6: runScenario6,
  7: runScenario7,  8: runScenario8,  9: runScenario9,
  10: runScenario10,
};

// ── Routing ───────────────────────────────────────────────────
function navigate() {
  const hash = location.hash;
  const view = document.getElementById('app-view');

  if (!hash || hash === '#' || hash === '#/') {
    view.innerHTML = renderHomeHTML();
    bindScenarioCards();
    refreshSavedSection();
    return;
  }

  const loadMatch = hash.match(/^#load-(.+)$/);
  if (loadMatch) {
    const saved = getScenario(loadMatch[1]);
    if (!saved) { location.hash = ''; return; }
    view.innerHTML = renderLoadedHTML(saved);
    bindResultControls(saved.result, { scenarioId: saved.scenarioId, defaultName: saved.name });
    document.getElementById('back-btn')?.addEventListener('click', () => { location.hash = ''; });
    initChatPanel(saved.result);
    return;
  }

  const m = hash.match(/^#scenario-(\d+)$/);
  if (m) {
    const id = parseInt(m[1]);
    if (!RUNNERS[id]) { location.hash = ''; return; }
    view.innerHTML = renderScenarioHTML(id);
    initScenarioForm(id);
    return;
  }

  location.hash = '';
}

function refreshSavedSection() {
  const host = document.getElementById('saved-section');
  if (!host) return;
  host.innerHTML = renderSavedSectionHTML();
  bindSavedSection(
    id => { location.hash = `#load-${id}`; },
    () => refreshSavedSection(),
  );
}

/**
 * 결과 화면의 저장/내보내기 버튼 공통 바인딩
 * (계산 직후·저장 불러오기 양쪽에서 사용)
 */
function bindResultControls(result, { scenarioId, defaultName } = {}) {
  document.getElementById('export-pdf-btn')?.addEventListener('click', () => exportPDF(result));
  document.getElementById('export-word-btn')?.addEventListener('click', () => exportWord(result));
  document.getElementById('export-print-btn')?.addEventListener('click', () => window.print());

  const saveBtn = document.getElementById('save-scenario-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const meta  = SCENARIO_META.find(s => s.id === scenarioId);
      const title = meta ? meta.title.replace(/\n/g, ' ') : (result.title || '시나리오');
      const name  = prompt('시나리오 이름을 입력하세요:', defaultName || title);
      if (name == null) return; // 취소
      saveScenario({
        name,
        scenarioId: scenarioId || result.scenarioId || 0,
        scenarioTitle: result.title || title,
        inputs: result.inputs || {},
        result,
      });
      saveBtn.textContent = '✓ 저장됨';
      saveBtn.disabled = true;
      setTimeout(() => {
        saveBtn.textContent = '💾 저장';
        saveBtn.disabled = false;
      }, 1800);
    });
  }
}

function bindScenarioCards() {
  document.querySelectorAll('.scenario-card[data-id]').forEach(card => {
    card.addEventListener('click', () => {
      location.hash = `#scenario-${card.dataset.id}`;
    });
  });
}

// ── Form init ─────────────────────────────────────────────────
function initScenarioForm(id) {
  const form = SCENARIO_FORMS[id];
  if (!form) return;

  document.getElementById('back-btn')?.addEventListener('click', () => {
    location.hash = '';
  });

  // Money fields: format with commas on input
  document.querySelectorAll('[data-type="money"]').forEach(input => {
    input.addEventListener('input', () => {
      const digits = input.value.replace(/[^\d]/g, '');
      input.value = digits ? parseInt(digits).toLocaleString('ko-KR') : '';
    });
    input.addEventListener('blur', () => {
      if (!input.value) input.value = '';
    });
  });

  // Number fields: allow only digits and decimal point
  document.querySelectorAll('[data-type="num"]').forEach(input => {
    input.addEventListener('input', () => {
      input.value = input.value.replace(/[^\d.]/g, '');
    });
  });

  // Sample values button
  document.getElementById('sample-btn')?.addEventListener('click', () => {
    Object.entries(form.sample).forEach(([key, val]) => {
      const el = document.getElementById(key);
      if (!el) return;
      if (el.tagName === 'SELECT') {
        el.value = String(val);
      } else if (el.dataset.type === 'money') {
        el.value = Math.floor(val).toLocaleString('ko-KR');
      } else {
        el.value = String(val);
      }
    });
  });

  // Form submit
  document.getElementById('scenario-form')?.addEventListener('submit', e => {
    e.preventDefault();
    const btn = e.target.querySelector('.submit-btn');
    btn.textContent = '계산 중...';
    btn.disabled = true;

    try {
      const inputs = collectInputs(id, form);
      const result = RUNNERS[id](inputs);
      // 저장 기능을 위해 입력값과 시나리오 ID를 결과 객체에 첨부
      result.inputs = result.inputs || inputs;
      result.scenarioId = id;
      const resultSection = document.getElementById('result-section');
      resultSection.innerHTML = renderResultHTML(result);
      resultSection.style.display = '';
      bindResultControls(result, { scenarioId: id });
      initChatPanel(result);
      setTimeout(() => {
        resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    } catch (err) {
      console.error('계산 오류:', err);
      alert('계산 중 오류가 발생했습니다.\n' + err.message);
    } finally {
      btn.textContent = '세금 계산하기 →';
      btn.disabled = false;
    }
  });
}

// ── Input collection ──────────────────────────────────────────
function collectInputs(id, form) {
  const raw = {};

  form.sections.forEach(sec => {
    if (sec.type === 'recipients') {
      sec.rows.forEach(row => {
        const priceEl = document.getElementById(row.priceId);
        const ageEl   = document.getElementById(row.ageId);
        raw[row.priceId] = priceEl ? parseInput(priceEl.value) : 0;
        raw[row.ageId]   = ageEl ? (parseFloat(ageEl.value) || 0) : 0;
      });
    } else {
      sec.fields.forEach(f => {
        const el = document.getElementById(f.id);
        if (!el) return;
        if (f.type === 'money') {
          raw[f.id] = parseInput(el.value);
        } else if (f.type === 'select') {
          raw[f.id] = parseInt(el.value);
        } else if (f.type === 'percent') {
          raw[f.id] = (parseFloat(el.value) || 0) / 100;
        } else {
          raw[f.id] = parseFloat(el.value) || 0;
        }
      });
    }
  });

  // Scenarios 3 & 4: flat fields → structured recipient objects
  if (id === 3 || id === 4) {
    return {
      ...raw,
      child:       { price: raw.childPrice       ?? 0, age: raw.childAge       ?? 0 },
      childSpouse: { price: raw.childSpousePrice  ?? 0, age: raw.childSpouseAge  ?? 0 },
      grand1:      { price: raw.grand1Price       ?? 0, age: raw.grand1Age       ?? 0 },
      grand2:      { price: raw.grand2Price       ?? 0, age: raw.grand2Age       ?? 0 },
      grand3:      { price: raw.grand3Price       ?? 0, age: raw.grand3Age       ?? 0 },
    };
  }

  // Scenario 7: compute spouseRate from ownerRate
  if (id === 7) {
    return { ...raw, spouseRate: 1 - (raw.ownerRate ?? 0) };
  }

  // Scenario 9: flat → structured spouse + child1-4
  if (id === 9) {
    return {
      ...raw,
      spouse: { price: raw.spousePrice ?? 0, age: raw.spouseAge ?? 0 },
      child1: { price: raw.child1Price  ?? 0, age: raw.child1Age  ?? 0 },
      child2: { price: raw.child2Price  ?? 0, age: raw.child2Age  ?? 0 },
      child3: { price: raw.child3Price  ?? 0, age: raw.child3Age  ?? 0 },
      child4: { price: raw.child4Price  ?? 0, age: raw.child4Age  ?? 0 },
    };
  }

  // Scenario 10: flat → structured spouse + childSpouse + child2-4
  if (id === 10) {
    return {
      ...raw,
      spouse:      { price: raw.spousePrice      ?? 0, age: raw.spouseAge      ?? 0 },
      childSpouse: { price: raw.childSpousePrice ?? 0, age: raw.childSpouseAge ?? 0 },
      child2:      { price: raw.child2Price      ?? 0, age: raw.child2Age      ?? 0 },
      child3:      { price: raw.child3Price      ?? 0, age: raw.child3Age      ?? 0 },
      child4:      { price: raw.child4Price      ?? 0, age: raw.child4Age      ?? 0 },
    };
  }

  return raw;
}

// ── Boot ──────────────────────────────────────────────────────
window.addEventListener('hashchange', navigate);

window.addEventListener('DOMContentLoaded', () => {
  const dateEl = document.getElementById('today-date');
  if (dateEl) {
    dateEl.textContent = new Date().toLocaleDateString('ko-KR', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  }

  document.getElementById('logo')?.addEventListener('click', () => {
    location.hash = '';
  });

  navigate();
});
