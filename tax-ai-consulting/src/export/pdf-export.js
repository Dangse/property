/**
 * PDF 보고서 export
 *
 * 새 창에 보고서 HTML을 작성하고 window.print()를 호출.
 * 사용자는 인쇄 대화상자에서 "PDF로 저장"을 선택.
 *
 * 별도 PDF 라이브러리 없이 브라우저 내장 기능 사용 → 의존성 0 + 한글 폰트 문제 없음.
 */

import { buildReportParts } from './report-builder.js';

const PRINT_CSS = `
  @page { size: A4; margin: 18mm 16mm; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none !important; }
    a { color: inherit; text-decoration: none; }
  }
  .print-toolbar {
    position: sticky; top: 0; z-index: 10;
    background: #1a56db; color: #fff;
    padding: 12px 20px; display: flex; gap: 10px; justify-content: center;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  }
  .print-toolbar button {
    background: #fff; color: #1a56db; border: none;
    padding: 8px 18px; font-size: 14px; font-weight: 600;
    border-radius: 6px; cursor: pointer;
  }
  .print-toolbar button:hover { background: #eef4ff; }
  .print-toolbar .hint { color: rgba(255,255,255,0.85); font-size: 12px; align-self: center; }
  .report-container { max-width: 800px; margin: 0 auto; padding: 30px; }
`;

/**
 * PDF 저장 다이얼로그 트리거
 * @param {object} result 시나리오 결과
 */
export function exportPDF(result) {
  const { title, bodyHtml, css } = buildReportParts(result);

  // CSP-safe: 인라인 <script>·onclick 없이 작성, 부모 창에서 이벤트 바인딩
  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <title>${escAttr(title)}</title>
  <style>${css}\n${PRINT_CSS}</style>
</head>
<body>
  <div class="print-toolbar no-print">
    <button type="button" id="btn-print">📄 PDF로 저장 / 인쇄</button>
    <button type="button" id="btn-close">닫기</button>
    <span class="hint">인쇄 대화상자에서 "PDF로 저장"을 선택하세요</span>
  </div>
  <div class="report-container">
    ${bodyHtml}
  </div>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) {
    alert('팝업이 차단되었습니다. 팝업 허용 후 다시 시도해주세요.');
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();

  // 팝업 DOM 구성 후 부모에서 이벤트 바인딩 + 자동 인쇄 트리거
  const triggerPrint = () => {
    try {
      win.document.getElementById('btn-print')?.addEventListener('click', () => win.print());
      win.document.getElementById('btn-close')?.addEventListener('click', () => win.close());
      setTimeout(() => win.print(), 400);
    } catch { /* cross-origin 보호 등 — 사용자 수동 클릭으로 진행 */ }
  };
  if (win.document.readyState === 'complete') triggerPrint();
  else win.addEventListener('load', triggerPrint);
}

function escAttr(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}
