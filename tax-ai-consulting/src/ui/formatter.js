/**
 * 숫자 포맷 유틸리티
 */

/** 원화 표시 (1,234,567원) */
export function wonStr(n) {
  if (!n && n !== 0) return '—';
  return Math.floor(n).toLocaleString('ko-KR') + '원';
}

/** 한국어 단위 (1억 2천만원) */
export function wonKo(n) {
  if (!n && n !== 0) return '—';
  n = Math.floor(n);
  const uk  = Math.floor(n / 100_000_000);
  const man = Math.floor((n % 100_000_000) / 10_000);
  const won = n % 10_000;
  let parts = [];
  if (uk  > 0) parts.push(`${uk}억`);
  if (man > 0) parts.push(`${man}만`);
  if (won > 0 && uk === 0) parts.push(`${won.toLocaleString()}`);
  return parts.length ? parts.join(' ') + '원' : '0원';
}

/** 증감 표시 (+/- 접두사) */
export function diffStr(n) {
  if (!n) return '<span class="zero">변동없음</span>';
  const abs = Math.abs(Math.floor(n));
  const str = abs.toLocaleString('ko-KR') + '원';
  return n < 0
    ? `<span class="pos">▼ ${str} 감소</span>`
    : `<span class="neg">▲ ${str} 증가</span>`;
}

/** 없음/0원 표시 */
export function wonOrNone(n) {
  if (!n || n === 0) return '<span class="zero">없음</span>';
  return wonStr(n);
}

/** 입력 문자열 → 숫자 (쉼표 제거) */
export function parseInput(str) {
  if (!str) return 0;
  return parseFloat(str.replace(/,/g, '')) || 0;
}

/** 숫자 → 쉼표 포맷 문자열 */
export function commaStr(n) {
  if (!n && n !== 0) return '';
  return Math.floor(n).toLocaleString('ko-KR');
}

/** 절약 표시 */
export function savingStr(saving) {
  if (saving > 0) return `<span class="pos">Case 1보다 <strong>${wonKo(saving)}</strong> 절약</span>`;
  if (saving < 0) return `<span class="neg">Case 1보다 <strong>${wonKo(-saving)}</strong> 더 발생</span>`;
  return '동일';
}
