import { describe, it, expect } from 'vitest';
import { Packer } from 'docx';
import { buildReport, packReport } from '../../src/export/docx-export.js';

const sampleTurn = {
  question: '5억 아파트를 자녀에게 증여하면 증여세는?',
  answer: '성년 자녀 1억 공제 후 4억 × 20% − 1천만 = 7천만, 신고세액공제 3% 적용 시 약 6,790만 원입니다.',
  toolCalls: [{
    name: 'calc_gift_tax',
    input: { giveRel: 1, isSkip: 2, giftPrice: 500000000, recipientAge: 25 },
    output: JSON.stringify({
      tax: 67_900_000,
      breakdown: [
        { step: 1, label: '증여재산공제', value: 50_000_000,
          formula: '성년 자녀 5천만', lawRef: '상증법 §53' },
        { step: 2, label: '과세표준', value: 450_000_000,
          formula: '5억 − 5천만', lawRef: '상증법 §55' },
      ],
      lawRef: ['상증법 §53', '상증법 §56'],
    }),
  }],
  review: {
    riskLevel: '중간',
    summary: '시가 평가 적정성 검토 필요',
    findings: [{
      title: '시가 평가 자료 미비', severity: '주의',
      detail: '감정평가 또는 매매사례가액 확보 권장',
      lawRef: '상증법 §60',
    }],
    precedents: [{
      citation: '조심2022서1234', source: '조세심판원',
      relevance: '유사 사안에서 보충적 평가방법 부인',
      url: '',
    }],
    recommendations: ['감정평가서 사전 확보', '증여계약서 공증'],
  },
};

const clientInfo = {
  clientName: '홍길동',
  taxKind: '증여세',
  marketPrice: '500000000',
};

describe('buildReport — docx 빌더', () => {
  it('docx Document/File 객체를 반환', () => {
    const doc = buildReport({ clientInfo, turns: [sampleTurn], mode: 'with-basis' });
    expect(doc).toBeDefined();
    // docx v9에서 Document는 내부적으로 'File'로 export됨
    expect(['Document', 'File']).toContain(doc.constructor.name);
  });

  it('3개 모드 모두 빌드 성공', () => {
    for (const mode of ['summary', 'with-basis', 'full']) {
      const doc = buildReport({ clientInfo, turns: [sampleTurn], mode });
      expect(doc).toBeDefined();
    }
  });

  it('빈 turns / 빈 clientInfo 도 안전하게 빌드', () => {
    const doc = buildReport({});
    expect(doc).toBeDefined();
  });

  it('사무소 옵션이 메타데이터에 반영됨', () => {
    const doc = buildReport({
      clientInfo, turns: [],
      office: { name: '테스트세무사', footerText: 'foot' },
    });
    expect(doc).toBeDefined();
  });
});

describe('packReport — Blob 패키징', () => {
  it('summary 모드 Blob 생성 (1KB 이상)', async () => {
    const doc = buildReport({ clientInfo, turns: [sampleTurn], mode: 'summary' });
    const blob = await packReport(doc);
    expect(blob.size).toBeGreaterThan(1000);
    expect(blob.type).toContain('officedocument'); // docx MIME
  });

  it('with-basis 모드는 breakdown 표가 포함되어 summary보다 큼', async () => {
    const summary = await packReport(
      buildReport({ clientInfo, turns: [sampleTurn], mode: 'summary' })
    );
    const withBasis = await packReport(
      buildReport({ clientInfo, turns: [sampleTurn], mode: 'with-basis' })
    );
    expect(withBasis.size).toBeGreaterThan(summary.size);
  });

  it('full 모드는 도구 raw 입력까지 포함', async () => {
    const buf = await Packer.toBuffer(
      buildReport({ clientInfo, turns: [sampleTurn], mode: 'full' })
    );
    // ZIP(docx) 파일 시그니처
    expect(buf[0]).toBe(0x50);  // 'P'
    expect(buf[1]).toBe(0x4b);  // 'K'
    expect(buf.length).toBeGreaterThan(2000);
  });

  it('여러 턴이 누적되어 문서에 포함됨', async () => {
    const oneTurn = await packReport(
      buildReport({ clientInfo, turns: [sampleTurn], mode: 'with-basis' })
    );
    const threeTurns = await packReport(
      buildReport({ clientInfo, turns: [sampleTurn, sampleTurn, sampleTurn], mode: 'with-basis' })
    );
    expect(threeTurns.size).toBeGreaterThan(oneTurn.size);
  });
});
