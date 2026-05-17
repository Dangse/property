/**
 * Reviewer — 3단계: 국세청 검토 에이전트
 *
 * Narrator가 산출한 답변·계산 결과를 받아 과세 관청 관점에서 리스크를 분석한다.
 * 판례·예규는 web_search 서버 도구로 수집한다.
 * 결과는 `submit_review` 도구 호출을 통해 구조화 JSON 으로 강제 수집.
 * 동일 질문은 localStorage 캐시로 7일간 재사용.
 */

import { callClaude, extractToolUses, extractText } from './client.js';
import { webSearchTool } from './tools/web-search.js';
import * as cache from './cache.js';

const MAX_ROUNDS = 5;

/** submit_review 도구 — 구조화 출력 강제용 */
export const submitReviewTool = {
  name: 'submit_review',
  description:
    '검토 결과를 구조화된 JSON 으로 최종 제출한다. 검토를 마치면 반드시 이 도구를 호출해야 한다.',
  input_schema: {
    type: 'object',
    properties: {
      riskLevel: {
        type: 'string', enum: ['낮음', '중간', '높음'],
        description: '국세청 부인·과세 가능성 등급',
      },
      summary: {
        type: 'string', description: '검토 요약 (2~3문장)',
      },
      findings: {
        type: 'array',
        description: '개별 위험·이슈 항목',
        items: {
          type: 'object',
          properties: {
            title:    { type: 'string', description: '쟁점 제목' },
            severity: { type: 'string', enum: ['정보', '주의', '경고'] },
            detail:   { type: 'string', description: '구체적인 설명' },
            lawRef:   { type: 'string', description: '관련 법조문 (예: 소득세법 §41)' },
          },
          required: ['title', 'severity', 'detail'],
        },
      },
      precedents: {
        type: 'array',
        description: '인용 판례·예규·심판례',
        items: {
          type: 'object',
          properties: {
            citation:  { type: 'string', description: '판례번호 또는 예규번호 (예: 대법원 2019두12345)' },
            source:    { type: 'string', description: '출처 (대법원·조세심판원·국세청 등)' },
            relevance: { type: 'string', description: '본 사안과의 관련성 1~2문장' },
            url:       { type: 'string', description: '있다면 URL', default: '' },
          },
          required: ['citation', 'source', 'relevance'],
        },
      },
      recommendations: {
        type: 'array',
        description: '실무 권고사항',
        items: { type: 'string' },
      },
    },
    required: ['riskLevel', 'summary', 'findings'],
  },
};

async function loadSystemPrompt() {
  if (loadSystemPrompt._cached) return loadSystemPrompt._cached;
  const res = await fetch(new URL('./prompts/reviewer-system.txt', import.meta.url));
  loadSystemPrompt._cached = await res.text();
  return loadSystemPrompt._cached;
}

/**
 * @param {object} p
 * @param {string} p.apiKey
 * @param {string} p.model
 * @param {string} p.question        의뢰인 원 질문
 * @param {string} p.narratorAnswer  컨설턴트 최종 답변 텍스트
 * @param {Array}  p.toolCalls       narrator 가 호출한 도구 결과 (요약 포함)
 * @param {boolean} [p.useCache=true]
 * @returns {Promise<ReviewResult>}
 */
export async function review({
  apiKey, model, question, narratorAnswer, toolCalls = [], useCache = true,
}) {
  const cacheKey = await cache.makeKey(['review', question, narratorAnswer]);
  if (useCache) {
    const hit = cache.get(cacheKey);
    if (hit) return { ...hit, cached: true };
  }

  const system = await loadSystemPrompt();
  const contextBlock = [
    '## 의뢰인 질문',
    question,
    '',
    '## 컨설턴트 답변',
    narratorAnswer,
    '',
    '## 사용된 계산 도구',
    toolCalls.length
      ? toolCalls.map((c, i) => `${i + 1}. ${c.name} — input: ${JSON.stringify(c.input)}`).join('\n')
      : '(없음)',
  ].join('\n');

  const messages = [{ role: 'user', content: contextBlock }];
  const tools = [webSearchTool, submitReviewTool];

  for (let r = 0; r < MAX_ROUNDS; r++) {
    const response = await callClaude({ apiKey, model, system, messages, tools });
    messages.push({ role: 'assistant', content: response.content });

    const toolUses = extractToolUses(response);
    const submission = toolUses.find(t => t.name === 'submit_review');
    if (submission) {
      const result = validateReview(submission.input);
      if (useCache) cache.set(cacheKey, result);
      return { ...result, cached: false };
    }

    // submit_review가 아직 안 나오면 빈 tool_result 로 응답 재촉
    if (response.stop_reason === 'tool_use') {
      const clientResults = toolUses
        .filter(t => t.name !== 'web_search' && t.name !== 'submit_review')
        .map(t => ({
          type: 'tool_result', tool_use_id: t.id,
          content: 'Reviewer는 submit_review 외 도구를 호출할 수 없습니다.',
          is_error: true,
        }));
      if (clientResults.length) {
        messages.push({ role: 'user', content: clientResults });
        continue;
      }
      // web_search만 사용했다면 다음 라운드에서 결론 유도
      messages.push({
        role: 'user',
        content: '이제 submit_review 도구를 호출해 최종 검토를 제출하세요.',
      });
      continue;
    }

    // 텍스트만 나왔으면 한 번 더 유도
    messages.push({
      role: 'user',
      content: `submit_review 도구를 호출해 검토 결과를 제출하세요. 받은 텍스트: "${extractText(response).slice(0, 100)}..."`,
    });
  }

  throw new Error(`Reviewer가 ${MAX_ROUNDS}회 내에 submit_review를 호출하지 않았습니다.`);
}

/**
 * submit_review 입력을 안전하게 정규화 (LLM 응답이 일부 누락된 경우 보강)
 */
export function validateReview(raw) {
  const RISK_LEVELS = ['낮음', '중간', '높음'];
  return {
    riskLevel: RISK_LEVELS.includes(raw?.riskLevel) ? raw.riskLevel : '중간',
    summary: String(raw?.summary ?? '').trim() || '(요약 없음)',
    findings: Array.isArray(raw?.findings) ? raw.findings.map(f => ({
      title: String(f?.title ?? '제목 없음'),
      severity: ['정보','주의','경고'].includes(f?.severity) ? f.severity : '주의',
      detail: String(f?.detail ?? ''),
      lawRef: String(f?.lawRef ?? ''),
    })) : [],
    precedents: Array.isArray(raw?.precedents) ? raw.precedents.map(p => ({
      citation: String(p?.citation ?? ''),
      source: String(p?.source ?? ''),
      relevance: String(p?.relevance ?? ''),
      url: String(p?.url ?? ''),
    })) : [],
    recommendations: Array.isArray(raw?.recommendations)
      ? raw.recommendations.map(s => String(s)).filter(Boolean)
      : [],
  };
}

/**
 * @typedef {object} ReviewResult
 * @property {'낮음'|'중간'|'높음'} riskLevel
 * @property {string} summary
 * @property {Array}  findings
 * @property {Array}  precedents
 * @property {string[]} recommendations
 * @property {boolean} [cached]
 */
