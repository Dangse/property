/**
 * 재산세 계산 모듈
 * 기준: 지방세법 §111 (2026.5.10 변경 없음)
 *
 * 반환: [재산세, 도시지역분, 지방교육세]
 * ※ 도시지역분: 과세표준 × 1.4/1000
 * ※ 지방교육세: 재산세 × 20%
 */

const LAW_REF = [
  '지방세법 §110(과세표준)',
  '지방세법 §111(재산세 세율)',
  '지방세법 §112(도시지역분)',
  '지방세법 §151(지방교육세)',
];

/**
 * 재산세 계산
 * @param {string} oneOOne 주택 유형
 *   "1세대1주택"   — 공정시장가액비율 43/44/45%
 *   "공동명의1주택" — 60% (종부세 별도 계산용)
 *   "다주택"       — 공정시장가액비율 60%
 * @param {number} gongsi 공시가격 [원]
 * @returns {{ propertyTax: number, dosiTax: number, pEduTax: number, total: number, breakdown: object, lawRef: string[] }}
 */
export function calcPropertyTax(oneOOne, gongsi) {
  // 과세표준 = 공시가격 × 공정시장가액비율
  let taxBase;
  if (oneOOne === '1세대1주택') {
    if (gongsi <= 300_000_000)      taxBase = gongsi * 0.43;
    else if (gongsi <= 600_000_000) taxBase = gongsi * 0.44;
    else                            taxBase = gongsi * 0.45;
  } else {
    taxBase = gongsi * 0.6;
  }

  // 재산세 누진세율 (공시가 9억 이하 / 초과 구간 분리)
  let propertyTax;
  if (gongsi <= 900_000_000) {
    if      (taxBase <= 60_000_000)  propertyTax = taxBase * 0.0005;
    else if (taxBase <= 150_000_000) propertyTax = 30_000 + (taxBase - 60_000_000) * 0.001;
    else if (taxBase <= 300_000_000) propertyTax = 120_000 + (taxBase - 150_000_000) * 0.002;
    else                             propertyTax = 420_000 + (taxBase - 300_000_000) * 0.0035;
  } else {
    if      (taxBase <= 60_000_000)  propertyTax = taxBase * 0.001;
    else if (taxBase <= 150_000_000) propertyTax = 60_000 + (taxBase - 60_000_000) * 0.0015;
    else if (taxBase <= 300_000_000) propertyTax = 195_000 + (taxBase - 150_000_000) * 0.0025;
    else                             propertyTax = 570_000 + (taxBase - 300_000_000) * 0.004;
  }

  const dosiTax  = taxBase * 14 / 10000;   // 도시지역분 0.14%
  const pEduTax  = propertyTax * 0.2;      // 지방교육세 20%

  return {
    propertyTax,
    dosiTax,
    pEduTax,
    total: propertyTax + dosiTax + pEduTax,
    breakdown: {
      oneOOne, gongsi, taxBase,
      fairMarketRatio: oneOOne === '1세대1주택'
        ? (gongsi <= 300_000_000 ? 0.43 : gongsi <= 600_000_000 ? 0.44 : 0.45)
        : 0.6,
    },
    lawRef: LAW_REF,
  };
}
