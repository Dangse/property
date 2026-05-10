/**
 * AI 채팅 패널 — 결과 화면 하단에 통합
 *
 * - 결과 컨텍스트를 시스템 프롬프트로 주입
 * - 사용자 후속 질문에 스트리밍 답변
 * - 마크다운 → HTML 간단 변환
 */

import { chatStream }        from '../ai/chat.js';
import { buildSystemPrompt } from '../ai/system-prompt.js';

/** 추천 후속 질문 */
const SUGGESTED_QUESTIONS = [
  '두 방법 중 어느 쪽이 왜 더 유리한가요?',
  '세무조사 위험은 어떻게 다른가요?',
  '5년 내 다시 양도하면 어떻게 되나요?',
  '실거주 요건은 어떤 영향을 주나요?',
];

/**
 * 결과 화면에 채팅 패널 HTML을 반환
 */
export function renderChatPanelHTML() {
  const suggestions = SUGGESTED_QUESTIONS.map(q =>
    `<button type="button" class="chat-suggest" data-q="${escAttr(q)}">${escHtml(q)}</button>`
  ).join('');

  return `
    <div class="result-card chat-card" id="chat-card">
      <h4>💬 AI 컨설턴트에게 질문하기</h4>
      <p style="font-size:13px;color:var(--text-muted);margin-bottom:14px">
        계산 결과에 대해 궁금한 점을 자유롭게 물어보세요. 관련 법령과 함께 답변드립니다.
      </p>

      <div class="chat-suggests">${suggestions}</div>

      <div class="chat-messages" id="chat-messages"></div>

      <form class="chat-input-row" id="chat-form">
        <textarea id="chat-input" placeholder="질문을 입력하세요... (Shift+Enter 줄바꿈, Enter 전송)"
                  rows="2" autocomplete="off"></textarea>
        <button type="submit" class="chat-send-btn" id="chat-send">전송</button>
      </form>
    </div>
  `;
}

/**
 * 채팅 패널 활성화 (DOM에 렌더링된 후 호출)
 * @param {object} result 시나리오 결과
 */
export function initChatPanel(result) {
  const form    = document.getElementById('chat-form');
  const input   = document.getElementById('chat-input');
  const sendBtn = document.getElementById('chat-send');
  const list    = document.getElementById('chat-messages');
  if (!form || !input || !list) return;

  const system  = buildSystemPrompt(result);
  const history = []; // { role, content }

  // 추천 질문 클릭
  document.querySelectorAll('.chat-suggest').forEach(btn => {
    btn.addEventListener('click', () => {
      input.value = btn.dataset.q || '';
      input.focus();
    });
  });

  // Enter 전송 (Shift+Enter 줄바꿈)
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      form.requestSubmit();
    }
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text || sendBtn.disabled) return;

    appendMsg(list, 'user', text);
    history.push({ role: 'user', content: text });
    input.value = '';
    sendBtn.disabled = true;
    sendBtn.textContent = '답변 중…';

    const aiBubble = appendMsg(list, 'assistant', '');
    const aiBody   = aiBubble.querySelector('.chat-body');
    let   buffer   = '';

    try {
      const fullText = await chatStream({
        messages: history,
        system,
        maxTokens: 4096,
        onDelta: chunk => {
          buffer += chunk;
          aiBody.innerHTML = mdToHtml(buffer);
          list.scrollTop = list.scrollHeight;
        },
      });
      history.push({ role: 'assistant', content: fullText });
    } catch (err) {
      console.error(err);
      aiBody.innerHTML = `<span style="color:var(--danger)">⚠ 오류: ${escHtml(err.message)}</span>`;
    } finally {
      sendBtn.disabled = false;
      sendBtn.textContent = '전송';
      input.focus();
    }
  });
}

// ── DOM 헬퍼 ──────────────────────────────────────────────────
function appendMsg(list, role, text) {
  const el = document.createElement('div');
  el.className = `chat-msg chat-msg-${role}`;
  el.innerHTML = `
    <div class="chat-avatar">${role === 'user' ? '나' : 'AI'}</div>
    <div class="chat-body">${role === 'assistant' && !text ? '<span class="chat-typing">…</span>' : escHtml(text)}</div>
  `;
  list.appendChild(el);
  list.scrollTop = list.scrollHeight;
  return el;
}

// ── 마크다운 → HTML (간단) ────────────────────────────────────
function mdToHtml(md) {
  let html = escHtml(md);

  // 코드 블록 ```...```
  html = html.replace(/```([\s\S]*?)```/g, (_, code) =>
    `<pre><code>${code.trim()}</code></pre>`);

  // 인라인 코드
  html = html.replace(/`([^`\n]+)`/g, '<code>$1</code>');

  // 헤딩 ##, ###
  html = html.replace(/^### (.+)$/gm, '<h5>$1</h5>');
  html = html.replace(/^## (.+)$/gm,  '<h4>$1</h4>');

  // 굵게/기울임
  html = html.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em>$1</em>');

  // 리스트 항목
  html = html.replace(/^[ \t]*[-*] (.+)$/gm, '<li>$1</li>');
  // 인접한 <li>를 <ul>로 묶기
  html = html.replace(/(<li>[\s\S]*?<\/li>(?:\n<li>[\s\S]*?<\/li>)*)/g, '<ul>$1</ul>');

  // 줄바꿈 → <br> (단, 블록 요소 내부 제외 위해 간단히)
  html = html.replace(/\n{2,}/g, '</p><p>');
  html = html.replace(/\n/g, '<br>');
  html = `<p>${html}</p>`;

  // 빈 <p></p> 제거 + 블록 요소 주변 <p> 정리
  html = html.replace(/<p><\/p>/g, '');
  html = html.replace(/<p>(\s*<(ul|h4|h5|pre)[\s\S]*?<\/\2>)\s*<\/p>/g, '$1');

  return html;
}

function escHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escAttr(s) {
  return escHtml(s).replace(/"/g, '&quot;');
}
