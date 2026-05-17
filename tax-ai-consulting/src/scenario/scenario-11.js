/**
 * 시나리오 11: 상속 종합 시나리오
 *
 * 한 번의 상속 개시에서 발생하는 5개 세금을 한 번에 산출·비교한다.
 *   ① 상속세 본세 (상증법)
 *   ② 상속 취득세 (지방세법 §11①4) — 주택/건물/농지/임야별
 *   ③ 상속 후 재산세 변화 (상속 전 vs 후)
 *   ④ 상속 후 종부세 변화 (상속 전 vs 후)
 *      └ 상속주택 5년 주택수 제외 특례(종부세법 §15의2) 적용 여부 옵션
 *   ⑤ 상속 후 양도세 — 3개 신고전략 비교
 *      (a) 6개월 이내 양도 (양도가 = 평가가 → 양도차익 0)
 *      (b) 시가 신고 후 양도
 *      (c) 기준시가 신고 후 양도
 *
 * 원본: reference Tuzaga `pageinheritreportpremium.php` 의
 *   calculateInheritanceTax / calculateInheritAcquisionTax /
 *   calc_property_tax / calculateComprehensiveTax / calculateTaxes
 * 를 단일 시나리오로 통합.
 *
 * 검증 내역: docs/tax-law-2026.md §2~§5
 */

import {
  INHERIT_ACQ_HOUSE_SINGLE, INHERIT_ACQ_HOUSE_MULTI,
  INHERIT_ACQ_FARMLAND, INHERIT_ACQ_OTHER,
  INHERIT_ACQ_FARMLAND_EDU, INHERIT_ACQ_DEFAULT_EDU,
  INHERIT_ACQ_AG_RATE,
  INHERIT_HOUSE_EXCLUSION_YEARS,
} from '../core/constants.js';
import { calcInheritTax } from '../core/inheritance-tax.js';
import { calcPropertyTax } from '../core/property-tax.js';
import { calcAggrTax } from '../core/comprehensive-tax.js';

const LAW_REF = [
  '상속세및증여세법 §7~§69 (상속세 본세)',
  '지방세법 §11①4 (상속 취득세)',
  '지방세법 §111의2 (상속주택 5년 주택수 제외)',
  '종합부동산세법 §15의2 (상속주택 5년 주택수 제외)',
  '소득세법 §89 (1세대1주택 비과세)',
  '소득세법 §95 (장기보유특별공제)',
  '소득세법 §97의2 (상속 취득시기·취득가액)',
  '소득세법 §104 (양도소득세율)',
];

// ──────────────────────────────────────────────────────────────
// ② 상속 취득세
// ──────────────────────────────────────────────────────────────

/**
 * 자산별 상속 취득세 (취득세 + 농특세 + 교육세)
 *
 * @param {object} p
 * @param {number} p.value     자산가액 [원]
 * @param {number} p.acqRate   취득세율 (예: 0.008, 0.028, 0.023)
 * @param {number} p.eduRate   교육세율 (예: 0.0016, 0.0006)
 * @param {boolean} p.applyAg  농특세 적용 여부 (국민주택규모 85㎡ 초과 시)
 */
function inheritAcqDetail({ value, acqRate, eduRate, applyAg }) {
  const acquisitionTax = Math.round(value * acqRate);
  const eduTax = Math.round(value * eduRate);
  const agTax = applyAg ? Math.round(value * INHERIT_ACQ_AG_RATE) : 0;
  return {
    value, acqRate, eduRate,
    acquisitionTax, agTax, eduTax,
    total: acquisitionTax + agTax + eduTax,
  };
}

/**
 * 상속 취득세 종합
 *
 * @param {object} p
 * @param {number}  p.houseValue           상속 주택가액
 * @param {boolean} p.householdAllNoHouse  세대원 전원 무주택 여부 (1주택 0.8% 특례)
 * @param {number}  p.houseSpace           주택 전용면적 코드 (85=국민주택규모, 86=초과)
 * @param {number}  p.buildingValue        비주거용 건물
 * @param {number}  p.landValue            일반 토지
 * @param {number}  p.farmlandValue        농지
 */
