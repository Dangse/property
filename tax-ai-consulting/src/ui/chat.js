/**
 * 채팅 UI — 메시지 렌더링 + Narrator 호출 연결
 */

import { chat } from '../ai/narrator.js';
import { renderBreakdown, renderToolCall } from './toggle.js';

let conversationHistory = [];

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

// 간단한 마크다운(굵게/줄바꿈/리스트만)
function renderMarkdown(text) {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, m => `<ul>${m}</ul>`)
    .replace(/\n/g, '<br>');
}

function appendMessage(role, html, container) {
  const el = document.createElement('div');
  el.className = `msg msg-${role}`;
  el.innerHTML = `
    <div class="msg-role">${role === 'user' ? '의뢰인' : 'AI 컨설턴트'}</div>
    <div class="msg-body">${html}</div>
  `;
  container.appendChild(el);
  el.scrollIntoView({ behavior: 'smooth', block: 'end' });
  return el;
}

export function mountChat({ container, inputEl, sendBtn, statusEl, config, getFormSummary }) {
  async function send() {
    const text = inputEl.value.trim();
    if (!text) return;

    const augmented = getFormSummary ? `${getFormSummary()}\n\n[질문]\n${text}` : text;

    appendMessage('user', renderMarkdown(text), container);
    inputEl.value = '';
    inputEl.disabled = true;
    sendBtn.disabled = true;
    statusEl.textContent = '계산 중…';

    const assistantEl = appendMessage('assistant',
      '<em class="thinking">생각 중…</em>', container);
    const bodyEl = assistantEl.querySelector('.msg-body');
    const toolPieces = [];

    try {
      const { finalText, toolCalls, updatedHistory } = await chat({
        apiKey: config.ANTHROPIC_API_KEY,
        model: config.NARRATOR_MODEL,
        history: conversationHistory,
        userMessage: augmented,
        onToolCall: (tc) => {
          toolPieces.push(renderToolCall(tc));
          bodyEl.innerHTML = `<em class="thinking">도구 ${tc.name} 호출 중…</em>${toolPieces.join('')}`;
        },
      });

      conversationHistory = updatedHistory;
      bodyEl.innerHTML = renderMarkdown(finalText || '(빈 응답)') + toolPieces.join('');
      statusEl.textContent = `완료 · 도구 호출 ${toolCalls.length}회`;
    } catch (err) {
      bodyEl.innerHTML = `<div class="error">⚠️ ${escapeHtml(err.message)}</div>`;
      statusEl.textContent = '오류 발생';
    } finally {
      inputEl.disabled = false;
      sendBtn.disabled = false;
      inputEl.focus();
    }
  }

  sendBtn.addEventListener('click', send);
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); send(); }
  });

  return {
    reset() {
      conversationHistory = [];
      container.innerHTML = '';
      statusEl.textContent = '초기화됨';
    },
  };
}
