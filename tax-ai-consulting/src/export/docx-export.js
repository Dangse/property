/**
 * 3계층 Word(.docx) 보고서 생성기
 *
 * 모드:
 *   - 'summary'    요약       : 질문 + 핵심 답변 + 리스크 등급 + 결론
 *   - 'with-basis' 근거 포함  : + breakdown 표 + 인용 판례
 *   - 'full'       전체       : + 도구 호출 raw input/output, 권고사항 전체
 *
 * 의뢰인 정보 → 표지 자동 생성
 * 사무소명/로고/푸터 → office 옵션으로 주입
 *
 * 의존: docx, file-saver
 */

import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle,
  PageNumber, Footer, Header, ImageRun, PageOrientation,
} from 'docx';
import { saveAs } from 'file-saver';

const MODE_LABEL = {
  'summary':    '요약 보고서',
  'with-basis': '근거 포함 보고서',
  'full':       '전체 보고서',
};

const fmt = (n) => typeof n === 'number' ? n.toLocaleString('ko-KR') : String(n ?? '');

// ──────────────────────────────────────────────────────────────
// 빌더 헬퍼
// ──────────────────────────────────────────────────────────────

const heading = (text, level = HeadingLevel.HEADING_1) =>
  new Paragraph({ text, heading: level, spacing: { before: 240, after: 120 } });

const para = (text, opts = {}) =>
  new Paragraph({
    children: [new TextRun({ text: String(text ?? ''), ...opts })],
    spacing: { after: 80 },
  });

const labelPara = (label, value) =>
  new Paragraph({
    children: [
      new TextRun({ text: `${label}: `, bold: true }),
      new TextRun({ text: String(value ?? '') }),
    ],
    spacing: { after: 60 },
  });

function thinBorder() {
  const b = { style: BorderStyle.SINGLE, size: 4, color: '999999' };
  return { top: b, bottom: b, left: b, right: b };
}

function tableCell(text, opts = {}) {
  return new TableCell({
    children: [new Paragraph({
      children: [new TextRun({ text: String(text ?? ''), bold: !!opts.bold, size: 18 })],
      alignment: opts.align ?? AlignmentType.LEFT,
    })],
    width: opts.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
    shading: opts.header ? { fill: 'E5E7EB' } : undefined,
  });
}

function breakdownTable(breakdown = []) {
  const headerRow = new TableRow({
    children: [
      tableCell('#', { header: true, bold: true, width: 5, align: AlignmentType.CENTER }),
      tableCell('항목', { header: true, bold: true, width: 22 }),
      tableCell('금액', { header: true, bold: true, width: 16, align: AlignmentType.RIGHT }),
      tableCell('산식', { header: true, bold: true, width: 32 }),
      tableCell('법조문', { header: true, bold: true, width: 25 }),
    ],
  });
  const rows = breakdown.map(s => new TableRow({
    children: [
      tableCell(s.step, { align: AlignmentType.CENTER }),
      tableCell(s.label),
      tableCell(`${fmt(s.value)} 원`, { align: AlignmentType.RIGHT }),
      tableCell(s.formula),
      tableCell(s.lawRef),
    ],
  }));
  return new Table({
    rows: [headerRow, ...rows],
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: thinBorder(),
  });
}

function reviewSection(review, mode) {
  if (!review) return [];
  const out = [
    heading('국세청 입장 검토', HeadingLevel.HEADING_2),
    new Paragraph({
      children: [
        new TextRun({ text: '리스크 등급: ', bold: true }),
        new TextRun({
          text: review.riskLevel ?? '중간',
          bold: true,
          color: review.riskLevel === '높음' ? 'B91C1C'
               : review.riskLevel === '낮음' ? '065F46'
               : '92400E',
        }),
      ],
      spacing: { after: 80 },
    }),
    para(review.summary),
  ];

  if (review.findings?.length) {
    out.push(heading('주요 검토 사항', HeadingLevel.HEADING_3));
    for (const f of review.findings) {
      out.push(new Paragraph({
        children: [
          new TextRun({ text: `[${f.severity}] `, bold: true,
            color: f.severity === '경고' ? 'B91C1C' : f.severity === '주의' ? '92400E' : '1E40AF' }),
          new TextRun({ text: f.title, bold: true }),
          f.lawRef ? new TextRun({ text: `  (${f.lawRef})`, color: '6B7280' }) : new TextRun({ text: '' }),
        ],
        spacing: { before: 80, after: 40 },
      }));
      out.push(para(f.detail));
    }
  }

  if (mode !== 'summary' && review.precedents?.length) {
    out.push(heading('인용 판례·예규', HeadingLevel.HEADING_3));
    for (const p of review.precedents) {
      out.push(new Paragraph({
        children: [
          new TextRun({ text: `• ${p.citation}`, bold: true }),
          new TextRun({ text: ` (${p.source})`, color: '6B7280' }),
        ],
      }));
      out.push(para(p.relevance, { size: 20 }));
    }
  }

  if (review.recommendations?.length) {
    out.push(heading('실무 권고', HeadingLevel.HEADING_3));
    for (const r of review.recommendations) {
      out.push(new Paragraph({
        children: [new TextRun({ text: `✓ ${r}` })],
        spacing: { after: 40 },
      }));
    }
  }

  return out;
}

