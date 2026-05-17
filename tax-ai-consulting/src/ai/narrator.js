/**
 * Narrator — 2단계 AI 대화 에이전트
 *
 * 사용자 질문 → 계산 도구 호출 → 답변 생성의 멀티턴 루프를 관리한다.
 * AI는 직접 계산하지 않고 도구가 반환한 결과만 인용한다.
 */

import { callClaude, extractText, extractToolUses } from './client.js';
import { toolSchemas, executeToolUse } from './tools/calc-tools.js';
import { webSearchTool } from './tools/web-search.js';

// system prompt를 정적 임포트 (Vite/번들러 없이 fetch로 로드)
async function loadSystemPrompt() {
  if (loadSystemPrompt._cached) return loadSystemPrompt._cached;
  const res = await fetch(new URL('./prompts/narrator-system.txt', import.meta.url));
  loadSystemPrompt._cached = await res.text();
  return loadSystemPrompt._cached;
}

const MAX_TOOL_ROUNDS = 8;  // 도구 호출 무한루프 방지

/**
 * 사용자 메시지 한 번에 대한 응답 생성 (도구 자동 처리 포함)
 *
 * @param {object} p
 * @param {string} p.apiKey
 * @param {string} p.model
 * @param {Array}  p.history       이전 대화 ({role, content})
 * @param {string} p.userMessage   이번 사용자 입력
 * @param {function} [p.onToolCall]  도구 호출 시 콜백 (UI 표시용)
 * @param {function} [p.onAssistantTurn] 어시스턴트 응답 1턴마다 콜백
 * @returns {Promise<{ finalText: string, toolCalls: Array, updatedHistory: Array }>}
 */
export async function chat({
  apiKey, model, history = [], userMessage,
  onToolCall, onAssistantTurn,
}) {
  const system = await loadSystemPrompt();
  const messages = [...history, { role: 'user', content: userMessage }];
  const tools = [...toolSchemas, webSearchTool];
  const toolCalls = [];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await callClaude({ apiKey, model, system, messages, tools });
    const assistantContent = response.content;
    messages.push({ role: 'assistant', content: assistantContent });
    onAssistantTurn?.(assistantContent);

    const toolUses = extractToolUses(response);
    if (toolUses.length === 0 || response.stop_reason !== 'tool_use') {
      // 최종 응답 도달
      return {
        finalText: extractText(response),
        toolCalls,
        updatedHistory: messages,
      };
    }

    // 클라이언트 도구만 실행 (web_search는 서버측에서 자동 처리되므로 응답에 결과 포함됨)
    const toolResults = [];
    for (const tu of toolUses) {
      if (tu.name === 'web_search') continue;  // 서버 도구는 결과가 이미 포함됨
      const result = executeToolUse(tu);
      toolResults.push(result);
      toolCalls.push({
        name: tu.name, input: tu.input,
        ok: !result.is_error, output: result.content,
      });
      onToolCall?.({ name: tu.name, input: tu.input, output: result.content });
    }

    if (toolResults.length === 0) {
      // tool_use가 있었지만 모두 web_search였다면 더 진행할 게 없음
      return {
        finalText: extractText(response),
        toolCalls,
        updatedHistory: messages,
      };
    }

    messages.push({ role: 'user', content: toolResults });
  }

  throw new Error(`도구 호출이 ${MAX_TOOL_ROUNDS}회를 초과했습니다.`);
}
