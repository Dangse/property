/**
 * Word(.doc) 보고서 export
 *
 * MS Office 호환 HTML wrapper로 감싸 .doc 파일로 다운로드.
 * Word가 .doc(HTML)을 정상 인식하며, 사용자가 Word에서 .docx로 저장 가능.
 * 외부 라이브러리 의존성 0.
 */

import { buildReportParts } from './report-builder.js';

/**
 * Word 보고서 다운로드
 * @param {object} result   시나리오 결과
 * @param {string} [filename]  기본값: '부동산세금시뮬레이션_<title>_<날짜>.doc'
 */
export function exportWord(result, filename) {
  const { title, bodyHtml, css } = buildReportParts(result);

  // MS Word HTML schema (Word가 인식)
  const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <title>${escHtml(title)}</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @page WordSection1 { size: 21cm 29.7cm; margin: 2cm 1.8cm; }
    div.WordSection1 { page: WordSection1; }
    ${css}
  </style>
</head>
<body>
  <div class="WordSection1">
    ${bodyHtml}
  </div>
</body>
</html>`;

  const fname = filename || defaultFilename(result.title);
  // BOM(﻿) 추가로 UTF-8 한글 깨짐 방지
  const blob = new Blob(['﻿', html], { type: 'application/msword;charset=utf-8' });
  triggerDownload(blob, fname);
}

function defaultFilename(title) {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const safe = String(title || 'report').replace(/[\\/:*?"<>|]/g, '_');
  return `부동산세금_${safe}_${ymd}.doc`;
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function escHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
