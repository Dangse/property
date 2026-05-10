/**
 * 시나리오별 입력 폼 스키마 정의
 *
 * field.type: 'money' | 'year' | 'age' | 'percent' | 'select'
 * recipients: 다중 수증자 입력 테이블 (별도 처리)
 */

const SPACE_OPTIONS = [
  { value: '85', label: '국민주택규모 이하 (85㎡ 이하)' },
  { value: '86', label: '국민주택규모 초과 (85㎡ 초과)' },
];
const HEAVY_OPTIONS = [
  { value: '0', label: '비조정지역' },
  { value: '1', label: '조정지역' },
];

export const SCENARIO_META = [
  { id: 1,  badge: '자녀',   title: '자녀에게 증여할까?\n타인에게 양도할까?',       sub: '2주택자 — 증여세+취득세 vs 양도세' },
  { id: 2,  badge: '자녀',   title: '일반증여할까?\n부담부증여할까?',               sub: '2주택자 — 자녀 일반 vs 부담부 비교' },
  { id: 3,  badge: '분산',   title: '자녀에게만 vs\n여러 명에게 분산증여',          sub: '2주택자 — 손자녀 세대생략 할증 포함' },
  { id: 4,  badge: '분산',   title: '자녀에게만 vs\n여러 명에게 부담부증여',         sub: '2주택자 — 분산 부담부증여 비교' },
  { id: 5,  badge: '배우자', title: '배우자 일반증여 vs\n부담부증여',               sub: '2주택자 — 동일세대 2주택 유지 전제' },
  { id: 6,  badge: '지분',   title: '1주택 지분을\n배우자에게 일반 vs 부담부증여',   sub: '1주택자 — 12억 비과세 적용' },
  { id: 7,  badge: '공동',   title: '공동명의에서\n배우자 단독명의로',              sub: '1주택 공동명의 → 단독명의 전환' },
  { id: 8,  badge: '배우자', title: '배우자에게 증여할까?\n타인에게 양도할까?',      sub: '2주택자 — 배우자증여 vs 타인양도' },
  { id: 9,  badge: '배우자', title: '배우자에게만 vs\n배우자+자녀 분산증여',         sub: '2주택자 — 30세 이상 자녀 별도세대' },
  { id: 10, badge: '배우자', title: '배우자에게만 vs\n여러 명에게 부담부증여',        sub: '2주택자 — 배우자+자녀 분산 부담부' },
];

