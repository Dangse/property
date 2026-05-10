/**
 * 법령 검토 에이전트
 *
 * AI 답변에 대해:
 *   1) 정규식으로 법령 인용 추출
 *   2) 로컬 DB와 대조 (verified / unknown)
 *   3) 2차 Claude 호출로 인용 해석의 정확성 검토
 *      → 각 인용에 대해 ✓ accurate / ⚠ partial / ✗ inaccurate 판정
 *
 * 반환 구조:
 *   {
 *     citations: [
 *       { key, status: 'verified'|'unknown', entry?, judgment?: 'accurate'|'partial'|'inaccurate', reason? }
 *     ],
 *     overall: 'good'|'caution'|'bad',
 *     overallReason: string
 *   }
 */

import { chatStream }                      from './chat.js';
import { extractCitations, checkCitations } from '../data/laws.js';

const REVIEWER_PERSONA = `당신은 한국 부동산 세법 검토관입니다. 다른 AI가 생성한 답변에서 인용한 법령 조항이 실제 조문 요지와 일치하는지 검토합니다.

검토 원칙:
- DB에 정리된 조항 요지와 답변의 해석을 비교
- 명백히 일치 → "accurate"
- 일부만 맞거나 표현이 모호 → "partial"
- 잘못 인용/해석 → "inaccurate"
- DB에 없는 조항(unknown)은 판정하지 않음 (사용자가 별도 확인 필요)

반드시 다음 JSON 형식으로만 응답하세요. 설명문 없이 JSON만 출력:

{
  "citations": [
    { "key": "소득세법 §95", "judgment": "accurate", "reason": "장기보유특별공제 설명이 DB 요지와 일치함" }
  ],
  "overall": "good",
  "overallReason": "인용된 법령 모두 정확하게 적용됨"
}

overall은 'good'(모두 accurate), 'caution'(partial 또는 unknown 포함), 'bad'(inaccurate 1개 이상) 중 하나.`;

/**
 * 답변에 대한 법령 검토 수행
 *
 * @param {string} answerText  검토 대상 AI 답변
 * @param {object} [opts]
 * @param {boolean} [opts.skipLLM=false]  true면 정규식+DB 대조만 수행 (빠른 모드)
 * @returns {Promise<object>}
 */
export async function reviewLaws(answerText, { skipLLM = false } = {}) {
  const citations = extractCitations(answerText);
  if (citations.length === 0) {
    return {
      citations: [],
      overall:   'good',
      overallReason: '답변에 명시적 법령 인용이 없습니다.',
    };
  }

  const checked = checkCitations(citations);
  const verified = checked.filter(c => c.status === 'verified');

  // LLM 검토 생략 모드: DB 대조 결과만 반환
  if (skipLLM || verified.length === 0) {
    return {
      citations: checked,
      overall:   verified.length === checked.length ? 'good' : 'caution',
      overallReason: verified.length === checked.length
        ? `${checked.length}개 인용 모두 DB에 등록된 조항입니다.`
        : `${checked.length - verified.length}개 인용은 DB에 없어 별도 확인이 필요합니다.`,
    };
  }

  // 2차 Claude 호출
  const dbContext = verified
    .map(c => `[${c.key}] ${c.entry.title}\n  요지: ${c.entry.summary}`)
    .join('\n\n');

  const userMsg = `검토할 답변 원문:
"""
${answerText}
"""

DB에 등록된 인용 법령 요지:
${dbContext}

위 답변이 각 법령을 정확히 인용·해석했는지 JSON으로 판정하세요.`;

  let raw = '';
  try {
    raw = await chatStream({
      messages:  [{ role: 'user', content: userMsg }],
      system:    REVIEWER_PERSONA,
      maxTokens: 1500,
      onDelta:   () => {}, // 결과만 사용, 스트리밍 표시 없음
    });
  } catch (err) {
    return {
      citations: checked,
      overall:   'caution',
      overallReason: `검토 중 오류: ${err.message}. DB 대조 결과만 표시합니다.`,
    };
  }

  // JSON 파싱 (```json 블록도 허용)
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return {
      citations: checked,
      overall:   'caution',
      overallReason: 'AI 검토관 응답을 파싱하지 못했습니다.',
    };
  }

  let parsed;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    return {
      citations: checked,
      overall:   'caution',
      overallReason: 'AI 검토관이 잘못된 JSON을 반환했습니다.',
    };
  }

  // 판정 결과를 checked에 머지
  const judgmentMap = Object.fromEntries(
    (parsed.citations || []).map(c => [c.key, c])
  );
  const merged = checked.map(c => {
    const j = judgmentMap[c.key];
    if (c.status === 'verified' && j) {
      return { ...c, judgment: j.judgment, reason: j.reason };
    }
    return c;
  });

  return {
    citations:     merged,
    overall:       parsed.overall || 'caution',
    overallReason: parsed.overallReason || '',
  };
}
