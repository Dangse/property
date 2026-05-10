/**
 * Claude API 채팅 클라이언트 (Cloudflare Worker 프록시 경유)
 *
 * - SSE 스트리밍 응답 파싱
 * - 토큰 단위로 onDelta 콜백 호출
 * - AbortController 지원 (사용자 취소)
 */

/** Cloudflare Worker URL — 배포 후 실제 URL로 교체 */
export const WORKER_URL = 'https://tax-ai-proxy.your-subdomain.workers.dev/api/chat';

/**
 * Claude에 메시지 전송하고 스트리밍 응답을 받음
 *
 * @param {object}   opts
 * @param {Array}    opts.messages   대화 히스토리 [{ role, content }]
 * @param {string}   opts.system     시스템 프롬프트
 * @param {number}   [opts.maxTokens=4096]
 * @param {Function} opts.onDelta    텍스트 델타 수신 콜백 (text: string) => void
 * @param {AbortSignal} [opts.signal]
 * @returns {Promise<string>} 전체 응답 텍스트
 */
export async function chatStream({ messages, system, maxTokens = 4096, onDelta, signal }) {
  const res = await fetch(WORKER_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ messages, system, max_tokens: maxTokens }),
    signal,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`프록시 오류 ${res.status}: ${errText || res.statusText}`);
  }

  if (!res.body) throw new Error('스트림 응답을 받을 수 없습니다.');

  const reader  = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let   buffer  = '';
  let   fullText = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE 메시지는 빈 줄(\n\n)로 구분
    let sepIdx;
    while ((sepIdx = buffer.indexOf('\n\n')) !== -1) {
      const rawEvent = buffer.slice(0, sepIdx);
      buffer = buffer.slice(sepIdx + 2);

      // event: ...\ndata: ... 형식
      const dataLine = rawEvent.split('\n').find(l => l.startsWith('data:'));
      if (!dataLine) continue;
      const dataStr = dataLine.slice(5).trim();
      if (!dataStr || dataStr === '[DONE]') continue;

      try {
        const evt = JSON.parse(dataStr);
        if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
          const chunk = evt.delta.text;
          fullText += chunk;
          onDelta?.(chunk);
        } else if (evt.type === 'message_stop') {
          return fullText;
        } else if (evt.type === 'error') {
          throw new Error(`Claude API 오류: ${evt.error?.message || JSON.stringify(evt.error)}`);
        }
      } catch (e) {
        if (e instanceof SyntaxError) continue; // 잘린 청크는 건너뛰기
        throw e;
      }
    }
  }

  return fullText;
}
