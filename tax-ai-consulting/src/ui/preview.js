/**
 * 보고서 미리보기 + Word(.docx) 다운로드
 *
 * Chat에서 한 턴이 끝날 때마다 addTurn() 으로 turns 누적.
 * 사용자는 출력 모드(요약/근거포함/전체)를 선택해 docx 로 다운로드.
 */

import { downloadReport } from '../export/docx-export.js';
import { renderReview } from './review-panel.js';

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

export function mountPreview({ container, getClientInfo, office = {} }) {
  const turns = [];

  container.innerHTML = `
    <h3>보고서 초안</h3>
    <div class="preview-controls">
      <label>출력 모드
        <select id="export-mode">
          <option value="summary">요약</option>
          <option value="with-basis" selected>근거 포함</option>
          <option value="full">전체</option>
        </select>
      </label>
      <button id="export-btn" disabled>📄 Word 다운로드</button>
      <button id="clear-btn">초기화</button>
    </div>
    <div id="report-body" class="report-body">
      <em class="placeholder">대화가 진행되면 여기에 누적됩니다.</em>
    </div>
  `;

  const body = container.querySelector('#report-body');
  const modeSel = container.querySelector('#export-mode');
  const exportBtn = container.querySelector('#export-btn');
  const clearBtn = container.querySelector('#clear-btn');

  function renderTurn(turn, idx) {
    const reviewHtml = turn.review ? renderReview(turn.review) : '';
    return `
      <section class="turn">
        <h4>Q${idx + 1}. ${escapeHtml(turn.question).slice(0, 200)}</h4>
        <div class="answer">${escapeHtml(turn.answer).slice(0, 800)}</div>
        ${reviewHtml}
      </section>
    `;
  }

  function repaint() {
    if (turns.length === 0) {
      body.innerHTML = '<em class="placeholder">대화가 진행되면 여기에 누적됩니다.</em>';
      exportBtn.disabled = true;
    } else {
      body.innerHTML = turns.map(renderTurn).join('');
      exportBtn.disabled = false;
    }
  }

  exportBtn.addEventListener('click', async () => {
    exportBtn.disabled = true;
    const originalText = exportBtn.textContent;
    exportBtn.textContent = '생성 중…';
    try {
      const result = await downloadReport({
        clientInfo: getClientInfo?.() ?? {},
        turns,
        mode: modeSel.value,
        office,
      });
      exportBtn.textContent = `✅ ${result.fileName.slice(0, 30)}…`;
      setTimeout(() => { exportBtn.textContent = originalText; }, 2500);
    } catch (err) {
      exportBtn.textContent = '❌ 실패';
      alert(`보고서 생성 실패: ${err.message}`);
      setTimeout(() => { exportBtn.textContent = originalText; }, 2500);
    } finally {
      exportBtn.disabled = false;
    }
  });

  clearBtn.addEventListener('click', () => {
    if (turns.length && !confirm('보고서 초안을 모두 지울까요?')) return;
    turns.length = 0;
    repaint();
  });

  return {
    addTurn(turn) {
      turns.push(turn);
      repaint();
    },
    getTurns() { return [...turns]; },
    clear() { turns.length = 0; repaint(); },
  };
}

export const PREVIEW_CSS = `
.preview-controls { display:flex; gap:6px; align-items:center; flex-wrap:wrap; margin-bottom:10px; font-size:0.78rem; }
.preview-controls label { display:flex; align-items:center; gap:4px; }
.preview-controls select { padding:3px 6px; border:1px solid #d1d5db; border-radius:3px; font-size:0.78rem; }
.preview-controls button {
  padding:5px 10px; background:#1f2937; color:#fff; border:none; border-radius:3px; cursor:pointer; font-size:0.78rem;
}
.preview-controls button:disabled { background:#9ca3af; cursor:not-allowed; }
.preview-controls #clear-btn { background:#6b7280; }
.report-body .placeholder { color:#9ca3af; font-style:italic; }
.report-body section.turn { padding:8px 0; border-bottom:1px solid #e5e7eb; margin-bottom:10px; }
.report-body section.turn h4 { margin:0 0 4px; font-size:0.85rem; color:#1f2937; }
.report-body section.turn .answer { font-size:0.78rem; color:#4b5563; line-height:1.5; white-space:pre-wrap; }
`;
