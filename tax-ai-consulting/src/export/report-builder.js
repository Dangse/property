/**
 * 시나리오 결과 → 정식 보고서 HTML 생성
 *
 * Word(.doc) export와 PDF(print) export가 모두 사용하는 공통 빌더.
 * 출력 HTML은 인라인 스타일 위주로 작성 — Word/Print 호환성 확보.
 */

import { wonStr, wonKo } from '../ui/formatter.js';

const TODAY = () => {
  const d = new Date();
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
};

/**
 * 입력값 라벨 (한국어)
 */
const INPUT_LABELS = {
  marketPrice:       '시가',
  officialPrice:     '기준시가',
  basePrice:         '취득가액',
  loanPrice:         '승계대출(전세보증금+담보대출)',
  holdPeriod:        '보유기간 (년)',
  stayPeriod:        '거주기간 (년)',
  holdOfficialPrice: '계속보유주택 기준시가',
  holdPeriod2:       '계속보유주택 보유기간',
  space:             '전용면적코드',
  heavy:             '조정대상지역 여부',
  ownerAge:          '소유자 연령',
  childAge:          '자녀 연령',
  spouseAge:         '배우자 연령',
  partRate:          '증여 지분 비율',
  ownerRate:         '소유자 지분 비율',
};

const REPORT_CSS = `
  body { font-family: 'Malgun Gothic', '맑은 고딕', sans-serif; color: #1f2937; line-height: 1.6; }
  .report-cover { text-align: center; padding: 60px 0 40px; border-bottom: 3px double #1a56db; margin-bottom: 30px; }
  .report-cover h1 { font-size: 26pt; color: #1a56db; margin: 0 0 10px; }
  .report-cover .scenario { font-size: 16pt; color: #374151; margin: 8px 0; }
  .report-cover .meta { font-size: 11pt; color: #6b7280; margin-top: 20px; }
  .report-section { margin: 28px 0; page-break-inside: avoid; }
  .report-section h2 { font-size: 16pt; color: #1a56db; border-left: 4px solid #1a56db; padding-left: 10px; margin: 0 0 14px; }
  .report-section h3 { font-size: 13pt; color: #374151; margin: 16px 0 8px; }
  .report-table { width: 100%; border-collapse: collapse; margin: 8px 0 16px; font-size: 11pt; }
  .report-table th, .report-table td { border: 1px solid #d1d5db; padding: 7px 10px; text-align: left; vertical-align: top; }
  .report-table th { background: #f3f4f6; font-weight: 700; }
  .report-table td.num { text-align: right; font-variant-numeric: tabular-nums; }
  .report-summary { background: #eef4ff; border: 1px solid #c7d7f3; border-radius: 6px; padding: 14px 18px; margin-bottom: 14px; }
  .report-summary .winner { font-size: 14pt; font-weight: 700; color: #1a56db; }
  .report-summary .saving { font-size: 12pt; color: #16a34a; margin-top: 4px; }
  .report-laws { font-size: 11pt; }
  .report-laws li { margin: 4px 0; }
  .report-disclaimer { font-size: 10pt; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 12px; margin-top: 30px; line-height: 1.5; }
  .report-footer { text-align: center; font-size: 9pt; color: #9ca3af; margin-top: 20px; }
  .pos { color: #16a34a; }
  .neg { color: #dc2626; }
`;

function escHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function fmtInput(key, val) {
  if (val === undefined || val === null || val === '') return '-';
  if (key.endsWith('Price') || key === 'basePrice') return wonStr(val);
  if (key === 'partRate' || key === 'ownerRate') return `${(val * 100).toFixed(0)}%`;
  if (key === 'heavy') return val ? '조정대상지역' : '비조정지역';
  if (key === 'space') {
    return { 0: '40㎡ 이하', 1: '60㎡ 이하', 2: '85㎡ 이하', 3: '85㎡ 초과' }[val] || String(val);
  }
  if (typeof val === 'number') return `${val}`;
  return escHtml(val);
}

function buildInputsTable(inputs) {
  if (!inputs) return '';
  const rows = [];
  for (const [k, label] of Object.entries(INPUT_LABELS)) {
    if (inputs[k] === undefined) continue;
    rows.push(`<tr><th style="width:35%">${label}</th><td>${fmtInput(k, inputs[k])}</td></tr>`);
  }
  return `<table class="report-table">${rows.join('')}</table>`;
}

function buildCaseDetail(label, c) {
  const rows = [];
  if (c.sellerTotal > 0 || c.sellerTransferTax > 0) {
    rows.push(`<tr><td>양도소득세</td><td class="num">${wonStr(c.sellerTransferTax)}</td></tr>`);
    rows.push(`<tr><td>지방소득세</td><td class="num">${wonStr(c.sellerLocalTax)}</td></tr>`);
    rows.push(`<tr><th>양도자 세금 합계</th><td class="num"><strong>${wonStr(c.sellerTotal)}</strong></td></tr>`);
  }
  if (c.recipients?.length > 0) {
    c.recipients.forEach(r => {
      rows.push(`<tr><td>증여세 (${r.label})</td><td class="num">${wonStr(r.giftTax)}</td></tr>`);
      rows.push(`<tr><td>취득세 (${r.label})</td><td class="num">${wonStr(r.acqTax)}</td></tr>`);
    });
  } else if (c.recipientTotal > 0) {
    rows.push(`<tr><td>증여세</td><td class="num">${wonStr(c.recipientGiftTax)}</td></tr>`);
    rows.push(`<tr><td>취득세</td><td class="num">${wonStr(c.recipientAcqTax)}</td></tr>`);
  }
  if (c.recipientTotal > 0) {
    rows.push(`<tr><th>수증자 세금 합계</th><td class="num"><strong>${wonStr(c.recipientTotal)}</strong></td></tr>`);
  }
  rows.push(`<tr style="background:#fef9c3"><th>총 세금</th><td class="num"><strong>${wonStr(c.sellerTotal + c.recipientTotal)}</strong></td></tr>`);

  return `
    <h3>${escHtml(label)}</h3>
    <table class="report-table">
      <colgroup><col style="width:60%"><col></colgroup>
      ${rows.join('')}
    </table>
  `;
}