function toolCallsSection(toolCalls = [], mode) {
  if (!toolCalls.length || mode === 'summary') return [];

  const blocks = [heading('계산 도구 호출 내역', HeadingLevel.HEADING_2)];

  for (const [i, tc] of toolCalls.entries()) {
    blocks.push(heading(`${i + 1}. ${tc.name}`, HeadingLevel.HEADING_3));

    // 결과의 breakdown이 있으면 표로
    let parsed = null;
    try { parsed = typeof tc.output === 'string' ? JSON.parse(tc.output) : tc.output; } catch {}

    if (parsed?.breakdown?.length) {
      blocks.push(breakdownTable(parsed.breakdown));
      if (parsed.tax !== undefined) {
        blocks.push(new Paragraph({
          children: [
            new TextRun({ text: '자진납부세액: ', bold: true }),
            new TextRun({ text: `${fmt(parsed.tax)} 원`, bold: true }),
          ],
          spacing: { before: 80 },
        }));
      }
    }

    if (mode === 'full') {
      blocks.push(labelPara('입력', JSON.stringify(tc.input)));
      if (!parsed?.breakdown) {
        blocks.push(labelPara('출력', String(tc.output).slice(0, 1200)));
      }
    }

    if (parsed?.lawRef?.length && mode !== 'summary') {
      blocks.push(new Paragraph({
        children: [new TextRun({ text: '참조 법령: ', bold: true, size: 18 })],
      }));
      for (const lr of parsed.lawRef) {
        blocks.push(new Paragraph({
          children: [new TextRun({ text: `  • ${lr}`, size: 18, color: '4B5563' })],
        }));
      }
    }
  }

  return blocks;
}

// ──────────────────────────────────────────────────────────────
// 메인 빌더
// ──────────────────────────────────────────────────────────────

/**
 * @typedef {object} Turn
 * @property {string} question
 * @property {string} answer
 * @property {Array}  [toolCalls]
 * @property {object} [review]
 */

/**
 * @param {object} p
 * @param {object} p.clientInfo  의뢰인 정보 (입력폼 getValues 결과)
 * @param {Turn[]} p.turns       Q&A 누적
 * @param {'summary'|'with-basis'|'full'} p.mode
 * @param {object} [p.office]    { name, logoBase64, footerText }
 * @returns {Document}           docx Document 객체
 */
export function buildReport({ clientInfo = {}, turns = [], mode = 'with-basis', office = {} }) {
  const today = new Date().toISOString().slice(0, 10);
  const officeName = office.name || 'Tuzaga 세무사사무소';
  const footerText = office.footerText || officeName;

  // ── 표지 ─────────────────────────────────────────────
  const coverChildren = [];
  if (office.logoBase64) {
    try {
      coverChildren.push(new Paragraph({
        children: [new ImageRun({
          data: office.logoBase64,
          transformation: { width: 120, height: 120 },
        })],
        alignment: AlignmentType.CENTER,
      }));
    } catch { /* 잘못된 base64면 무시 */ }
  }
  coverChildren.push(
    new Paragraph({
      children: [new TextRun({ text: officeName, bold: true, size: 28 })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 240, after: 480 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'AI 세무 컨설팅 보고서', bold: true, size: 48 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `(${MODE_LABEL[mode] ?? mode})`, size: 24, color: '6B7280' })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 960 },
    }),
    new Paragraph({
      children: [new TextRun({ text: '의뢰인 정보', bold: true, size: 24 })],
      spacing: { after: 120 },
    }),
  );
  for (const [k, v] of Object.entries(clientInfo)) {
    if (!v || v === '선택안함' || v === '아니오') continue;
    coverChildren.push(labelPara(k, v));
  }
  coverChildren.push(
    new Paragraph({ children: [new TextRun({ text: '' })], spacing: { before: 480 } }),
    labelPara('작성일', today),
    labelPara('작성', `${officeName} (AI 컨설팅 보조)`),
  );

  // ── 본문: Q&A 누적 ──────────────────────────────────
  const bodyChildren = [];
  bodyChildren.push(heading('상담 내역', HeadingLevel.HEADING_1));

  for (const [idx, turn] of turns.entries()) {
    bodyChildren.push(heading(`Q${idx + 1}. ${turn.question}`, HeadingLevel.HEADING_2));
    bodyChildren.push(para(turn.answer));

    if (mode !== 'summary') {
      bodyChildren.push(...toolCallsSection(turn.toolCalls, mode));
    }
    if (turn.review) {
      bodyChildren.push(...reviewSection(turn.review, mode));
    }
    bodyChildren.push(new Paragraph({
      children: [new TextRun({ text: '─'.repeat(40), color: 'D1D5DB' })],
      spacing: { before: 240, after: 240 },
    }));
  }

  // ── 푸터 ───────────────────────────────────────────
  const footer = new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: `${footerText}  •  `, size: 16, color: '6B7280' }),
          new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '6B7280' }),
          new TextRun({ text: ' / ', size: 16, color: '6B7280' }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: '6B7280' }),
        ],
      }),
    ],
  });

  return new Document({
    creator: officeName,
    title: 'AI 세무 컨설팅 보고서',
    sections: [
      {
        properties: { page: { size: { orientation: PageOrientation.PORTRAIT } } },
        footers: { default: footer },
        children: [
          ...coverChildren,
          new Paragraph({ children: [new TextRun({ text: '', break: 1 })], pageBreakBefore: true }),
          ...bodyChildren,
        ],
      },
    ],
  });
}

/**
 * 보고서를 Blob으로 패키징
 */
export async function packReport(doc) {
  return await Packer.toBlob(doc);
}

/**
 * 브라우저에서 다운로드 트리거
 */
export async function downloadReport({ clientInfo, turns, mode, office }) {
  const doc = buildReport({ clientInfo, turns, mode, office });
  const blob = await packReport(doc);
  const clientName = clientInfo?.clientName || '의뢰인';
  const today = new Date().toISOString().slice(0, 10);
  const fileName = `세무컨설팅_${clientName}_${MODE_LABEL[mode] ?? mode}_${today}.docx`;
  saveAs(blob, fileName);
  return { fileName, size: blob.size };
}
