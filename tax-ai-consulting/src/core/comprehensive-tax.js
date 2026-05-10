/**
 * 종합부동산세(종부세) 계산 모듈
 * 기준: 종합부동산세법 (2026.5.10 변경 없음)
 *
 * 공정시장가액비율: 60% (2026년 기준, 종부세법시행령 §2의4)
 * 세율: 0.5%~2.7% (주택분 종부세)
 * 공제: 1세대1주택 12억, 기타 9억
 */

import { AGGR_DEDUCT_SINGLE, AGGR_DEDUCT_OTHERS, AGGR_FAIR_MARKET_RATE } from './constants.js';

const LAW_REF = [
  '종합부동산세법 §8(주택분 과세표준)',
  '종합부동산세법 §9(세율)',
  '종합부동산세법 §9의2(1세대1주택 세액공제 — 장기보유·연령)',
  '종합부동산세법시행령 §2의4(공정시장가액비율 60%)',
  '농어촌특별세법 §5(종부세분 20%)',
];

/**
 * 종합부동산세 및 농어촌특별세 계산
 *
 * @param {string} oneOOne 주택 유형
 *   "1세대1주택"  — 12억 공제, 세액공제(장기/연령) 적용
 *   "공동명의1주택" — 9억 공제 (인별 6억×2), 세액공제 없음
 *   "다주택"       — 9억 공제, 세액공제 없음
 * @param {string} heavy 조정지역 여부 ("조정지역" | "비조정지역") — 현행법상 중과 폐지로 세율 동일하나 파라미터 유지
 * @param {number} gongsi 공시가격 합계 [원]
 * @param {number} period 보유기간 [년] (1세대1주택 세액공제용)
 * @param {number} age    소유자 나이 [만 세] (1세대1주택 세액공제용)
 * @param {number} propertyTax 재산세액 [원] (공제계산용)
 * @returns {{ aggrTax: number, ruralTax: number, total: number, breakdown: object, lawRef: string[] }}
 */
export function calcAggrTax(oneOOne, heavy, gongsi, period, age, propertyTax) {
  const deductAmt = oneOOne === '1세대1주택' ? AGGR_DEDUCT_SINGLE : AGGR_DEDUCT_OTHERS;

  const aggrTaxBase = Math.max((gongsi - deductAmt), 0) * AGGR_FAIR_MARKET_RATE;

  // 주택분 종부세 세율 (0.5%~2.7%)
  let aggrTax;
  if      (aggrTaxBase <= 300_000_000)   aggrTax = aggrTaxBase * 0.005;
  else if (aggrTaxBase <= 600_000_000)   aggrTax = aggrTaxBase * 0.007  - 600_000;
  else if (aggrTaxBase <= 1_200_000_000) aggrTax = aggrTaxBase * 0.010  - 2_400_000;
  else if (aggrTaxBase <= 2_500_000_000) aggrTax = aggrTaxBase * 0.013  - 6_000_000;
  else if (aggrTaxBase <= 5_000_000_000) aggrTax = aggrTaxBase * 0.015  - 11_000_000;
  else if (aggrTaxBase <= 9_400_000_000) aggrTax = aggrTaxBase * 0.020  - 36_000_000;
  else                                   aggrTax = aggrTaxBase * 0.027  - 101_800_000;

  // 장기보유 세액공제 (1세대1주택만)
  let prdDc = 0;
  if (oneOOne === '1세대1주택') {
    if      (period >= 15) prdDc = 0.5;
    else if (period >= 10) prdDc = 0.4;
    else if (period >= 5)  prdDc = 0.2;
  }

  // 연령 세액공제 (1세대1주택만)
  let ageDc = 0;
  if (oneOOne === '1세대1주택') {
    if      (age >= 70) ageDc = 0.4;
    else if (age >= 65) ageDc = 0.3;
    else if (age >= 60) ageDc = 0.2;
  }

  // 재산세 공제 (이중과세 조정)
  const pRealRate = (oneOOne === '1세대1주택' || oneOOne === '공동명의1주택') ? 0.45 : 0.6;
  const denominator = gongsi * pRealRate * 0.004 - 630_000;
  const propertyTaxDc = denominator > 0
    ? propertyTax * (aggrTaxBase * pRealRate * 0.004) / denominator
    : 0;

  // 최종 세액 (장기/연령 공제 합산 80% 한도)
  const combinedDc = Math.min(prdDc + ageDc, 0.8);
  const aggrTaxFinal = Math.max((aggrTax - propertyTaxDc), 0) * (1 - combinedDc);

  const aggrTaxFloor = Math.floor(aggrTaxFinal);
  const ruralTax     = Math.floor(aggrTaxFinal * 0.2);  // 농특세 20%

  return {
    aggrTax: aggrTaxFloor,
    ruralTax,
    total: aggrTaxFloor + ruralTax,
    breakdown: {
      oneOOne, gongsi, deductAmt, aggrTaxBase,
      aggrTaxBeforeDc: aggrTax,
      propertyTaxDc,
      prdDc, ageDc, combinedDc,
      fairMarketRate: AGGR_FAIR_MARKET_RATE,
    },
    lawRef: LAW_REF,
  };
}
