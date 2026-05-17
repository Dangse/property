/**
 * Anthropic Claude API 클라이언트
 *
 * 브라우저에서 직접 호출하기 위해 anthropic-dangerous-direct-browser-access 헤더 사용.
 * (실전 운영 시 백엔드 프록시 권장 — API 키 노출 방지)
 */

const API_URL = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2023-06-01';

/**
 * Claude Messages API 단일 호출
 *
 * @param {object} p
 * @param {string} p.apiKey
 * @param {string} p.model
 * @param {string} p.system               시스템 프롬프트
 * @param {Array}  p.messages             대화 이력 ({role, content})
 * @param {Array}  [p.tools]              도구 정의
 * @param {number} [p.maxTokens=4096]
 * @returns {Promise<object>}             Anthropic 응답 객체
 */
export async function callClaude({
  apiKey, model, system, messages, tools, maxTokens = 4096,
}) {
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY가 설정되지 않았습니다. config.js를 확인하세요.');

  const body = {
    model,
    max_tokens: maxTokens,
    system,
    messages,
  };
  if (tools && tools.length) body.tools = tools;

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': API_VERSION,
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Claude API ${res.status}: ${text}`);
  }
  return res.json();
}

/**
 * 응답에서 텍스트 블록만 추출
 */
export function extractText(response) {
  return (response?.content ?? [])
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('\n');
}

/**
 * 응답에서 tool_use 블록 추출
 */
export function extractToolUses(response) {
  return (response?.content ?? []).filter(b => b.type === 'tool_use');
}