function buildHoldingTax(holdingTax) {
  if (!holdingTax) return '';
  const before = holdingTax.before?.grandTotal ?? holdingTax.before?.total ?? 0;
  const rows = [`<tr><th>처분 전</th><td class="num">${wonStr(before)}</td><td>-</td></tr>`];

  const addRow = (label, after) => {
    if (after == null) return;
    const total = after.grandTotal ?? after.total ?? 0;
    const diff  = total - before;
    const cls   = diff < 0 ? 'pos' : (diff > 0 ? 'neg' : '');
    const sign  = diff > 0 ? '+' : '';
    rows.push(`<tr><th>${label}</th><td class="num">${wonStr(total)}</td><td class="num ${cls}">${sign}${wonStr(diff)}</td></tr>`);
  };

  if (holdingTax.afterCase1) {
    addRow('Case 1 적용 후', holdingTax.afterCase1);
    addRow('Case 2 적용 후', holdingTax.afterCase2);
  } else if (holdingTax.after) {
    addRow('처분/증여 후', holdingTax.after);
  }

  return `
    <div class="report-section">
      <h2>3. 연간 보유세 변화 (재산세 + 종부세)</h2>
      <table class="report-table">
        <thead><tr><th style="width:35%">시점</th><th style="width:32%">연간 보유세</th><th>변동</th></tr></thead>
        <tbody>${rows.join('')}</tbody>
      </table>
    </div>
  `;
}

function buildLaws(lawRef) {
  if (!lawRef || lawRef.length === 0) return '';
  const items = lawRef.map(l => `<li>${escHtml(l)}</li>`).join('');
  return `
    <div class="report-section">
      <h2>4. 관련 법령</h2>
      <ul class="report-laws">${items}</ul>
    </div>
  `;
}

/**
 * 보고서 HTML 본문 생성 (Word/PDF 공통 사용)
 * @param {object} result 시나리오 결과
 * @returns {{ title: string, bodyHtml: string, css: string }}
 */
export function buildReportParts(result) {
  const { title, inputs, case1, case2, holdingTax, summary, lawRef } = result;
  const c1Total = summary.case1GrandTotal ?? summary.case1Total ?? 0;
  const c2Total = summary.case2GrandTotal ?? summary.case2Total ?? 0;
  const diff    = c1Total - c2Total;
  const winner  = diff === 0 ? '동일' : (diff > 0 ? case2.label : case1.label);
  const saving  = Math.abs(diff);

  const reportTitle = `부동산 세금 시뮬레이션 보고서 — ${title}`;

  const bodyHtml = `
    <div class="report-cover">
      <h1>부동산 세금 시뮬레이션 보고서</h1>
      <div class="scenario">${escHtml(title)}</div>
      <div class="meta">
        작성일: ${TODAY()}<br>
        작성: Tuzaga AI Tax Advisor
      </div>
    </div>

    <div class="report-section">
      <h2>1. 요약 결론</h2>
      <div class="report-summary">
        <div class="winner">유리한 방안: ${escHtml(winner)}</div>
        ${diff !== 0 ? `<div class="saving">예상 절감액: ${wonKo(saving)} (${wonStr(saving)})</div>` : ''}
      </div>
      <table class="report-table">
        <thead><tr><th>구분</th><th>총 세금</th></tr></thead>
        <tbody>
          <tr><th>${escHtml(case1.label || 'Case 1')}</th><td class="num">${wonStr(c1Total)}</td></tr>
          <tr><th>${escHtml(case2.label || 'Case 2')}</th><td class="num">${wonStr(c2Total)}</td></tr>
        </tbody>
      </table>

      <h3>주요 입력값</h3>
      ${buildInputsTable(inputs)}
    </div>

    <div class="report-section">
      <h2>2. 케이스별 세부 내역</h2>
      ${buildCaseDetail(case1.label || 'Case 1', case1)}
      ${buildCaseDetail(case2.label || 'Case 2', case2)}
    </div>

    ${buildHoldingTax(holdingTax)}
    ${buildLaws(lawRef)}

    <div class="report-disclaimer">
      <strong>⚠ 면책 조항</strong><br>
      본 보고서의 세금 계산은 입력하신 정보와 일반적인 세법 규정을 기반으로 한 추정치이며, 실제 신고 시 세액과 차이가 있을 수 있습니다.
      개별 상황에 따라 비과세·감면·가산세 등이 달리 적용될 수 있으므로, 최종 의사결정 전 반드시 세무사 등 전문가의 검토를 받으시기 바랍니다.
      세법 및 시행령은 정책에 따라 변동될 수 있으며, 본 보고서는 작성일 기준 규정을 적용하였습니다.
    </div>

    <div class="report-footer">
      Tuzaga AI Tax Advisor · 본 보고서는 자동 생성되었습니다
    </div>
  `;

  return { title: reportTitle, bodyHtml, css: REPORT_CSS };
}
