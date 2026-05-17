/**
 * 입력폼 — 의뢰인 기본정보·자산내역을 수집해 AI 프롬프트에 자동 첨부
 *
 * 실제 시나리오는 너무 많은 필드를 요구하므로, 여기서는 자주 쓰는 핵심값만 받고
 * 나머지는 AI가 대화 중 추가질문으로 채워가는 흐름.
 */

const FIELDS = [
  { id: 'clientName',  label: '의뢰인 성함',           type: 'text' },
  { id: 'taxKind',     label: '관심 세목',             type: 'select',
    options: ['선택안함','양도세','상속세','증여세','취득세','재산세','종부세','시나리오 비교'] },
  { id: 'ownCount',    label: '보유 주택수',           type: 'number', placeholder: '예: 2' },
  { id: 'isAdj',       label: '대상주택 조정대상지역',  type: 'select', options: ['아니오','예'] },
  { id: 'marketPrice', label: '대상자산 시가(원)',     type: 'number', placeholder: '예: 1500000000' },
  { id: 'basePrice',   label: '취득가액(원)',          type: 'number', placeholder: '예: 800000000' },
  { id: 'holdPeriod',  label: '보유기간(년)',          type: 'number', placeholder: '예: 6' },
  { id: 'stayPeriod',  label: '거주기간(년)',          type: 'number', placeholder: '예: 4' },
  { id: 'extraNote',   label: '추가 메모',             type: 'textarea',
    placeholder: '가족구성·기존 증여 이력·특이사항 등' },
];

export function mountInputForm({ container }) {
  container.innerHTML = `
    <h3>의뢰인 정보</h3>
    <form id="client-form" class="client-form" onsubmit="return false">
      ${FIELDS.map(f => {
        if (f.type === 'select') {
          return `<label>${f.label}
            <select name="${f.id}">${f.options.map(o => `<option>${o}</option>`).join('')}</select>
          </label>`;
        }
        if (f.type === 'textarea') {
          return `<label class="full">${f.label}
            <textarea name="${f.id}" rows="3" placeholder="${f.placeholder ?? ''}"></textarea>
          </label>`;
        }
        return `<label>${f.label}
          <input type="${f.type}" name="${f.id}" placeholder="${f.placeholder ?? ''}">
        </label>`;
      }).join('')}
    </form>
  `;

  const form = container.querySelector('#client-form');

  return {
    getSummary() {
      const data = Object.fromEntries(new FormData(form).entries());
      const lines = [];
      const labelOf = id => FIELDS.find(f => f.id === id)?.label ?? id;
      for (const [k, v] of Object.entries(data)) {
        if (!v || v === '선택안함' || v === '아니오') continue;
        lines.push(`- ${labelOf(k)}: ${v}`);
      }
      return lines.length ? `[의뢰인 정보]\n${lines.join('\n')}` : '';
    },
    getValues() {
      return Object.fromEntries(new FormData(form).entries());
    },
  };
}
