import { describe, it, expect } from 'vitest';
import {
  calcInheritTax, calcInheritTariff,
  calcFuneralDeduct, calcFinancialDeduct, calcCohabitationDeduct,
  calcBasicAndPersonalDeduct, calcSpouseDeduct, shortTermReinheritRate,
} from '../../src/core/inheritance-tax.js';

describe('calcInheritTariff — 누진세율표 (상증법 §26)', () => {
  it('1억 이하 → 10%, 누진공제 0', () => {
    expect(calcInheritTariff(100_000_000)).toEqual({
      rawTax: 10_000_000, taxRate: 0.10, accDeduct: 0,
    });
  });
  it('5억 → 20%, 누진공제 1천만 → 9천만', () => {
    expect(calcInheritTariff(500_000_000).rawTax).toBe(90_000_000);
  });
  it('10억 → 30%, 누진공제 6천만 → 2.4억', () => {
    expect(calcInheritTariff(1_000_000_000).rawTax).toBe(240_000_000);
  });
  it('30억 → 40%, 누진공제 1.6억 → 10.4억', () => {
    expect(calcInheritTariff(3_000_000_000).rawTax).toBe(1_040_000_000);
  });
  it('50억 → 50%, 누진공제 4.6억 → 20.4억', () => {
    expect(calcInheritTariff(5_000_000_000).rawTax).toBe(2_040_000_000);
  });
  it('과세표준 0이면 세액 0', () => {
    expect(calcInheritTariff(0).rawTax).toBe(0);
  });
});

describe('calcFuneralDeduct — 장례비 공제 (상증법 §14)', () => {
  it('일반장례비 입력 < 500만이면 500만 일률공제', () => {
    expect(calcFuneralDeduct(3_000_000, 0)).toBe(5_000_000);
  });
  it('일반장례비 1천만 초과는 1천만 한도', () => {
    expect(calcFuneralDeduct(20_000_000, 0)).toBe(10_000_000);
  });
  it('봉안시설 별도 500만 한도', () => {
    expect(calcFuneralDeduct(10_000_000, 8_000_000)).toBe(15_000_000);
  });
  it('합계 최대 1,500만', () => {
    expect(calcFuneralDeduct(50_000_000, 50_000_000)).toBe(15_000_000);
  });
});

describe('calcFinancialDeduct — 금융재산상속공제 (상증법 §22)', () => {
  it('순금융재산 0 이하 → 0', () => {
    expect(calcFinancialDeduct(0)).toBe(0);
    expect(calcFinancialDeduct(-1_000_000)).toBe(0);
  });
  it('2천만 이하 → 전액', () => {
    expect(calcFinancialDeduct(15_000_000)).toBe(15_000_000);
  });
  it('1억 → 20%인 2천만, 최소 2천만 충족', () => {
    expect(calcFinancialDeduct(100_000_000)).toBe(20_000_000);
  });
  it('5억 → 20%인 1억', () => {
    expect(calcFinancialDeduct(500_000_000)).toBe(100_000_000);
  });
  it('20억 → 20%인 4억이지만 2억 한도', () => {
    expect(calcFinancialDeduct(2_000_000_000)).toBe(200_000_000);
  });
});

describe('calcCohabitationDeduct — 동거주택상속공제 (상증법 §23의2)', () => {
  it('주택가액 − 채무, 6억 한도', () => {
    expect(calcCohabitationDeduct(800_000_000, 100_000_000)).toBe(600_000_000);
  });
  it('순가액이 음수면 0', () => {
    expect(calcCohabitationDeduct(300_000_000, 500_000_000)).toBe(0);
  });
});

describe('calcBasicAndPersonalDeduct — 기초+인적 vs 일괄 비교', () => {
  it('자녀 없고 인적공제 없음 → 일괄공제 5억 채택', () => {
    const r = calcBasicAndPersonalDeduct({});
    expect(r.chosen).toBe(500_000_000);
    expect(r.appliedKind).toBe('lump');
  });
  it('자녀 7명 → 기초 2억 + 인적 3.5억 = 5.5억 > 일괄 5억', () => {
    const r = calcBasicAndPersonalDeduct({ children: 7 });
    expect(r.summed).toBe(550_000_000);
    expect(r.chosen).toBe(550_000_000);
    expect(r.appliedKind).toBe('basic_plus_personal');
  });
  it('미성년자 잔여연수 합산 적용 (1천만/년)', () => {
    const r = calcBasicAndPersonalDeduct({ minorYears: 10 });
    expect(r.minorD).toBe(100_000_000);
  });
  it('장애인 기대여명 1천만/년', () => {
    const r = calcBasicAndPersonalDeduct({ disabledYears: 20 });
    expect(r.disabledD).toBe(200_000_000);
  });
});

