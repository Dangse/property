import { describe, it, expect } from 'vitest';
import {
  runScenario11,
  calcInheritAcquisitionTax,
  calcInheritPropertyTaxChange,
  calcInheritTransferTax,
} from '../../src/scenario/scenario-11.js';

describe('calcInheritAcquisitionTax — 상속 취득세', () => {
  it('1세대1주택(세대 전원 무주택) → 0.8% 특례', () => {
    const r = calcInheritAcquisitionTax({
      houseValue: 800_000_000, householdAllNoHouse: true, houseSpace: 85,
    });
    expect(r.house.acqRate).toBe(0.008);
    expect(r.house.acquisitionTax).toBe(6_400_000);
  });

  it('다주택 → 2.8%', () => {
    const r = calcInheritAcquisitionTax({
      houseValue: 800_000_000, householdAllNoHouse: false, houseSpace: 85,
    });
    expect(r.house.acqRate).toBe(0.028);
  });

  it('농지 2.3%', () => {
    const r = calcInheritAcquisitionTax({ farmlandValue: 500_000_000 });
    expect(r.farmland.acqRate).toBe(0.023);
    expect(r.farmland.eduRate).toBe(0.0006);
  });

  it('1세대1주택 + 국민주택규모 이하 → 농특세 면제', () => {
    const r = calcInheritAcquisitionTax({
      houseValue: 800_000_000, householdAllNoHouse: true, houseSpace: 85,
    });
    expect(r.house.agTax).toBe(0);
  });

  it('total = 항목별 합산', () => {
    const r = calcInheritAcquisitionTax({
      houseValue: 500_000_000, buildingValue: 300_000_000,
      farmlandValue: 200_000_000, landValue: 100_000_000,
    });
    const expected = r.house.total + r.building.total + r.land.total + r.farmland.total;
    expect(r.total).toBe(expected);
  });
});

describe('calcInheritPropertyTaxChange — 상속 전후 재산세', () => {
  it('1주택자 + 5년 특례 신청 시 상속 후에도 1세대1주택 판정 유지', () => {
    const r = calcInheritPropertyTaxChange({
      gongsiBefore: 600_000_000, gongsiInherited: 500_000_000,
      ownedHousesBefore: 1, inheritExclusion5y: true,
    });
    expect(r.appliedExclusion).toBe(true);
    expect(r.exclusionYears).toBe(5);
    expect(r.before.breakdown.fairMarketRatio).toBeLessThan(0.6); // 1세대1주택
  });

  it('5년 특례 미신청 시 상속 후 다주택 60% 적용', () => {
    const r = calcInheritPropertyTaxChange({
      gongsiBefore: 600_000_000, gongsiInherited: 500_000_000,
      ownedHousesBefore: 1, inheritExclusion5y: false,
    });
    expect(r.after.breakdown.fairMarketRatio).toBe(0.6);
  });

  it('상속 후 세액이 상속 전보다 증가', () => {
    const r = calcInheritPropertyTaxChange({
      gongsiBefore: 600_000_000, gongsiInherited: 500_000_000,
      ownedHousesBefore: 1, inheritExclusion5y: true,
    });
    expect(r.after.total).toBeGreaterThan(r.before.total);
    expect(r.changeTotal).toBeGreaterThan(0);
  });
});

describe('calcInheritTransferTax — 상속 후 양도세 3케이스', () => {
  const base = {
    transferPrice: 1_500_000_000,
    marketPriceAtInherit: 1_000_000_000,
    officialPriceAtInherit: 700_000_000,
    holdingPeriod: 5,
    isNonBusinessUse: false,
  };

  it('3개 케이스 모두 산출', () => {
    const r = calcInheritTransferTax(base);
    expect(r.cases).toHaveLength(3);
    expect(r.cases.map(c => c.id)).toEqual(['6m', 'market', 'official']);
  });

  it('6개월 이내 양도: 양도가 = 취득가 → 양도차익 0 → 양도세 0', () => {
    const r = calcInheritTransferTax(base);
    const six = r.cases.find(c => c.id === '6m');
    expect(six.capitalGain).toBe(0);
    expect(six.transferTax).toBe(0);
  });

  it('시가 신고 vs 기준시가 신고: 기준시가가 더 많은 세금', () => {
    const r = calcInheritTransferTax(base);
    const market = r.cases.find(c => c.id === 'market');
    const official = r.cases.find(c => c.id === 'official');
    expect(official.transferTax).toBeGreaterThan(market.transferTax);
  });

  it('지방소득세 = 양도세 × 10%', () => {
    const r = calcInheritTransferTax(base);
    for (const c of r.cases) {
      expect(c.localIncomeTax).toBe(Math.floor(c.transferTax * 0.1));
      expect(c.total).toBe(c.transferTax + c.localIncomeTax);
    }
  });

  it('비사업용토지 5년 이상 보유 시 +10%p 가산', () => {
    const r = calcInheritTransferTax({ ...base, isNonBusinessUse: true });
    const market = r.cases.find(c => c.id === 'market');
    const baseMarket = calcInheritTransferTax(base).cases.find(c => c.id === 'market');
    expect(market.appliedRate).toBeCloseTo(baseMarket.appliedRate + 0.1, 5);
  });
});

describe('runScenario11 — 상속 종합 시나리오', () => {
  const inputs = {
    inheritance: {
      houseValue: 1_500_000_000,
      otherProperty: 200_000_000,
      debts: 100_000_000, generalFuneral: 8_000_000, supplementalFuneral: 3_000_000,
      spouseExists: true, children: 2,
    },
    acquisition: {
      houseValue: 1_500_000_000, householdAllNoHouse: false, houseSpace: 85,
    },
    holding: {
      gongsiBefore: 700_000_000, gongsiInherited: 800_000_000,
      ownedHousesBefore: 1, age: 65, period: 10,
      inheritExclusion5y: true,
    },
    transfer: {
      transferPrice: 1_800_000_000,
      marketPriceAtInherit: 1_500_000_000,
      officialPriceAtInherit: 1_000_000_000,
      holdingPeriod: 7,
    },
  };

  it('scenarioId / title / summary 구조 확인', () => {
    const r = runScenario11(inputs);
    expect(r.scenarioId).toBe(11);
    expect(r.title).toContain('상속');
    expect(r.summary).toBeDefined();
    for (const v of Object.values(r.summary)) {
      expect(Number.isFinite(v)).toBe(true);
    }
  });

  it('5개 세금 모두 산출됨 (상속세·취득세·재산세·종부세·양도세)', () => {
    const r = runScenario11(inputs);
    expect(r.inheritTax).toBeDefined();
    expect(r.acquisitionTax).toBeDefined();
    expect(r.propertyTaxChange).toBeDefined();
    expect(r.aggrTaxChange).toBeDefined();
    expect(r.transferTax).toBeDefined();
    expect(r.transferTax.cases).toHaveLength(3);
  });

  it('transfer 없이 호출 시 양도세는 null', () => {
    const r = runScenario11({ ...inputs, transfer: null });
    expect(r.transferTax).toBeNull();
    expect(r.summary.transferTaxMinCase).toBe(0);
  });

  it('상속세 본세에 breakdown + lawRef 부착', () => {
    const r = runScenario11(inputs);
    expect(r.inheritTax.breakdown.length).toBeGreaterThan(5);
    expect(r.lawRef.length).toBeGreaterThan(0);
  });
});
