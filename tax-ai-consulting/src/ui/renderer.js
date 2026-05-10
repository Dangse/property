/**
 * UI 렌더러 — 폼 HTML 생성 + 결과 HTML 생성
 */

import { SCENARIO_META, SCENARIO_FORMS } from './forms.js';
import { wonStr, wonKo, diffStr, savingStr } from './formatter.js';

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Home ──────────────────────────────────────────────────────
export function renderHomeHTML() {
  const cards = SCENARIO_META.map(m => `
    <div class="scenario-card" data-id="${m.id}">
      <div class="num">${m.id}</div>
      <div class="info">
        <h3>${m.title.replace(/\n/g, '<br>')}</h3>
        <p>${m.sub}</p>
      </div>
    </div>
  `).join('');

  return `
    <h2 class="page-title">부동산 세금 절세 시나리오</h2>
    <p class="page-sub">증여·양도·보유세를 비교해 최적의 절세 방법을 안내합니다. 해당하는 시나리오를 선택하세요.</p>
    <div id="scenario-grid">${cards}</div>
  `;
}

// ── Form ──────────────────────────────────────────────────────
export function renderScenarioHTML(id) {
  const meta = SCENARIO_META.find(m => m.id === id);
  const form = SCENARIO_FORMS[id];
  if (!meta || !form) return '<p>시나리오를 찾을 수 없습니다.</p>';

  const sectionsHTML = form.sections.map(sec =>
    sec.type === 'recipients' ? renderRecipientsSection(sec) : renderFormSection(sec)
  ).join('');

  return `
    <button class="back-btn" id="back-btn">← 목록으로</button>
    <h2 class="page-title">${meta.title.replace(/\n/g, ' ')}</h2>
    <p class="page-sub">${meta.sub}</p>

    <div class="sample-bar">
      <span>샘플 데이터로 빠르게 확인</span>
      <button type="button" id="sample-btn">샘플값 입력</button>
    </div>

    <form id="scenario-form">
      ${sectionsHTML}
      <button type="submit" class="submit-btn">세금 계산하기 →</button>
    </form>

    <div id="result-section" style="display:none;"></div>
  `;
}

function renderFormSection(sec) {
  const fieldsHTML = sec.fields.map(f => renderField(f)).join('');
  return `
    <div class="form-card">
      <div class="form-section-title">${esc(sec.title)}</div>
      <div class="form-row">${fieldsHTML}</div>
    </div>
  `;
}

function renderField(f) {
  const tip = f.tip
    ? ` <span class="tooltip-icon" title="${esc(f.tip)}">ⓘ</span>`
    : '';

  if (f.type === 'select') {
    const opts = f.options.map(o =>
      `<option value="${esc(o.value)}">${esc(o.label)}</option>`
    ).join('');
    return `
      <div class="form-group">
        <label class="field-label" for="${f.id}">${esc(f.label)}${tip}</label>
        <div class="input-wrap">
          <select id="${f.id}" name="${f.id}">${opts}</select>
        </div>
      </div>
    `;
  }

  const unit = { money: '원', year: '년', age: '세', percent: '%' }[f.type] ?? '';
  const dataType = f.type === 'money' ? 'money' : 'num';

  return `
    <div class="form-group">
      <label class="field-label" for="${f.id}">${esc(f.label)}${tip}</label>
      <div class="input-wrap">
        <input type="text" id="${f.id}" name="${f.id}" data-type="${dataType}"
               inputmode="${f.type === 'money' ? 'numeric' : 'decimal'}" autocomplete="off">
        <span class="input-unit">${unit}</span>
      </div>
    </div>
  `;
}