describe('calcSpouseDeduct — 배우자상속공제 (상증법 §19)', () => {
  it('배우자 없으면 0', () => {
    const r = calcSpouseDeduct({ netInheritedProperty: 5_000_000_000, spouseExists: false });
    expect(r).toBe(0);
  });
  it('순상속재산이 작아도 최소 5억 보장', () => {
    const r = calcSpouseDeduct({ netInheritedProperty: 100_000_000, children: 2 });
    expect(r).toBe(500_000_000);
  });
  it('자녀 0명: 법정상속분 100% → 30억 한도', () => {
    const r = calcSpouseDeduct({ netInheritedProperty: 10_000_000_000, children: 0 });
    expect(r).toBe(3_000_000_000);
  });
  it('자녀 2명: 배우자 법정상속분 1.5/3.5 ≈ 0.4286 적용', () => {
    const r = calcSpouseDeduct({ netInheritedProperty: 7_000_000_000, children: 2 });
    expect(r).toBeCloseTo(3_000_000_000, -3); // 한도 도달
  });
  it('배우자 사전증여 6억 초과분만큼 한도 차감', () => {
    // 자녀 2명: 배우자 법정상속분 = 1.5/3.5 ≈ 0.4286
    // netInherited = 14억 × 0.4286 ≈ 6억, 사전증여 10억이라 6억 초과액 4억 차감 → ≈ 2억
    // → 최소 5억 보장으로 보강
    const r = calcSpouseDeduct({
      netInheritedProperty: 1_400_000_000, children: 2,
      priorGiftToSpouse: 1_000_000_000,
    });
    expect(r).toBe(500_000_000);
  });

  it('사전증여 6억 이하면 한도 차감 없음', () => {
    const noPrior     = calcSpouseDeduct({ netInheritedProperty: 7_000_000_000, children: 1, priorGiftToSpouse: 0 });
    const withinLimit = calcSpouseDeduct({ netInheritedProperty: 7_000_000_000, children: 1, priorGiftToSpouse: 600_000_000 });
    expect(noPrior).toBe(withinLimit);
  });
});

describe('shortTermReinheritRate — 단기재상속 (상증법 §30)', () => {
  it('1년 이내 100%', () => expect(shortTermReinheritRate(1)).toBe(1));
  it('2년 90%', () => expect(shortTermReinheritRate(2)).toBeCloseTo(0.9));
  it('10년 10%', () => expect(shortTermReinheritRate(10)).toBeCloseTo(0.1));
  it('10년 초과 0%', () => expect(shortTermReinheritRate(11)).toBe(0));
  it('미입력 0', () => expect(shortTermReinheritRate(0)).toBe(0));
});

describe('calcInheritTax — 종합 계산', () => {
  it('과세표준 0 → 세액 0 (배우자 + 자녀 1명, 자산 10억)', () => {
    const r = calcInheritTax({
      houseValue: 1_000_000_000,
      spouseExists: true, children: 1,
    });
    expect(r.tax).toBe(0);
    expect(r.detail.taxBase).toBe(0);
  });

  it('자산 20억 + 배우자·자녀 1명: 상속공제(일괄 5억 + 배우자 자동) 적용 후 세액 산출', () => {
    const r = calcInheritTax({
      houseValue: 2_000_000_000,
      spouseExists: true, children: 1,
    });
    expect(r.detail.spouseDeduct).toBeGreaterThanOrEqual(500_000_000);
    expect(r.detail.basicPersonal.chosen).toBe(500_000_000);
    expect(r.tax).toBeGreaterThanOrEqual(0);
  });

  it('세대생략 할증 30% 적용 (자녀 없이 손자 상속, 자산 30억)', () => {
    const r = calcInheritTax({
      houseValue: 3_000_000_000,
      spouseExists: false, children: 0,
      skipGeneration: true,
    });
    expect(r.detail.skipSurcharge).toBeGreaterThan(0);
    expect(r.detail.skipSurcharge).toBeCloseTo(r.detail.rawTax * 0.30, -3);
  });

  it('세대생략 + 미성년 + 20억 초과 → 40% 할증', () => {
    const r = calcInheritTax({
      houseValue: 5_000_000_000,
      spouseExists: false, children: 0,
      skipGeneration: true, skipMinorLarge: true,
    });
    expect(r.detail.skipSurcharge).toBeCloseTo(r.detail.rawTax * 0.40, -3);
  });

  it('단기재상속 세액공제 적용', () => {
    const r = calcInheritTax({
      houseValue: 3_000_000_000,
      spouseExists: false, children: 0,
      shortTermPriorYears: 1, shortTermPriorTax: 100_000_000,
    });
    expect(r.detail.shortTermCredit).toBe(100_000_000);
  });

  it('간주·추정상속재산이 총상속재산에 포함됨', () => {
    const r = calcInheritTax({
      houseValue: 500_000_000,
      insuranceProceeds: 200_000_000,
      retirementBenefit: 100_000_000,
      presumedAssets: 50_000_000,
    });
    expect(r.detail.totalProperty).toBe(850_000_000);
  });

  it('사전증여재산 + 기납부 증여세액공제 반영', () => {
    const r = calcInheritTax({
      houseValue: 2_000_000_000,
      priorGiftToHeirs: 200_000_000,
      paidGiftTax: 20_000_000,
      spouseExists: false, children: 1,
    });
    expect(r.detail.priorGifts).toBe(200_000_000);
    expect(r.detail.giftTaxCredit).toBe(20_000_000);
  });

  it('breakdown 의 모든 단계에 lawRef가 부착되어 있음', () => {
    const r = calcInheritTax({ houseValue: 2_000_000_000, children: 1 });
    for (const step of r.breakdown) {
      expect(step.lawRef, `step ${step.step} ${step.label}`).toBeTruthy();
    }
  });

  it('10원 미만 절사 (자진납부세액)', () => {
    const r = calcInheritTax({ houseValue: 3_000_000_000, children: 0, spouseExists: false });
    expect(r.tax % 10).toBe(0);
  });
});
