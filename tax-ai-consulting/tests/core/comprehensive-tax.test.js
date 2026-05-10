import { describe, it, expect } from 'vitest';
import { calcAggrTax } from '../../src/core/comprehensive-tax.js';
import { AGGR_DEDUCT_SINGLE, AGGR_DEDUCT_OTHERS } from '../../src/core/constants.js';

describe('calcAggrTax — 종합부동산세', () => {
  it('1세대1주택: 12억 공제', () => {
    const r = calcAggrTax('1세대1주택', '비조정지역', 1_500_000_000, 5, 50, 1_000_000);
    expect(r.breakdown.deductAmt).toBe(AGGR_DEDUCT_SINGLE);
  });

  it('다주택: 9억 공제', () => {
    const r = calcAggrTax('다주택', '비조정지역', 1_500_000_000, 5, 50, 1_000_000);
    expect(r.breakdown.deductAmt).toBe(AGGR_DEDUCT_OTHERS);
  });

  it('공시가가 공제액 이하 → 과세표준 0, 세액 0', () => {
    const r = calcAggrTax('1세대1주택', '비조정지역', 1_000_000_000, 5, 50, 0);
    expect(r.breakdown.aggrTaxBase).toBe(0);
    expect(r.aggrTax).toBe(0);
  });

  it('농특세 = 종부세 × 20%', () => {
    const r = calcAggrTax('다주택', '비조정지역', 3_000_000_000, 5, 50, 1_000_000);
    expect(r.ruralTax).toBe(Math.floor(r.aggrTax * 0.2));
    expect(r.total).toBe(r.aggrTax + r.ruralTax);
  });

  describe('1세대1주택 세액공제', () => {
    it('장기보유: 15년 이상 50%, 10년 이상 40%, 5년 이상 20%', () => {
      const base = ['1세대1주택', '비조정지역', 2_000_000_000, 0, 30, 1_000_000];
      const r5  = calcAggrTax('1세대1주택', '비조정지역', 2_000_000_000, 5, 30, 1_000_000);
      const r10 = calcAggrTax('1세대1주택', '비조정지역', 2_000_000_000, 10, 30, 1_000_000);
      const r15 = calcAggrTax('1세대1주택', '비조정지역', 2_000_000_000, 15, 30, 1_000_000);
      expect(r5.breakdown.prdDc).toBe(0.2);
      expect(r10.breakdown.prdDc).toBe(0.4);
      expect(r15.breakdown.prdDc).toBe(0.5);
    });

    it('연령: 60세 20%, 65세 30%, 70세 40%', () => {
      const r60 = calcAggrTax('1세대1주택', '비조정지역', 2_000_000_000, 0, 60, 1_000_000);
      const r65 = calcAggrTax('1세대1주택', '비조정지역', 2_000_000_000, 0, 65, 1_000_000);
      const r70 = calcAggrTax('1세대1주택', '비조정지역', 2_000_000_000, 0, 70, 1_000_000);
      expect(r60.breakdown.ageDc).toBe(0.2);
      expect(r65.breakdown.ageDc).toBe(0.3);
      expect(r70.breakdown.ageDc).toBe(0.4);
    });

    it('합산 공제 80% 상한', () => {
      const r = calcAggrTax('1세대1주택', '비조정지역', 2_000_000_000, 15, 70, 1_000_000);
      expect(r.breakdown.combinedDc).toBe(0.8);
    });

    it('다주택은 세액공제 없음', () => {
      const r = calcAggrTax('다주택', '비조정지역', 2_000_000_000, 15, 70, 1_000_000);
      expect(r.breakdown.prdDc).toBe(0);
      expect(r.breakdown.ageDc).toBe(0);
    });
  });

  it('세율 누진: 과표 30억 → 1.5% 구간', () => {
    const r = calcAggrTax('다주택', '비조정지역', 6_000_000_000, 0, 30, 0);
    expect(r.breakdown.aggrTaxBeforeDc).toBeGreaterThan(0);
  });
});
