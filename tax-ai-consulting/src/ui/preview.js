/**
 * 보고서 미리보기 — Phase 5에서 docx export로 확장될 예정
 * 현재는 채팅 응답을 모아서 표시만 한다.
 */

export function mountPreview({ container }) {
  container.innerHTML = `
    <h3>보고서 초안</h3>
    <div id="report-body" class="report-body">
      <em>대화가 진행되면 여기에 정리된 보고서 초안이 누적됩니다. (Phase 5 docx export 예정)</em>
    </div>
  `;
  return {
    append(html) {
      const body = container.querySelector('#report-body');
      const placeholder = body.querySelector('em');
      if (placeholder) placeholder.remove();
      const section = document.createElement('section');
      section.innerHTML = html;
      body.appendChild(section);
    },
    clear() {
      container.querySelector('#report-body').innerHTML =
        '<em>초기화됨</em>';
    },
  };
}