export const SCENARIO_FORMS = {
  1: {
    sections: [
      {
        title: '증여(양도)하려는 주택',
        fields: [
          { id: 'marketPrice',   label: '시가',    type: 'money', tip: '증여일 전 6개월 매매사례가액 또는 감정가액' },
          { id: 'officialPrice', label: '기준시가', type: 'money', tip: '국토교통부 공동주택 공시가격' },
          { id: 'basePrice',     label: '취득가액', type: 'money' },
          { id: 'holdPeriod',    label: '보유기간', type: 'year' },
          { id: 'stayPeriod',    label: '거주기간', type: 'year' },
          { id: 'space',  label: '전용면적',   type: 'select', options: SPACE_OPTIONS },
          { id: 'heavy',  label: '조정지역여부', type: 'select', options: HEAVY_OPTIONS },
        ],
      },
      {
        title: '계속보유할 주택',
        fields: [
          { id: 'holdOfficialPrice', label: '기준시가', type: 'money' },
          { id: 'holdPeriod2',       label: '보유기간', type: 'year' },
        ],
      },
      {
        title: '관련인',
        fields: [
          { id: 'ownerAge', label: '소유자(양도자) 연령', type: 'age' },
          { id: 'childAge', label: '자녀(수증자) 연령',   type: 'age' },
        ],
      },
    ],
    sample: { marketPrice: 1000000000, officialPrice: 700000000, basePrice: 300000000, holdPeriod: 7, stayPeriod: 3, space: '85', heavy: '0', holdOfficialPrice: 500000000, holdPeriod2: 5, ownerAge: 58, childAge: 30 },
  },

  2: {
    sections: [
      {
        title: '증여하려는 주택',
        fields: [
          { id: 'marketPrice',   label: '시가',    type: 'money' },
          { id: 'officialPrice', label: '기준시가', type: 'money' },
          { id: 'basePrice',     label: '취득가액', type: 'money' },
          { id: 'loanPrice',     label: '승계하는 전세보증금·담보대출', type: 'money' },
          { id: 'holdPeriod',    label: '보유기간', type: 'year' },
          { id: 'stayPeriod',    label: '거주기간', type: 'year' },
          { id: 'space',  label: '전용면적',   type: 'select', options: SPACE_OPTIONS },
          { id: 'heavy',  label: '조정지역여부', type: 'select', options: HEAVY_OPTIONS },
        ],
      },
      {
        title: '계속보유할 주택',
        fields: [
          { id: 'holdOfficialPrice', label: '기준시가', type: 'money' },
          { id: 'holdPeriod2',       label: '보유기간', type: 'year' },
        ],
      },
      {
        title: '관련인',
        fields: [
          { id: 'ownerAge', label: '소유자(증여자) 연령', type: 'age' },
          { id: 'childAge', label: '자녀(수증자) 연령',   type: 'age' },
        ],
      },
    ],
    sample: { marketPrice: 1000000000, officialPrice: 700000000, basePrice: 300000000, loanPrice: 300000000, holdPeriod: 7, stayPeriod: 3, space: '85', heavy: '0', holdOfficialPrice: 500000000, holdPeriod2: 5, ownerAge: 58, childAge: 30 },
  },

  3: {
    sections: [
      {
        title: '증여하려는 주택',
        fields: [
          { id: 'marketPrice',   label: '시가',    type: 'money' },
          { id: 'officialPrice', label: '기준시가', type: 'money' },
          { id: 'holdPeriod',    label: '보유기간', type: 'year' },
          { id: 'stayPeriod',    label: '거주기간', type: 'year' },
          { id: 'space',  label: '전용면적',   type: 'select', options: SPACE_OPTIONS },
          { id: 'heavy',  label: '조정지역여부', type: 'select', options: HEAVY_OPTIONS },
        ],
      },
      {
        title: '계속보유할 주택 / 소유자',
        fields: [
          { id: 'holdOfficialPrice', label: '기준시가', type: 'money' },
          { id: 'holdPeriod2',       label: '보유기간', type: 'year' },
          { id: 'ownerAge',          label: '소유자 연령', type: 'age' },
        ],
      },
      {
        title: '분산증여 내역 (지분금액 0이면 미포함)',
        type: 'recipients',
        rows: [
          { id: 'child',       label: '자녀',        priceId: 'childPrice',       ageId: 'childAge' },
          { id: 'childSpouse', label: '자녀의배우자', priceId: 'childSpousePrice', ageId: 'childSpouseAge', optional: true },
          { id: 'grand1',      label: '손자녀1',      priceId: 'grand1Price',      ageId: 'grand1Age',      optional: true },
          { id: 'grand2',      label: '손자녀2',      priceId: 'grand2Price',      ageId: 'grand2Age',      optional: true },
          { id: 'grand3',      label: '손자녀3',      priceId: 'grand3Price',      ageId: 'grand3Age',      optional: true },
        ],
      },
    ],
    sample: { marketPrice: 1000000000, officialPrice: 700000000, holdPeriod: 7, stayPeriod: 3, space: '85', heavy: '0', holdOfficialPrice: 500000000, holdPeriod2: 5, ownerAge: 58, childPrice: 500000000, childAge: 32, childSpousePrice: 200000000, childSpouseAge: 30, grand1Price: 150000000, grand1Age: 5, grand2Price: 150000000, grand2Age: 3, grand3Price: 0, grand3Age: 0 },
  },

  4: {
    sections: [
      {
        title: '증여하려는 주택',
        fields: [
          { id: 'marketPrice',   label: '시가',    type: 'money' },
          { id: 'officialPrice', label: '기준시가', type: 'money' },
          { id: 'basePrice',     label: '취득가액', type: 'money' },
          { id: 'loanPrice',     label: '승계하는 전세보증금·담보대출', type: 'money' },
          { id: 'holdPeriod',    label: '보유기간', type: 'year' },
          { id: 'stayPeriod',    label: '거주기간', type: 'year' },
          { id: 'space',  label: '전용면적',   type: 'select', options: SPACE_OPTIONS },
          { id: 'heavy',  label: '조정지역여부', type: 'select', options: HEAVY_OPTIONS },
        ],
      },
      {
        title: '계속보유할 주택 / 소유자',
        fields: [
          { id: 'holdOfficialPrice', label: '기준시가', type: 'money' },
          { id: 'holdPeriod2',       label: '보유기간', type: 'year' },
          { id: 'ownerAge',          label: '소유자 연령', type: 'age' },
        ],
      },
      {
        title: '분산증여 내역 (지분금액 0이면 미포함)',
        type: 'recipients',
        rows: [
          { id: 'child',       label: '자녀',        priceId: 'childPrice',       ageId: 'childAge' },
          { id: 'childSpouse', label: '자녀의배우자', priceId: 'childSpousePrice', ageId: 'childSpouseAge', optional: true },
          { id: 'grand1',      label: '손자녀1',      priceId: 'grand1Price',      ageId: 'grand1Age',      optional: true },
          { id: 'grand2',      label: '손자녀2',      priceId: 'grand2Price',      ageId: 'grand2Age',      optional: true },
          { id: 'grand3',      label: '손자녀3',      priceId: 'grand3Price',      ageId: 'grand3Age',      optional: true },
        ],
      },
    ],
    sample: { marketPrice: 1000000000, officialPrice: 700000000, basePrice: 300000000, loanPrice: 300000000, holdPeriod: 7, stayPeriod: 3, space: '85', heavy: '0', holdOfficialPrice: 500000000, holdPeriod2: 5, ownerAge: 58, childPrice: 500000000, childAge: 32, childSpousePrice: 200000000, childSpouseAge: 30, grand1Price: 150000000, grand1Age: 5, grand2Price: 150000000, grand2Age: 3, grand3Price: 0, grand3Age: 0 },
  },

  5: {
    sections: [
      {
        title: '증여하려는 주택',
        fields: [
          { id: 'marketPrice',   label: '시가',    type: 'money' },
          { id: 'officialPrice', label: '기준시가', type: 'money' },
          { id: 'basePrice',     label: '취득가액', type: 'money' },
          { id: 'loanPrice',     label: '승계하는 전세보증금·담보대출', type: 'money' },
          { id: 'holdPeriod',    label: '보유기간', type: 'year' },
          { id: 'stayPeriod',    label: '거주기간', type: 'year' },
          { id: 'space',  label: '전용면적',   type: 'select', options: SPACE_OPTIONS },
          { id: 'heavy',  label: '조정지역여부', type: 'select', options: HEAVY_OPTIONS },
        ],
      },
      {
        title: '계속보유할 주택',
        fields: [
          { id: 'holdOfficialPrice', label: '기준시가', type: 'money' },
          { id: 'holdPeriod2',       label: '보유기간', type: 'year' },
        ],
      },
      {
        title: '관련인',
        fields: [
          { id: 'ownerAge',  label: '소유자(증여자) 연령', type: 'age' },
          { id: 'spouseAge', label: '배우자(수증자) 연령', type: 'age' },
        ],
      },
    ],
    sample: { marketPrice: 1000000000, officialPrice: 700000000, basePrice: 300000000, loanPrice: 300000000, holdPeriod: 7, stayPeriod: 3, space: '85', heavy: '0', holdOfficialPrice: 500000000, holdPeriod2: 5, ownerAge: 58, spouseAge: 55 },
  },

  6: {
    sections: [
      {
        title: '증여하려는 주택 (전체)',
        fields: [
          { id: 'marketPrice',   label: '시가 (전체)',    type: 'money' },
          { id: 'officialPrice', label: '기준시가 (전체)', type: 'money' },
          { id: 'basePrice',     label: '취득가액 (전체)', type: 'money' },
          { id: 'loanPrice',     label: '전세보증금·담보대출 (전체)', type: 'money' },
          { id: 'partRate',      label: '배우자에게 증여할 지분', type: 'percent', tip: '예: 50 (50% 입력)' },
          { id: 'holdPeriod',    label: '보유기간', type: 'year' },
          { id: 'stayPeriod',    label: '거주기간', type: 'year' },
          { id: 'space',  label: '전용면적',   type: 'select', options: SPACE_OPTIONS },
          { id: 'heavy',  label: '조정지역여부', type: 'select', options: HEAVY_OPTIONS },
        ],
      },
      {
        title: '관련인',
        fields: [
          { id: 'ownerAge',  label: '소유자(증여자) 연령', type: 'age' },
          { id: 'spouseAge', label: '배우자(수증자) 연령', type: 'age' },
        ],
      },
    ],
    sample: { marketPrice: 1000000000, officialPrice: 700000000, basePrice: 300000000, loanPrice: 200000000, partRate: 50, holdPeriod: 8, stayPeriod: 5, space: '85', heavy: '0', ownerAge: 58, spouseAge: 55 },
  },

  7: {
    sections: [
      {
        title: '주택 (전체)',
        fields: [
          { id: 'marketPrice',   label: '시가 (전체)',    type: 'money' },
          { id: 'officialPrice', label: '기준시가 (전체)', type: 'money' },
          { id: 'basePrice',     label: '취득가액 (전체)', type: 'money' },
          { id: 'loanPrice',     label: '전세보증금·담보대출 (전체)', type: 'money' },
          { id: 'ownerRate',     label: '소유자 현재 지분', type: 'percent', tip: '예: 50 (50% 입력)' },
          { id: 'holdPeriod',    label: '소유자 보유기간', type: 'year' },
          { id: 'stayPeriod',    label: '소유자 거주기간', type: 'year' },
          { id: 'space',  label: '전용면적',   type: 'select', options: SPACE_OPTIONS },
          { id: 'heavy',  label: '조정지역여부', type: 'select', options: HEAVY_OPTIONS },
        ],
      },
      {
        title: '관련인',
        fields: [
          { id: 'ownerAge',         label: '소유자(증여자) 연령', type: 'age' },
          { id: 'spouseAge',        label: '배우자(수증자) 연령', type: 'age' },
          { id: 'spouseHoldPeriod', label: '배우자 보유기간',     type: 'year' },
        ],
      },
    ],
    sample: { marketPrice: 1000000000, officialPrice: 700000000, basePrice: 300000000, loanPrice: 200000000, ownerRate: 50, holdPeriod: 8, stayPeriod: 5, space: '85', heavy: '0', ownerAge: 58, spouseAge: 55, spouseHoldPeriod: 8 },
  },

  8: {
    sections: [
      {
        title: '증여(양도)하려는 주택',
        fields: [
          { id: 'marketPrice',   label: '시가',    type: 'money' },
          { id: 'officialPrice', label: '기준시가', type: 'money' },
          { id: 'basePrice',     label: '취득가액', type: 'money' },
          { id: 'holdPeriod',    label: '보유기간', type: 'year' },
          { id: 'stayPeriod',    label: '거주기간', type: 'year' },
          { id: 'space',  label: '전용면적',   type: 'select', options: SPACE_OPTIONS },
          { id: 'heavy',  label: '조정지역여부', type: 'select', options: HEAVY_OPTIONS },
        ],
      },
      {
        title: '계속보유할 주택',
        fields: [
          { id: 'holdOfficialPrice', label: '기준시가', type: 'money' },
          { id: 'holdPeriod2',       label: '보유기간', type: 'year' },
        ],
      },
      {
        title: '관련인',
        fields: [
          { id: 'ownerAge',  label: '소유자(양도자) 연령', type: 'age' },
          { id: 'spouseAge', label: '배우자(수증자) 연령', type: 'age' },
        ],
      },
    ],
    sample: { marketPrice: 1000000000, officialPrice: 700000000, basePrice: 300000000, holdPeriod: 7, stayPeriod: 3, space: '85', heavy: '0', holdOfficialPrice: 500000000, holdPeriod2: 5, ownerAge: 58, spouseAge: 55 },
  },

  9: {
    sections: [
      {
        title: '증여하려는 주택',
        fields: [
          { id: 'marketPrice',   label: '시가',    type: 'money' },
          { id: 'officialPrice', label: '기준시가', type: 'money' },
          { id: 'holdPeriod',    label: '보유기간', type: 'year' },
          { id: 'space',  label: '전용면적',   type: 'select', options: SPACE_OPTIONS },
          { id: 'heavy',  label: '조정지역여부', type: 'select', options: HEAVY_OPTIONS },
        ],
      },
      {
        title: '계속보유할 주택 / 소유자',
        fields: [
          { id: 'holdOfficialPrice', label: '기준시가', type: 'money' },
          { id: 'holdPeriod2',       label: '보유기간', type: 'year' },
          { id: 'ownerAge',          label: '소유자 연령', type: 'age' },
        ],
      },
      {
        title: '분산증여 내역 (지분금액 0이면 미포함 / 자녀 30세 이상 → 별도세대 간주)',
        type: 'recipients',
        rows: [
          { id: 'spouse', label: '배우자',  priceId: 'spousePrice', ageId: 'spouseAge' },
          { id: 'child1', label: '자녀1',   priceId: 'child1Price', ageId: 'child1Age', optional: true },
          { id: 'child2', label: '자녀2',   priceId: 'child2Price', ageId: 'child2Age', optional: true },
          { id: 'child3', label: '자녀3',   priceId: 'child3Price', ageId: 'child3Age', optional: true },
          { id: 'child4', label: '자녀4',   priceId: 'child4Price', ageId: 'child4Age', optional: true },
        ],
      },
    ],
    sample: { marketPrice: 1000000000, officialPrice: 700000000, holdPeriod: 7, space: '85', heavy: '0', holdOfficialPrice: 500000000, holdPeriod2: 5, ownerAge: 58, spousePrice: 500000000, spouseAge: 55, child1Price: 250000000, child1Age: 32, child2Price: 250000000, child2Age: 28, child3Price: 0, child3Age: 0, child4Price: 0, child4Age: 0 },
  },

  10: {
    sections: [
      {
        title: '증여하려는 주택',
        fields: [
          { id: 'marketPrice',   label: '시가',    type: 'money' },
          { id: 'officialPrice', label: '기준시가', type: 'money' },
          { id: 'basePrice',     label: '취득가액', type: 'money' },
          { id: 'loanPrice',     label: '승계하는 전세보증금·담보대출', type: 'money' },
          { id: 'holdPeriod',    label: '보유기간', type: 'year' },
          { id: 'stayPeriod',    label: '거주기간', type: 'year' },
          { id: 'space',  label: '전용면적',   type: 'select', options: SPACE_OPTIONS },
          { id: 'heavy',  label: '조정지역여부', type: 'select', options: HEAVY_OPTIONS },
        ],
      },
      {
        title: '계속보유할 주택 / 소유자',
        fields: [
          { id: 'holdOfficialPrice', label: '기준시가', type: 'money' },
          { id: 'holdPeriod2',       label: '보유기간', type: 'year' },
          { id: 'ownerAge',          label: '소유자 연령', type: 'age' },
        ],
      },
      {
        title: '분산증여 내역 (지분금액 0이면 미포함)',
        type: 'recipients',
        rows: [
          { id: 'spouse',      label: '배우자',        priceId: 'spousePrice',      ageId: 'spouseAge' },
          { id: 'childSpouse', label: '자녀의배우자',  priceId: 'childSpousePrice', ageId: 'childSpouseAge', optional: true },
          { id: 'child2',      label: '자녀2',         priceId: 'child2Price',      ageId: 'child2Age',      optional: true },
          { id: 'child3',      label: '자녀3',         priceId: 'child3Price',      ageId: 'child3Age',      optional: true },
          { id: 'child4',      label: '자녀4',         priceId: 'child4Price',      ageId: 'child4Age',      optional: true },
        ],
      },
    ],
    sample: { marketPrice: 1000000000, officialPrice: 700000000, basePrice: 300000000, loanPrice: 300000000, holdPeriod: 7, stayPeriod: 3, space: '85', heavy: '0', holdOfficialPrice: 500000000, holdPeriod2: 5, ownerAge: 58, spousePrice: 500000000, spouseAge: 55, childSpousePrice: 250000000, childSpouseAge: 30, child2Price: 250000000, child2Age: 28, child3Price: 0, child3Age: 0, child4Price: 0, child4Age: 0 },
  },
};