export function calcInheritAcquisitionTax({
  houseValue = 0, householdAllNoHouse = false, houseSpace = 85,
  buildingValue = 0, landValue = 0, farmlandValue = 0,
}) {
  const houseRate = householdAllNoHouse ? INHERIT_ACQ_HOUSE_SINGLE : INHERIT_ACQ_HOUSE_MULTI;
  const house = inheritAcqDetail({
    value: houseValue, acqRate: houseRate,
    eduRate: INHERIT_ACQ_DEFAULT_EDU,
    applyAg: houseSpace === 86 && !householdAllNoHouse,
  });
  const building = inheritAcqDetail({
    value: buildingValue, acqRate: INHERIT_ACQ_OTHER,
    eduRate: INHERIT_ACQ_DEFAULT_EDU, applyAg: true,
  });
  const land = inheritAcqDetail({
    value: landValue, acqRate: INHERIT_ACQ_OTHER,
    eduRate: INHERIT_ACQ_DEFAULT_EDU, applyAg: true,
  });
  const farmland = inheritAcqDetail({
    value: farmlandValue, acqRate: INHERIT_ACQ_FARMLAND,
    eduRate: INHERIT_ACQ_FARMLAND_EDU, applyAg: true,
  });

  return {
    house, building, land, farmland,
    totalAcquisitionTax: house.acquisitionTax + building.acquisitionTax + land.acquisitionTax + farmland.acquisitionTax,
    totalAgTax: house.agTax + building.agTax + land.agTax + farmland.agTax,
    totalEduTax: house.eduTax + building.eduTax + land.eduTax + farmland.eduTax,
    total: house.total + building.total + land.total + farmland.total,
    lawRef: ['지방세법 §11①4(상속 취득세)', '지방세법 §15(세율특례 1주택 0.8%)'],
  };
}

// ──────────────────────────────────────────────────────────────
// ③④ 상속 후 재산세·종부세 변화
// ──────────────────────────────────────────────────────────────

/**
 * 상속 전후 재산세 비교
 *
 * 상속주택 5년 특례 적용 시 상속 후에도 1세대1주택 판정 유지 가능.
 *
 * @param {object} p
 * @param {number}  p.gongsiBefore       상속 전 보유 주택 공시가격
 * @param {number}  p.gongsiInherited    상속받는 주택 공시가격
 * @param {number}  p.ownedHousesBefore  상속 전 주택 수
 * @param {boolean} p.inheritExclusion5y 상속주택 5년 주택수 제외 신청 여부
 */
export function calcInheritPropertyTaxChange({
  gongsiBefore, gongsiInherited,
  ownedHousesBefore, inheritExclusion5y = true,
}) {
  const ownedHousesAfter = ownedHousesBefore + 1;

  const beforeKind = ownedHousesBefore <= 1 ? '1세대1주택' : '다주택';
  const before = calcPropertyTax(beforeKind, gongsiBefore);

  // 상속 후: 5년 특례 적용 시 상속주택을 주택수에서 제외 → 기존이 1주택이면 1세대1주택 유지
  const effectiveHousesAfter = inheritExclusion5y ? ownedHousesBefore : ownedHousesAfter;
  const afterKind = effectiveHousesAfter <= 1 ? '1세대1주택' : '다주택';
  const afterGongsi = gongsiBefore + gongsiInherited;
  const after = calcPropertyTax(afterKind, afterGongsi);

  return {
    before, after,
    appliedExclusion: inheritExclusion5y,
    exclusionYears: INHERIT_HOUSE_EXCLUSION_YEARS,
    changeTotal: after.total - before.total,
    lawRef: ['지방세법 §111(재산세 세율)', '지방세법 §111의2(상속주택 5년 제외)'],
  };
}

/**
 * 상속 전후 종부세 비교
 *
 * @param {object} p
 * @param {number}  p.gongsiBefore       상속 전 공시가격
 * @param {number}  p.gongsiInherited    상속 주택 공시가격
 * @param {number}  p.ownedHousesBefore  상속 전 주택 수
 * @param {number}  p.age                연령 (세액공제용)
 * @param {number}  p.period             보유기간 (세액공제용)
 * @param {boolean} p.inheritExclusion5y 상속주택 5년 특례 신청 여부
 * @param {object}  p.propertyTax        재산세 결과 (공제용)
 */
