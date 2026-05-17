import { describe, it, expect } from 'vitest';
import { validateReview, submitReviewTool } from '../../src/ai/reviewer.js';

describe('submitReviewTool 스키마', () => {
  it('도구 정의 필수 필드', () => {
    expect(submitReviewTool.name).toBe('submit_review');
    expect(submitReviewTool.input_schema.required).toEqual(
      expect.arrayContaining(['riskLevel', 'summary', 'findings'])
    );
    expect(submitReviewTool.input_schema.properties.riskLevel.enum)
      .toEqual(['낮음', '중간', '높음']);
  });
});

describe('validateReview — LLM 응답 정규화', () => {
  it('정상 입력 통과', () => {
    const r = validateReview({
      riskLevel: '높음',
      summary: '실질과세 적용 위험',
      findings: [{
        title: '명의신탁 의심', severity: '경고',
        detail: '소득세법 §41 부당행위계산 부인 가능',
        lawRef: '소득세법 §41',
      }],
      precedents: [{
        citation: '대법원 2019두12345', source: '대법원',
        relevance: '유사 사안 부인 사례',
      }],
      recommendations: ['감정평가서 확보', '소명자료 준비'],
    });
    expect(r.riskLevel).toBe('높음');
    expect(r.findings).toHaveLength(1);
    expect(r.precedents).toHaveLength(1);
    expect(r.recommendations).toHaveLength(2);
  });

  it('riskLevel 누락/비정상 시 중간 기본값', () => {
    expect(validateReview({}).riskLevel).toBe('중간');
    expect(validateReview({ riskLevel: 'critical' }).riskLevel).toBe('중간');
  });

  it('findings의 severity 비정상 시 주의 기본값', () => {
    const r = validateReview({
      riskLevel: '낮음',
      findings: [{ title: 't', severity: 'wat', detail: 'd' }],
    });
    expect(r.findings[0].severity).toBe('주의');
  });

  it('빈 배열·문자열 안전 처리', () => {
    const r = validateReview({ riskLevel: '낮음' });
    expect(r.findings).toEqual([]);
    expect(r.precedents).toEqual([]);
    expect(r.recommendations).toEqual([]);
    expect(r.summary).toBe('(요약 없음)');
  });

  it('precedents url 미지정 → 빈 문자열', () => {
    const r = validateReview({
      riskLevel: '중간',
      precedents: [{ citation: 'c', source: 's', relevance: 'r' }],
    });
    expect(r.precedents[0].url).toBe('');
  });
});
