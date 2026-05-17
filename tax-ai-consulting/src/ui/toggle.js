/**
 * 토글식 근거 박스 — breakdown 단계를 접고 펼치는 UI 헬퍼
 */

const fmt = (n) => typeof n === 'number' ? n.toLocaleString('ko-KR') : String(n);

/**
 * 계산 결과 객체를 <details> 기반 HTML로 렌더링
 * @param {object} result  CalcResult 또는 ScenarioResult
 * @param {string} title
 */
export function renderBreakdown(result, title = '계산 근거') {
  if (!result) return '';

  const breakdown = Array.isArray(result.breakdown) ? result.breakdown : [];
  const lawRef = Array.isArray(result.lawRef) ? result.lawRef : [];

  const rows = breakdown.map(s => `
    <tr>
      <td class="step">${s.step ?? ''}</td>
      <td class="label">${s.label ?? ''}</td>
      <td class="value">${fmt(s.value)} 원</td>
      <td class="formula">${s.formula ?? ''}</td>
      <td class="lawref">${s.lawRef ?? ''}</td>
    </tr>
  `).join('');

  return `
    <details class="breakdown-box">
      <summary>📊 ${title} ${result.tax !== undefined ? `(자진납부세액 ${fmt(result.tax)}원)` : ''}</summary>
      ${breakdown.length ? `
        <table>
          <thead><tr>
            <th>#</th><th>항목</th><th>금액</th><th>산식</th><th>법조문</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      ` : ''}
      ${lawRef.length ? `
        <div class="lawref-list">
          <strong>참조 법령</strong>
          <ul>${lawRef.map(r => `<li>${r}</li>`).join('')}</ul>
        </div>
      ` : ''}
    </details>
  `;
}

/**
 * 도구 호출 로그를 토글로 렌더링
 */
export function renderToolCall({ name, input, output }) {
  let outputRendered = output;
  try {
    const parsed = typeof output === 'string' ? JSON.parse(output) : output;
    outputRendered = renderBreakdown(parsed, `도구 결과: ${name}`);
  } catch {
    outputRendered = `<pre>${escapeHtml(String(output))}</pre>`;
  }
  return `
    <details class="tool-call">
      <summary>🛠️ 도구 호출: <code>${name}</code></summary>
      <div class="tool-input">
        <strong>입력</strong>
        <pre>${escapeHtml(JSON.stringify(input, null, 2))}</pre>
      </div>
      <div class="tool-output">${outputRendered}</div>
    </details>
  `;
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}