export function calcInheritAggrTaxChange({
  gongsiBefore, gongsiInherited,
  ownedHousesBefore, age, period,
  inheritExclusion5y = true, propertyTax,
}) {
  const beforeKind = ownedHousesBefore <= 1 ? '1세대1주택' : '다주택';
  const before = calcAggrTax(
    beforeKind, '비조정지역', gongsiBefore, period, age,
    propertyTax.before.propertyTax,
  );

  const effectiveHousesAfter = inheritExclusion5y
    ? ownedHousesBefore
    : ownedHousesBefore + 1;
  const afterKind = effectiveHousesAfter <= 1 ? '1세대1주택' : '다주택';
  const after = calcAggrTax(
    afterKind, '비조정지역',
    gongsiBefore + gongsiInherited, period, age,
    propertyTax.after.propertyTax,
  );

  return {
    before, after,
    appliedExclusion: inheritExclusion5y,
    changeTotal: after.total - before.total,
    lawRef: ['종합부동산세법 §8·9', '종합부동산세법 §15의2(상속주택 5년 제외)'],
  };
}

// ──────────────────────────────────────────────────────────────
// ⑤ 상속 후 양도세 — 3케이스 비교
// ──────────────────────────────────────────────────────────────

/**
 * 양도소득세 누진세율 (소득세법 §104) — 비사업용 토지 +10%p
 */
function transferRate(taxBase, surcharge = 0) {
  let r, dc;
  if      (taxBase <=   14_000_000) { r = 0.06; dc = 0; }
  else if (taxBase <=   50_000_000) { r = 0.15; dc = 1_260_000; }
  else if (taxBase <=   88_000_000) { r = 0.24; dc = 5_760_000; }
  else if (taxBase <=  150_000_000) { r = 0.35; dc = 15_440_000; }
  else if (taxBase <=  300_000_000) { r = 0.38; dc = 19_940_000; }
  else if (taxBase <=  500_000_000) { r = 0.40; dc = 25_940_000; }
  else if (taxBase <= 1_000_000_000){ r = 0.42; dc = 35_940_000; }
  else                              { r = 0.45; dc = 65_940_000; }
  return { rate: r + surcharge, accDeduct: dc };
}

/**
 * 장기보유특별공제 (상속 후 양도 — 다주택·일반 보유공제 트랙)
 * 3년 6% / 4년 8% / 5년 이상 = 2% × 보유연수 (최대 30%)
 */
function longTermDeductRate(holdingPeriod) {
  if (holdingPeriod < 3) return 0;
  if (holdingPeriod < 4) return 0.06;
  if (holdingPeriod < 5) return 0.08;
  return Math.min(0.30, 0.02 * holdingPeriod);
}

/**
 * 상속 후 양도세 — 3개 신고전략
 *
 * @param {object} p
 * @param {number}  p.transferPrice     양도가액
 * @param {number}  p.marketPriceAtInherit  상속 당시 시가
 * @param {number}  p.officialPriceAtInherit 상속 당시 기준시가
 * @param {number}  p.holdingPeriod     상속개시일부터 양도일까지 보유기간 [년]
 * @param {boolean} p.isNonBusinessUse  비사업용토지 여부
 */
