/**
 * 저장된 시나리오 리스트 UI
 *
 * 홈 화면 하단에 노출되는 카드 그리드.
 * 각 카드: 이름, 시나리오 종류, 저장일, [열기] [이름변경] [삭제] 액션.
 * 상단 도구: JSON 내보내기 / JSON 불러오기.
 */

import { listScenarios, deleteScenario, renameScenario,
         exportAllToJSON, importFromJSON, countScenarios } from '../storage/scenarios.js';
import { wonStr } from './formatter.js';

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtDate(ts) {
  return new Date(ts).toLocaleDateString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
  });
}

/** 저장된 시나리오 섹션 HTML (없으면 빈 문자열 반환) */
export function renderSavedSectionHTML() {
  const items = listScenarios();
  const count = items.length;

  const toolbar = `
    <div class="saved-toolbar">
      <button type="button" id="saved-import-btn" class="saved-tool-btn">📥 JSON 불러오기</button>
      <button type="button" id="saved-export-btn" class="saved-tool-btn"${count === 0 ? ' disabled' : ''}>📤 JSON 내보내기</button>
      <input type="file" id="saved-import-file" accept="application/json,.json" hidden>
    </div>
  `;

  if (count === 0) {
    return `
      <h3 class="saved-title">📂 저장된 시나리오 <span class="saved-count">0</span></h3>
      ${toolbar}
      <div class="saved-empty">
        아직 저장된 시나리오가 없습니다. 시뮬레이션 결과 화면에서 <strong>💾 저장</strong> 버튼을 눌러 보관할 수 있습니다.
      </div>
    `;
  }

  const cards = items.map(item => {
    const c1 = item.result?.summary?.case1GrandTotal ?? item.result?.summary?.case1Total ?? 0;
    const c2 = item.result?.summary?.case2GrandTotal ?? item.result?.summary?.case2Total ?? 0;
    const winner = c1 <= c2
      ? (item.result?.case1?.label || 'Case 1')
      : (item.result?.case2?.label || 'Case 2');
    return `
      <div class="saved-card" data-id="${esc(item.id)}">
        <div class="saved-card-head">
          <h4 class="saved-card-name" title="${esc(item.name)}">${esc(item.name)}</h4>
          <div class="saved-card-meta">
            <span class="saved-badge">시나리오 ${item.scenarioId}</span>
            <span class="saved-date">${fmtDate(item.createdAt)}</span>
          </div>
        </div>
        <div class="saved-card-body">
          <div class="saved-scenario">${esc(item.scenarioTitle)}</div>
          <div class="saved-summary">
            <span class="saved-winner">유리: ${esc(winner)}</span>
            <span class="saved-amount">${wonStr(Math.min(c1, c2))}</span>
          </div>
        </div>
        <div class="saved-card-actions">
          <button type="button" class="saved-act primary" data-act="open"   data-id="${esc(item.id)}">열기</button>
          <button type="button" class="saved-act"         data-act="rename" data-id="${esc(item.id)}">이름변경</button>
          <button type="button" class="saved-act danger"  data-act="delete" data-id="${esc(item.id)}">삭제</button>
        </div>
      </div>
    `;
  }).join('');

  return `
    <h3 class="saved-title">📂 저장된 시나리오 <span class="saved-count">${count}</span></h3>
    ${toolbar}
    <div class="saved-grid">${cards}</div>
  `;
}

/**
 * 저장 섹션의 이벤트 바인딩 (홈 렌더 후 호출)
 * @param {Function} onOpen   (id) => void  카드 열기 콜백
 * @param {Function} [onChange] 변경(삭제/이름변경/import) 후 재렌더 콜백
 */
export function bindSavedSection(onOpen, onChange) {
  // 카드 액션
  document.querySelectorAll('.saved-act').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      const { act, id } = btn.dataset;
      if (act === 'open') {
        onOpen(id);
      } else if (act === 'rename') {
        const cur = listScenarios().find(x => x.id === id);
        const next = prompt('새 이름을 입력하세요:', cur?.name || '');
        if (next != null && next.trim()) {
          renameScenario(id, next);
          onChange?.();
        }
      } else if (act === 'delete') {
        if (confirm('이 시나리오를 삭제할까요? 되돌릴 수 없습니다.')) {
          deleteScenario(id);
          onChange?.();
        }
      }
    });
  });

  // 카드 본문 클릭(액션 영역 외) → 열기
  document.querySelectorAll('.saved-card').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.closest('.saved-card-actions')) return;
      onOpen(card.dataset.id);
    });
  });

  // JSON 내보내기
  document.getElementById('saved-export-btn')?.addEventListener('click', () => {
    if (countScenarios() === 0) return;
    exportAllToJSON();
  });

  // JSON 불러오기
  const fileInput = document.getElementById('saved-import-file');
  document.getElementById('saved-import-btn')?.addEventListener('click', () => {
    fileInput?.click();
  });
  fileInput?.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    const mode = confirm(
      '"확인" → 기존 시나리오에 병합 (중복 ID 제외)\n"취소" → 전체 덮어쓰기 (주의: 기존 데이터 삭제)'
    ) ? 'merge' : 'replace';
    try {
      const { added, total } = await importFromJSON(file, { mode });
      alert(`불러오기 완료\n추가: ${added}건 · 전체: ${total}건`);
      onChange?.();
    } catch (err) {
      alert('불러오기 실패: ' + err.message);
    } finally {
      fileInput.value = '';
    }
  });
}
