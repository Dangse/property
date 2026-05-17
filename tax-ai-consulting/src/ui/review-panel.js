/**
 * 국세청 검토 결과 렌더링
 *
 * Reviewer 가 반환한 구조화 JSON을 보고서 섹션 HTML로 변환.
 * 리스크 등급은 색상 배지로 표시.
 */

const RISK_STYLES = {
  '낮음': { bg: '#d1fae5', fg: '#065f46', icon: '✅' },
  '중간': { bg: '#fef3c7', fg: '#92400e', icon: '⚠️' },
  '높음': { bg: '#fee2e2', fg: '#991b1b', icon: '🚨' },
};

const SEVERITY_BADGE = {
  '정보': { bg: '#dbeafe', fg: '#1e40af' },
  '주의': { bg: '#fef3c7', fg: '#92400e' },
  '경고': { bg: '#fee2e2', fg: '#991b1b' },
};

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

export function renderReview(review) {
  if (!review) return '';
  const style = RISK_STYLES[review.riskLevel] ?? RISK_STYLES['중간'];

  const findingsHtml = (review.findings ?? []).map(f => {
    const sb = SEVERITY_BADGE[f.severity] ?? SEVERITY_BADGE['주의'];
    return `
      <li class="finding">
        <span class="sev-badge" style="background:${sb.bg};color:${sb.fg}">${escapeHtml(f.severity)}</span>
        <strong>${escapeHtml(f.title)}</strong>
        ${f.lawRef ? `<span class="lawref">${escapeHtml(f.lawRef)}</span>` : ''}
        <div class="detail">${escapeHtml(f.detail)}</div>
      </li>
    `;
  }).join('');

  const precedentsHtml = (review.precedents ?? []).length ? `
    <details class="precedents-box">
      <summary>📚 인용 판례·예규 (${review.precedents.length}건)</summary>
      <ul>
        ${review.precedents.map(p => `
          <li>
            <strong>${escapeHtml(p.citation)}</strong>
            ${p.source ? `<span class="src">(${escapeHtml(p.source)})</span>` : ''}
            ${p.url ? `<a href="${escapeHtml(p.url)}" target="_blank">↗</a>` : ''}
            <div class="relevance">${escapeHtml(p.relevance)}</div>
          </li>
        `).join('')}
      </ul>
    </details>
  ` : '';

  const recsHtml = (review.recommendations ?? []).length ? `
    <div class="recommendations">
      <strong>💡 실무 권고</strong>
      <ul>${review.recommendations.map(r => `<li>${escapeHtml(r)}</li>`).join('')}</ul>
    </div>
  ` : '';

  return `
    <div class="review-section">
      <div class="review-header" style="background:${style.bg};color:${style.fg}">
        ${style.icon} 국세청 검토 — 리스크 <strong>${escapeHtml(review.riskLevel)}</strong>
        ${review.cached ? '<span class="cached-tag">캐시</span>' : ''}
      </div>
      <p class="summary">${escapeHtml(review.summary)}</p>
      ${findingsHtml ? `<ul class="findings">${findingsHtml}</ul>` : ''}
      ${precedentsHtml}
      ${recsHtml}
    </div>
  `;
}

export const REVIEW_PANEL_CSS = `
.review-section { border:1px solid #e5e7eb; border-radius:6px; margin-top:10px; overflow:hidden; }
.review-header { padding:8px 12px; font-size:0.88rem; }
.review-header .cached-tag { float:right; font-size:0.7rem; opacity:0.7; }
.review-section .summary { padding:8px 12px; margin:0; font-size:0.85rem; line-height:1.55; }
.review-section ul.findings { list-style:none; padding:0 12px; margin:0 0 8px; }
.review-section .finding { border-top:1px solid #f3f4f6; padding:6px 0; font-size:0.82rem; }
.review-section .finding .sev-badge {
  display:inline-block; font-size:0.68rem; padding:1px 6px; border-radius:3px; margin-right:6px; font-weight:600;
}
.review-section .finding .lawref { font-size:0.72rem; color:#6b7280; margin-left:6px; }
.review-section .finding .detail { color:#4b5563; margin-top:3px; padding-left:4px; }
.review-section details.precedents-box {
  margin:6px 12px; background:#fafafa; border:1px solid #e5e7eb; border-radius:4px; padding:6px 10px;
}
.review-section details.precedents-box summary { cursor:pointer; font-size:0.8rem; font-weight:600; color:#374151; }
.review-section details.precedents-box ul { margin:6px 0 0 18px; padding:0; font-size:0.78rem; }
.review-section details.precedents-box li { margin-bottom:6px; }
.review-section details.precedents-box .src { color:#6b7280; margin-left:4px; }
.review-section details.precedents-box .relevance { color:#4b5563; margin-top:2px; }
.review-section .recommendations { padding:8px 12px; background:#f9fafb; font-size:0.82rem; }
.review-section .recommendations ul { margin:4px 0 0 18px; padding:0; }
`;