export function calcInheritTransferTax({
  transferPrice, marketPriceAtInherit, officialPriceAtInherit,
  holdingPeriod, isNonBusinessUse = false,
}) {
  const cases = [
    // (a) 6개월 이내 양도 — 양도가 = 취득가, 보유기간 0.5년
    { id: '6m', label: '6개월 이내 양도',     acquisitionPrice: transferPrice,         hold: 0.5 },
    // (b) 시가 신고 — 상속 당시 시가로 평가신고 후 양도
    { id: 'market',   label: '시가 신고 후 양도',     acquisitionPrice: marketPriceAtInherit,  hold: holdingPeriod },
    // (c) 기준시가 신고 — 상속 당시 기준시가로 평가신고 후 양도
    { id: 'official', label: '기준시가 신고 후 양도', acquisitionPrice: officialPriceAtInherit, hold: holdingPeriod },
  ];

  const results = cases.map(c => {
    const capitalGain = Math.max(transferPrice - c.acquisitionPrice, 0);
    const ltRate = longTermDeductRate(c.hold);
    const longTermDeduction = Math.floor(capitalGain * ltRate);
    const taxableIncome = capitalGain - longTermDeduction;
    // 6개월 이내(case a)는 기본공제 250만 미적용 (양도차익 0 가정)
    const basicDeduct = c.id === '6m' ? 0 : 2_500_000;
    const taxBase = Math.max(taxableIncome - basicDeduct, 0);
    const surcharge = isNonBusinessUse && c.hold >= 5 ? 0.10 : 0;
    const { rate, accDeduct } = transferRate(taxBase, surcharge);
    const transferTax = Math.floor(Math.max(taxBase * rate - accDeduct, 0));
    const localIncomeTax = Math.floor(transferTax * 0.1);
    return {
      id: c.id, label: c.label,
      acquisitionPrice: c.acquisitionPrice, holdingPeriod: c.hold,
      capitalGain, longTermDeductRate: ltRate, longTermDeduction,
      taxableIncome, taxBase,
      appliedRate: rate, accDeduct,
      transferTax, localIncomeTax,
      total: transferTax + localIncomeTax,
    };
  });

  return {
    cases: results,
    lawRef: [
      '소득세법 §95(장기보유특별공제)',
      '소득세법 §97의2(상속 취득시기·취득가액)',
      '소득세법 §104(양도소득세율)',
    ],
  };
}

// ──────────────────────────────────────────────────────────────
// 시나리오 11 메인
// ──────────────────────────────────────────────────────────────

/**
 * @param {object} inputs
 *
 * [상속세 본세 — calcInheritTax 입력 일체 전달]
 * @param {object} inputs.inheritance — calcInheritTax inputs
 *
 * [상속 취득세]
 * @param {object} inputs.acquisition — calcInheritAcquisitionTax inputs
 *
 * [상속 후 재산세·종부세]
 * @param {object} inputs.holding
 *   - gongsiBefore, gongsiInherited, ownedHousesBefore
 *   - age, period (종부세 세액공제용)
 *   - inheritExclusion5y (상속주택 5년 특례 신청 여부)
 *
 * [상속 후 양도세]
 * @param {object} [inputs.transfer] — calcInheritTransferTax inputs (선택)
 */
export function runScenario11(inputs = {}) {
  const {
    inheritance = {},
    acquisition = {},
    holding = {},
    transfer = null,
  } = inputs;

  // ① 상속세 본세
  const inheritTax = calcInheritTax(inheritance);

  // ② 상속 취득세
  const acquisitionTax = calcInheritAcquisitionTax(acquisition);

  // ③ 재산세 변화
  const propertyTaxChange = calcInheritPropertyTaxChange(holding);

  // ④ 종부세 변화
  const aggrTaxChange = calcInheritAggrTaxChange({
    ...holding,
    propertyTax: { before: propertyTaxChange.before, after: propertyTaxChange.after },
  });

  // ⑤ 양도세 (선택)
  const transferTax = transfer ? calcInheritTransferTax(transfer) : null;

  const holdingChange = propertyTaxChange.changeTotal + aggrTaxChange.changeTotal;

  return {
    scenarioId: 11,
    title: '상속 종합 — 상속세·취득세·보유세·양도세 일괄 산출',
    inputs,
    inheritTax: {
      tax: inheritTax.tax,
      breakdown: inheritTax.breakdown,
      detail: inheritTax.detail,
    },
    acquisitionTax,
    propertyTaxChange,
    aggrTaxChange,
    transferTax,
    summary: {
      inheritTaxTotal: inheritTax.tax,
      acquisitionTaxTotal: acquisitionTax.total,
      holdingTaxChange: holdingChange,
      transferTaxMinCase: transferTax
        ? Math.min(...transferTax.cases.map(c => c.total))
        : 0,
      transferTaxMaxCase: transferTax
        ? Math.max(...transferTax.cases.map(c => c.total))
        : 0,
    },
    lawRef: LAW_REF,
  };
}
