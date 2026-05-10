/**
 * 시나리오 결과 → AI 시스템 프롬프트 변환
 *
 * 결과 객체(시나리오 모듈 출력)를 한국어 자연어로 정리하여
 * Claude가 컨텍스트를 이해하고 후속 질문에 답할 수 있게 함.
 */

import { wonStr, wonKo } from '../ui/formatter.js';
import { LAW_DATABASE } from '../data/laws.js';

const PERSONA = `당신은 한국 부동산 세무를 전문으로 하는 AI 컨설턴트 "투자가 AI"입니다.
사용자는 본 시스템에서 시나리오 기반 세금 계산을 마쳤고, 그 결과에 대해 후속 질문을 합니다.

답변 원칙:
1. 한국어로 친절하고 전문적으로 답변하세요.
2. 구체적인 숫자(시뮬레이션 결과)를 인용하여 근거를 제시하세요.
3. 관련 법령은 반드시 아래 [법령 DB]에 등록된 조항을 우선 인용하세요. 인용 시 "소득세법 제95조"와 같이 표준 형식으로 작성하세요. DB 외 조항은 "참고: DB 외 조항으로 별도 확인 필요"를 명시하세요.
4. 단순 절세를 넘어 세무조사 위험·실거주 요건·5년 보유 등 부수적 함의도 짚어주세요.
5. 본 계산 결과는 추정치이며 최종 결정 전 세무사 상담을 권하세요.
6. 마크다운 사용 가능 (**굵게**, 항목별 - 리스트, ## 소제목).
7. 답변은 간결하게: 핵심 결론을 먼저, 부연 설명은 짧게.

질문이 시나리오 외 일반 세무 질문이면 가능한 범위에서 답변하되, 본 계산 결과와 직접 관련 없음을 명시하세요.`;

/**
 * 시나리오 결과를 시스템 프롬프트에 첨부할 컨텍스트 텍스트로 변환
 */
function buildResultContext(result) {
  if (!result) return '';

  const { title, inputs, case1, case2, holdingTax, summary, lawRef } = result;

  const lines = [
    `## 사용자가 방금 계산한 시나리오`,
    `**${title}**`,
    '',
    '### 입력값',
  ];

  // 주요 입력값 (한국어 라벨)
  const labels = {
    marketPrice:       '시가',
    officialPrice:     '기준시가',
    basePrice:         '취득가액',
    loanPrice:         '승계대출(전세보증금+담보대출)',
    holdPeriod:        '보유기간',
    stayPeriod:        '거주기간',
    holdOfficialPrice: '계속보유주택 기준시가',
    holdPeriod2:       '계속보유주택 보유기간',
    space:             '전용면적코드',
    heavy:             '조정지역(0=비조정, 1=조정)',
    ownerAge:          '소유자 연령',
    childAge:          '자녀 연령',
    spouseAge:         '배우자 연령',
    partRate:          '증여 지분 비율',
    ownerRate:         '소유자 지분 비율',
  };
  for (const [k, label] of Object.entries(labels)) {
    if (inputs?.[k] !== undefined) {
      const v = inputs[k];
      const formatted = (k.endsWith('Price') || k === 'basePrice')
        ? wonStr(v)
        : (k === 'partRate' || k === 'ownerRate') ? `${(v * 100).toFixed(0)}%`
        : v;
      lines.push(`- ${label}: ${formatted}`);
    }
  }

  // 케이스 비교 (간단)
  lines.push('', '### 케이스 비교');
  const c1Total = summary.case1GrandTotal ?? summary.case1Total ?? 0;
  const c2Total = summary.case2GrandTotal ?? summary.case2Total ?? 0;
  lines.push(`- **Case 1 (${case1.label || 'Case 1'})**: ${wonKo(c1Total)} (${wonStr(c1Total)})`);
  lines.push(`- **Case 2 (${case2.label || 'Case 2'})**: ${wonKo(c2Total)} (${wonStr(c2Total)})`);
  const diff = c1Total - c2Total;
  if (diff !== 0) {
    const winner = diff > 0 ? case2.label : case1.label;
    lines.push(`- **유리한 방법**: ${winner} (절감액 ${wonKo(Math.abs(diff))})`);
  }

  // 케이스별 세부 내역
  for (const [tag, c] of [['Case 1', case1], ['Case 2', case2]]) {
    if (c.sellerTotal > 0 || c.recipientTotal > 0) {
      lines.push('', `### ${tag} 세부 내역`);
      if (c.sellerTotal > 0) {
        lines.push(`- 양도소득세: ${wonStr(c.sellerTransferTax)}`);
        lines.push(`- 지방소득세: ${wonStr(c.sellerLocalTax)}`);
      }
      if (c.recipientTotal > 0) {
        lines.push(`- 증여세: ${wonStr(c.recipientGiftTax)}`);
        lines.push(`- 취득세: ${wonStr(c.recipientAcqTax)}`);
      }
      if (c.recipients?.length > 0) {
        lines.push(`- 수증자별:`);
        c.recipients.forEach(r => {
          lines.push(`  - ${r.label}: 증여세 ${wonStr(r.giftTax)}, 취득세 ${wonStr(r.acqTax)}`);
        });
      }
    }
  }

  // 보유세 변화
  if (holdingTax) {
    lines.push('', '### 연간 보유세 변화');
    const beforeTotal = holdingTax.before?.grandTotal ?? holdingTax.before?.total ?? 0;
    lines.push(`- 처분 전: ${wonStr(beforeTotal)}`);
    if (holdingTax.afterCase1) {
      const a1 = holdingTax.afterCase1.grandTotal ?? holdingTax.afterCase1.total ?? 0;
      const a2 = holdingTax.afterCase2.grandTotal ?? holdingTax.afterCase2.total ?? 0;
      lines.push(`- Case 1 후: ${wonStr(a1)} (변화 ${wonStr(a1 - beforeTotal)})`);
      lines.push(`- Case 2 후: ${wonStr(a2)} (변화 ${wonStr(a2 - beforeTotal)})`);
    } else if (holdingTax.after) {
      const after = holdingTax.after.grandTotal ?? holdingTax.after.total ?? 0;
      lines.push(`- 증여 후: ${wonStr(after)} (변화 ${wonStr(after - beforeTotal)})`);
    }
  }

  // 관련 법령
  if (lawRef && lawRef.length > 0) {
    lines.push('', '### 관련 법령');
    lawRef.forEach(l => lines.push(`- ${l}`));
  }

  return lines.join('\n');
}

function buildLawSection() {
  const lines = ['## 법령 DB (인용 시 우선 사용)', ''];
  LAW_DATABASE.forEach(l => {
    // "소득세법 §95" → "소득세법 제95조" 형식으로 변환하여 모델이 인용 형식 학습
    const articleStr = l.key.replace(/§(\d+)(?:의(\d+))?/, (_, n, sub) =>
      sub ? `제${n}조의${sub}` : `제${n}조`);
    lines.push(`- **${articleStr}** (${l.title}): ${l.summary}`);
  });
  return lines.join('\n');
}

export function buildSystemPrompt(result) {
  const ctx = buildResultContext(result);
  const lawSection = buildLawSection();
  const parts = [PERSONA, lawSection];
  if (ctx) parts.push(ctx);
  return parts.join('\n\n');
}