function renderRecipientsSection(sec) {
  const rows = sec.rows.map(r => {
    const optLabel = r.optional ? ' <small style="color:#94a3b8;font-weight:400">(선택)</small>' : '';
    return `
      <tr>
        <td>${esc(r.label)}${optLabel}</td>
        <td>
          <input type="text" id="${r.priceId}" name="${r.priceId}"
                 data-type="money" inputmode="numeric" placeholder="0" autocomplete="off">
        </td>
        <td>
          <input type="text" id="${r.ageId}" name="${r.ageId}"
                 data-type="num" inputmode="numeric" placeholder="0" autocomplete="off"
                 style="max-width:80px">
        </td>
      </tr>
    `;
  }).join('');

  return `
    <div class="form-card">
      <div class="form-section-title">${esc(sec.title)}</div>
      <table class="recipients-table">
        <thead>
          <tr><th>구분</th><th>지분 금액 (원)</th><th>나이 (세)</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

// ── Result ────────────────────────────────────────────────────
export function renderResultHTML(result) {
  const c1Total = result.summary.case1GrandTotal ?? result.summary.case1Total ?? 0;
  const c2Total = result.summary.case2GrandTotal ?? result.summary.case2Total ?? 0;
  const saving  = c1Total - c2Total;
  const c1Wins  = c1Total <= c2Total;

  const c1Label = result.case1.label ?? 'Case 1';
  const c2Label = result.case2.label ?? 'Case 2';

  const summaryHTML = `
    <div class="summary-box">
      <div class="summary-item ${c1Wins ? 'winner' : 'loser'}">
        <div class="label">Case 1 · ${esc(c1Label)}</div>
        <div class="amount">${wonKo(c1Total)}</div>
        <div class="sub">${c1Wins ? '✓ 유리한 방법' : '✗ 불리한 방법'}</div>
      </div>
      <div class="summary-item ${c1Wins ? 'loser' : 'winner'}">
        <div class="label">Case 2 · ${esc(c2Label)}</div>
        <div class="amount">${wonKo(c2Total)}</div>
        <div class="sub">${c1Wins ? '✗ 불리한 방법' : '✓ 유리한 방법'}</div>
      </div>
    </div>
    ${Math.abs(saving) > 0
      ? `<div class="saving-banner">
           ${savingStr(saving)} —
           <strong>${esc(c1Wins ? c1Label : c2Label)}</strong>이(가) 더 유리합니다.
         </div>`
      : '<div class="saving-banner">두 방법의 세금이 동일합니다.</div>'
    }
  `;

  const case1HTML = renderCaseTable(result.case1, 1);
  const case2HTML = renderCaseTable(result.case2, 2);
  const holdingHTML = renderHoldingTaxHTML(result.holdingTax, c1Label, c2Label);
  const lawHTML = result.lawRef?.length
    ? `<div class="result-card">
         <h4>관련 법령</h4>
         <ul style="padding-left:20px;font-size:13px;line-height:2.2;color:var(--text-muted)">
           ${result.lawRef.map(l => `<li>${esc(l)}</li>`).join('')}
         </ul>
       </div>`
    : '';

  return `
    <div class="print-bar">
      <button type="button" class="primary" onclick="window.print()">🖨 인쇄 / PDF 저장</button>
    </div>

    <div class="report-header">
      <h2>${esc(result.title)}</h2>
      <div class="date">계산일: ${new Date().toLocaleDateString('ko-KR')}</div>
    </div>

    <div class="report-disclaimer">
      ※ 본 계산 결과는 입력하신 정보를 바탕으로 한 참고용 추정치입니다.
      실제 세금은 개별 사정에 따라 달라질 수 있으므로, 중요한 의사결정 전
      반드시 세무전문가와 상담하시기 바랍니다.
    </div>

    <div class="result-card">
      <h4>비교 요약</h4>
      ${summaryHTML}
    </div>

    ${case1HTML}
    ${case2HTML}
    ${holdingHTML}
    ${lawHTML}
  `;
}

// ── Case table ────────────────────────────────────────────────
function renderCaseTable(c, caseNum) {
  const label = c.label ?? `Case ${caseNum}`;

  // Simple pattern (sc3, sc9 style): giftTax + acqTax + total, no seller split
  const isSimple = c.giftTax !== undefined && c.sellerTotal === undefined;

  if (isSimple) {
    return renderSimpleCaseTable(c, caseNum, label);
  }

  return renderStandardCaseTable(c, caseNum, label);
}

function renderSimpleCaseTable(c, caseNum, label) {
  const total = c.total ?? c.grandTotal ?? 0;
  const hasRecipients = c.recipients?.length > 0;

  let recipientRows = '';
  let recipientBreakdown = '';

  if (hasRecipients) {
    recipientRows = c.recipients.map(r =>
      `<tr>
         <td>└ ${esc(r.label)}</td>
         <td class="num-cell">${wonStr(r.giftTax)}</td>
         <td class="num-cell">${wonStr(r.acqTax)}</td>
         <td class="num-cell">${wonStr((r.giftTax ?? 0) + (r.acqTax ?? 0))}</td>
       </tr>`
    ).join('');

    recipientBreakdown = `
      <table class="result-table" style="margin-top:0">
        <thead>
          <tr><th>수증자</th><th>증여세</th><th>취득세</th><th>소계</th></tr>
        </thead>
        <tbody>
          ${recipientRows}
          <tr class="total-row">
            <td>합 계</td>
            <td class="num-cell">${wonStr(c.giftTax)}</td>
            <td class="num-cell">${wonStr(c.acqTax)}</td>
            <td class="num-cell">${wonStr(total)}</td>
          </tr>
        </tbody>
      </table>
    `;

    return `
      <div class="result-card">
        <h4>Case ${caseNum}: ${esc(label)}</h4>
        ${recipientBreakdown}
      </div>
    `;
  }

  return `
    <div class="result-card">
      <h4>Case ${caseNum}: ${esc(label)}</h4>
      <table class="result-table">
        <thead><tr><th>구분</th><th>세액</th></tr></thead>
        <tbody>
          <tr><td>증여세</td><td class="num-cell">${wonStr(c.giftTax)}</td></tr>
          <tr><td>취득세</td><td class="num-cell">${wonStr(c.acqTax)}</td></tr>
          <tr class="total-row"><td>합 계</td><td class="num-cell">${wonStr(total)}</td></tr>
        </tbody>
      </table>
    </div>
  `;
}

function renderStandardCaseTable(c, caseNum, label) {
  const grandTotal  = c.grandTotal ?? ((c.sellerTotal ?? 0) + (c.recipientTotal ?? 0));
  const showSeller   = (c.sellerTotal ?? 0) > 0;
  const showRecipient = (c.recipientTotal ?? 0) > 0;

  let rows = '';
  if (showSeller) {
    rows += `
      <tr><td>양도소득세</td><td class="num-cell">${wonStr(c.sellerTransferTax)}</td></tr>
      <tr><td>지방소득세</td><td class="num-cell">${wonStr(c.sellerLocalTax)}</td></tr>
      <tr class="sub-total"><td>소유자 소계</td><td class="num-cell">${wonStr(c.sellerTotal)}</td></tr>
    `;
  }
  if (showRecipient) {
    rows += `
      <tr><td>증여세</td><td class="num-cell">${wonStr(c.recipientGiftTax)}</td></tr>
      <tr><td>취득세</td><td class="num-cell">${wonStr(c.recipientAcqTax)}</td></tr>
      <tr class="sub-total"><td>수증자 소계</td><td class="num-cell">${wonStr(c.recipientTotal)}</td></tr>
    `;
  }
  if (!showSeller && !showRecipient) {
    rows = `
      <tr><td>증여세</td><td class="num-cell">${wonStr(c.recipientGiftTax ?? 0)}</td></tr>
      <tr><td>취득세</td><td class="num-cell">${wonStr(c.recipientAcqTax ?? 0)}</td></tr>
    `;
  }

  // Recipients breakdown (sc4, sc10)
  let recBreakdown = '';
  if (c.recipients?.length > 0) {
    const hasLoan = c.recipients.some(r => r.partLoan !== undefined);
    const loanTh  = hasLoan ? '<th>승계대출</th>' : '';
    const recRows = c.recipients.map(r => {
      const loanTd = hasLoan
        ? `<td class="num-cell">${wonStr(r.partLoan ?? 0)}</td>`
        : '';
      return `<tr>
        <td>${esc(r.label)}</td>
        ${loanTd}
        <td class="num-cell">${wonStr(r.giftTax)}</td>
        <td class="num-cell">${wonStr(r.acqTax)}</td>
        <td class="num-cell">${wonStr((r.giftTax ?? 0) + (r.acqTax ?? 0))}</td>
      </tr>`;
    }).join('');

    recBreakdown = `
      <p style="font-size:12px;color:var(--text-muted);margin:14px 0 6px">수증자별 세금 내역</p>
      <table class="result-table">
        <thead><tr><th>수증자</th>${loanTh}<th>증여세</th><th>취득세</th><th>소계</th></tr></thead>
        <tbody>${recRows}</tbody>
      </table>
    `;
  }

  return `
    <div class="result-card">
      <h4>Case ${caseNum}: ${esc(label)}</h4>
      <table class="result-table">
        <thead><tr><th>구분</th><th>세액</th></tr></thead>
        <tbody>
          ${rows}
          <tr class="total-row"><td>합 계</td><td class="num-cell">${wonStr(grandTotal)}</td></tr>
        </tbody>
      </table>
      ${recBreakdown}
    </div>
  `;
}

// ── Holding tax ───────────────────────────────────────────────
function htTotal(obj) {
  return obj?.grandTotal ?? obj?.total ?? 0;
}

function renderHoldingTaxHTML(ht, c1Label, c2Label) {
  if (!ht) return '';

  const beforeTotal = htTotal(ht.before);

  if (ht.afterCase1 !== undefined) {
    // Multi-case: before / afterCase1 / afterCase2
    const a1 = ht.afterCase1;
    const a2 = ht.afterCase2;
    const a1Total = htTotal(a1);
    const a2Total = htTotal(a2);
    const change1 = ht.changeCase1 ?? (a1Total - beforeTotal);
    const change2 = ht.changeCase2 ?? (a2Total - beforeTotal);

    const bOwner  = ht.before.ownerTotal
      ?? ((ht.before.ownerPropertyTax ?? 0) + (ht.before.ownerAggrTax ?? 0))
      ?? beforeTotal;
    const a1Owner = a1.ownerTotal
      ?? ((a1.ownerPropertyTax ?? 0) + (a1.ownerAggrTax ?? 0));
    const a2Owner = a2.ownerTotal
      ?? ((a2.ownerPropertyTax ?? 0) + (a2.ownerAggrTax ?? 0));
    const a1Rec   = a1.recipientTotal ?? a1.spouseTotal
      ?? ((a1.recipientPropertyTax ?? 0) + (a1.recipientAggrTax ?? 0));
    const a2Rec   = a2.recipientTotal ?? a2.spouseTotal
      ?? ((a2.recipientPropertyTax ?? 0) + (a2.recipientAggrTax ?? 0));

    return `
      <div class="result-card">
        <h4>연간 보유세 변화 (재산세 + 종합부동산세)</h4>
        <table class="result-table">
          <thead>
            <tr>
              <th>구분</th>
              <th>처분 전</th>
              <th>Case 1 후<br><small style="font-weight:400">${esc(c1Label)}</small></th>
              <th>Case 2 후<br><small style="font-weight:400">${esc(c2Label)}</small></th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>소유자</td>
              <td class="num-cell">${wonStr(bOwner)}</td>
              <td class="num-cell">${wonStr(a1Owner)}</td>
              <td class="num-cell">${wonStr(a2Owner)}</td>
            </tr>
            <tr>
              <td>수증자·배우자</td>
              <td class="num-cell">—</td>
              <td class="num-cell">${wonStr(a1Rec)}</td>
              <td class="num-cell">${wonStr(a2Rec)}</td>
            </tr>
            <tr class="sub-total">
              <td>합 계</td>
              <td class="num-cell">${wonStr(beforeTotal)}</td>
              <td class="num-cell">${wonStr(a1Total)}</td>
              <td class="num-cell">${wonStr(a2Total)}</td>
            </tr>
            <tr>
              <td>전년 대비</td>
              <td class="num-cell">—</td>
              <td class="num-cell">${diffStr(change1)}</td>
              <td class="num-cell">${diffStr(change2)}</td>
            </tr>
          </tbody>
        </table>
        <p style="font-size:11px;color:var(--text-muted);margin-top:8px">※ 당해연도 연간 보유세 기준 추정치입니다.</p>
      </div>
    `;
  }

  if (ht.after !== undefined) {
    // Single after: before / after
    const afterTotal  = htTotal(ht.after);
    const change      = ht.change ?? (afterTotal - beforeTotal);
    const bOwner      = ht.before.ownerTotal  ?? beforeTotal;
    const bSpouse     = ht.before.spouseTotal  ?? 0;
    const aOwner      = ht.after.ownerTotal    ?? 0;
    const aSpouse     = ht.after.spouseTotal   ?? ht.after.recipientTotal ?? 0;

    return `
      <div class="result-card">
        <h4>연간 보유세 변화 (재산세 + 종합부동산세)</h4>
        <table class="result-table">
          <thead>
            <tr><th>구분</th><th>증여 전</th><th>증여 후</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>소유자</td>
              <td class="num-cell">${wonStr(bOwner)}</td>
              <td class="num-cell">${aOwner > 0 ? wonStr(aOwner) : '—'}</td>
            </tr>
            <tr>
              <td>배우자·수증자</td>
              <td class="num-cell">${bSpouse > 0 ? wonStr(bSpouse) : '—'}</td>
              <td class="num-cell">${wonStr(aSpouse)}</td>
            </tr>
            <tr class="sub-total">
              <td>합 계</td>
              <td class="num-cell">${wonStr(beforeTotal)}</td>
              <td class="num-cell">${wonStr(afterTotal)}</td>
            </tr>
            <tr>
              <td>전년 대비</td>
              <td class="num-cell">—</td>
              <td class="num-cell">${diffStr(change)}</td>
            </tr>
          </tbody>
        </table>
        <p style="font-size:11px;color:var(--text-muted);margin-top:8px">※ 당해연도 연간 보유세 기준 추정치입니다.</p>
      </div>
    `;
  }

  return '';
}
