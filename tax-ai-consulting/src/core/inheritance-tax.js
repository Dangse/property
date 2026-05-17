/**
 * 상속세 본세 계산 모듈
 * 기준: 상속세 및 증여세법 (2026.5 현재 시행분)
 *
 * 2024 정부개정안(최고세율 50→40%, 자녀공제 5천만→5억)은 2024.12 국회 부결.
 * → 본 모듈은 부결 전 종전 규정으로 구현. 향후 개정 시 constants.js 교체.
 * 검증 내역: docs/tax-law-2026.md §1
 *
 * 원본 PHP(`5bad1a64-pageinheritreportpremium.php`)에서 누락되었던 항목:
 *   - 간주상속재산(보험·퇴직·신탁) 분리 입력
 *   - 추정상속재산 입력
 *   - 사전증여재산 합산 시 상속인/비상속인 구분 + 증여세액공제 자동 산정 옵션
 *   - 장애인공제
 *   - 봉안시설 별도 500만 공제
 *   - 세대생략 할증과세
 *   - 단기재상속 세액공제
 *   - 일괄공제 vs (기초+인적) 자동 비교
 *   - 배우자상속공제 한도 자동 산정 (선택)
 */

import {
  INHERIT_BASIC_DEDUCT, INHERIT_LUMP_DEDUCT,
  INHERIT_CHILD_DEDUCT_UNIT, INHERIT_MINOR_DEDUCT_UNIT,
  INHERIT_SENIOR_DEDUCT_UNIT, INHERIT_DISABLED_DEDUCT_UNIT,
  INHERIT_MINOR_AGE_THRESHOLD,
  INHERIT_SPOUSE_MIN, INHERIT_SPOUSE_MAX, SPOUSE_LEGAL_SHARE_RATIO,
  INHERIT_COHABITATION_MAX,
  INHERIT_FINANCIAL_FULL_BELOW, INHERIT_FINANCIAL_RATE,
  INHERIT_FINANCIAL_MIN, INHERIT_FINANCIAL_MAX,
  FUNERAL_MIN, FUNERAL_GENERAL_MAX, FUNERAL_SUPPLEMENTAL_MAX,
  APPRAISAL_FEE_MAX,
  INHERIT_SKIP_RATE_DEFAULT, INHERIT_SKIP_RATE_MINOR_LARGE,
  INHERIT_SKIP_LARGE_THRESHOLD,
  INHERIT_FAITHFUL_REPORT_DISCOUNT,
} from './constants.js';

const LAW_REF = [
  '상속세및증여세법 §8(보험금 간주상속재산)',
  '상속세및증여세법 §10(퇴직금 간주상속재산)',
  '상속세및증여세법 §13(사전증여재산 합산)',
  '상속세및증여세법 §14(채무·공과금·장례비 공제)',
  '상속세및증여세법 §15(추정상속재산)',
  '상속세및증여세법 §18~§24(상속공제)',
  '상속세및증여세법 §26(세율)',
  '상속세및증여세법 §27(세대생략 할증)',
  '상속세및증여세법 §28(증여세액공제)',
  '상속세및증여세법 §30(단기재상속 세액공제)',
  '상속세및증여세법 §69(신고세액공제 3%)',
];

/**
 * 상속세 누진세율표 (상증법 §26)
 * @param {number} taxBase 상속세 과세표준
 * @returns {{ rawTax: number, taxRate: number, accDeduct: number }}
 */
export function calcInheritTariff(taxBase) {
  let taxRate, accDeduct;
  if      (taxBase <=   100_000_000) { taxRate = 0.10; accDeduct = 0; }
  else if (taxBase <=   500_000_000) { taxRate = 0.20; accDeduct =  10_000_000; }
  else if (taxBase <= 1_000_000_000) { taxRate = 0.30; accDeduct =  60_000_000; }
  else if (taxBase <= 3_000_000_000) { taxRate = 0.40; accDeduct = 160_000_000; }
  else                               { taxRate = 0.50; accDeduct = 460_000_000; }
  const rawTax = Math.max(taxBase * taxRate - accDeduct, 0);
  return { rawTax, taxRate, accDeduct };
}

/**
 * 장례비 공제 계산 (일반 + 봉안시설 분리)
 * 일반: 500만~1,000만 / 봉안: 0~500만 → 합계 최대 1,500만
 */
export function calcFuneralDeduct(generalFuneral = 0, supplementalFuneral = 0) {
  const general = Math.min(Math.max(generalFuneral, FUNERAL_MIN), FUNERAL_GENERAL_MAX);
  const supplemental = Math.min(Math.max(supplementalFuneral, 0), FUNERAL_SUPPLEMENTAL_MAX);
  return general + supplemental;
}

/**
 * 금융재산상속공제 (상증법 §22)
 * 순금융재산 = 금융자산 − 금융부채
 */
export function calcFinancialDeduct(netFinancialAssets) {
  if (netFinancialAssets <= 0) return 0;
  if (netFinancialAssets <= INHERIT_FINANCIAL_FULL_BELOW) return netFinancialAssets;
  const proportional = netFinancialAssets * INHERIT_FINANCIAL_RATE;
  return Math.min(Math.max(proportional, INHERIT_FINANCIAL_MIN), INHERIT_FINANCIAL_MAX);
}

/**
 * 동거주택상속공제 (상증법 §23의2): (주택가액 − 채무) ≤ 6억
 */
export function calcCohabitationDeduct(cohabHouseValue = 0, cohabHouseDebt = 0) {
  return Math.min(Math.max(cohabHouseValue - cohabHouseDebt, 0), INHERIT_COHABITATION_MAX);
}

/**
 * 인적공제 합계 + 일괄공제 비교 → 큰 값 채택
 */
export function calcBasicAndPersonalDeduct({
  children = 0,
  minorYears = 0,        // 미성년자별 잔여연수 합계 (예: 2명이 각 5년·8년이면 13)
  seniors = 0,
  disabledYears = 0,     // 장애인별 기대여명연수 합계
}) {
  const childD    = children      * INHERIT_CHILD_DEDUCT_UNIT;
  const minorD    = minorYears    * INHERIT_MINOR_DEDUCT_UNIT;
  const seniorD   = seniors       * INHERIT_SENIOR_DEDUCT_UNIT;
  const disabledD = disabledYears * INHERIT_DISABLED_DEDUCT_UNIT;
  const personal  = childD + minorD + seniorD + disabledD;
  const basic     = INHERIT_BASIC_DEDUCT;
  const summed    = basic + personal;
  const chosen    = Math.max(summed, INHERIT_LUMP_DEDUCT);
  return {
    childD, minorD, seniorD, disabledD,
    personal, basic, lump: INHERIT_LUMP_DEDUCT,
    summed, chosen,
    appliedKind: chosen === INHERIT_LUMP_DEDUCT && summed < INHERIT_LUMP_DEDUCT
      ? 'lump' : 'basic_plus_personal',
  };
}

/**
 * 배우자상속공제 한도 자동 산정 (상증법 §19)
 *
 * 한도 = min(
 *   (상속재산 − 채무) × 배우자법정상속분 − max(배우자 사전증여재산 − 6억, 0),
 *   30억
 * )
 * → 최소 5억 보장 (배우자가 실제 상속받지 않거나 계산값이 5억 미만이어도 5억)
 *
 * @param {object} p
 * @param {number} p.netInheritedProperty 채무 차감 후 상속재산가액
 * @param {number} p.children 자녀 수 (법정상속분 산정용)
 * @param {number} p.priorGiftToSpouse 배우자에 대한 사전증여재산
 * @param {boolean} p.spouseExists 배우자 생존 여부
 */
export function calcSpouseDeduct({
  netInheritedProperty,
  children = 0,
  priorGiftToSpouse = 0,
  spouseExists = true,
}) {
  if (!spouseExists) return 0;
  const legalShare = SPOUSE_LEGAL_SHARE_RATIO / (children + SPOUSE_LEGAL_SHARE_RATIO);
  const priorOverflow = Math.max(priorGiftToSpouse - 600_000_000, 0);
  const calculated = netInheritedProperty * legalShare - priorOverflow;
  return Math.max(
    Math.min(Math.max(calculated, 0), INHERIT_SPOUSE_MAX),
    INHERIT_SPOUSE_MIN
  );
}

/**
 * 단기재상속 세액공제율 (상증법 §30)
 * 1년 이내 100%, 이후 1년당 10%p 감소 → 10년 이내 10%
 */
export function shortTermReinheritRate(yearsSincePrior) {
  if (!yearsSincePrior || yearsSincePrior <= 0) return 0;
  const y = Math.ceil(yearsSincePrior);
  if (y > 10) return 0;
  return Math.max(0, 1 - 0.1 * (y - 1));
}

/**
 * 상속세 본세 종합 계산
 *
 * @param {object} inputs — 모든 금액 단위: 원
 *
 * [상속재산]
 * @param {number} [inputs.houseValue=0]            주택
 * @param {number} [inputs.buildingValue=0]         비주거용 건물
 * @param {number} [inputs.agriculturalLandValue=0] 농지
 * @param {number} [inputs.forestLandValue=0]       임야
 * @param {number} [inputs.otherProperty=0]         그 외 (금융자산 등 — 간주·추정 제외)
 * @param {number} [inputs.insuranceProceeds=0]     간주상속재산: 보험금 (§8)
 * @param {number} [inputs.retirementBenefit=0]     간주상속재산: 퇴직금 (§10)
 * @param {number} [inputs.trustAssets=0]           간주상속재산: 신탁
 * @param {number} [inputs.presumedAssets=0]        추정상속재산 용도불분명액 (§15)
 *
 * [채무·공과금·장례비]
 * @param {number} [inputs.debts=0]                 채무 (사망일 현재 잔액)
 * @param {number} [inputs.publicCharges=0]         공과금
 * @param {number} [inputs.generalFuneral=0]        일반장례비
 * @param {number} [inputs.supplementalFuneral=0]   봉안시설·자연장지
 *
 * [사전증여재산 — 상증법 §13]
 * @param {number} [inputs.priorGiftToSpouse=0]
 * @param {number} [inputs.priorGiftToHeirs=0]      배우자 외 상속인 (10년)
 * @param {number} [inputs.priorGiftToOthers=0]     비상속인 (5년)
 * @param {number} [inputs.paidGiftTax=0]           이미 납부한 증여세 (§28 증여세액공제)
 *
 * [상속공제 입력]
 * @param {boolean} [inputs.spouseExists=true]
 * @param {number}  [inputs.children=0]
 * @param {number}  [inputs.minorYears=0]
 * @param {number}  [inputs.seniors=0]
 * @param {number}  [inputs.disabledYears=0]
 * @param {number}  [inputs.cohabHouseValue=0]
 * @param {number}  [inputs.cohabHouseDebt=0]
 * @param {number}  [inputs.netFinancialAssets=0]   금융재산상속공제용
 *
 * [기타]
 * @param {number}  [inputs.appraisalFee=0]
 * @param {boolean} [inputs.skipGeneration=false]   세대생략 상속 여부
 * @param {boolean} [inputs.skipMinorLarge=false]   미성년 + 20억 초과
 * @param {number}  [inputs.shortTermPriorYears=0]  단기재상속: 직전 상속 경과연수
 * @param {number}  [inputs.shortTermPriorTax=0]    단기재상속: 직전 상속세 중 재상속재산분
 *
 * @returns {{ tax: number, breakdown: Array, lawRef: string[] }}
 */
export function calcInheritTax(inputs = {}) {
  const {
    houseValue = 0, buildingValue = 0,
    agriculturalLandValue = 0, forestLandValue = 0,
    otherProperty = 0,
    insuranceProceeds = 0, retirementBenefit = 0, trustAssets = 0,
    presumedAssets = 0,
    debts = 0, publicCharges = 0,
    generalFuneral = 0, supplementalFuneral = 0,
    priorGiftToSpouse = 0, priorGiftToHeirs = 0, priorGiftToOthers = 0,
    paidGiftTax = 0,
    spouseExists = true, children = 0,
    minorYears = 0, seniors = 0, disabledYears = 0,
    cohabHouseValue = 0, cohabHouseDebt = 0,
    netFinancialAssets = 0,
    appraisalFee = 0,
    skipGeneration = false, skipMinorLarge = false,
    shortTermPriorYears = 0, shortTermPriorTax = 0,
  } = inputs;

  const breakdown = [];

  // ── (1) 본래상속재산 ────────────────────────────────────
  const realProperty = houseValue + buildingValue + agriculturalLandValue + forestLandValue + otherProperty;
  // ── (2) 간주상속재산 (§8~§10)
  const deemedProperty = insuranceProceeds + retirementBenefit + trustAssets;
  // ── (3) 추정상속재산 (§15)
  const presumed = presumedAssets;
  const totalProperty = realProperty + deemedProperty + presumed;
  breakdown.push({
    step: 1, label: '총상속재산가액', value: totalProperty,
    formula: `본래(${realProperty}) + 간주(${deemedProperty}) + 추정(${presumed})`,
    lawRef: '상증법 §7~§15',
  });

  // ── (4) 비과세·공과금·채무·장례비
  const funeralDeduct = calcFuneralDeduct(generalFuneral, supplementalFuneral);
  const liabilities = debts + publicCharges + funeralDeduct;
  breakdown.push({
    step: 2, label: '채무·공과금·장례비',
    value: liabilities,
    formula: `채무(${debts}) + 공과금(${publicCharges}) + 장례비(${funeralDeduct})`,
    lawRef: '상증법 §14',
  });

  // ── (5) 사전증여재산 가산 (§13)
  const priorGifts = priorGiftToSpouse + priorGiftToHeirs + priorGiftToOthers;
  breakdown.push({
    step: 3, label: '사전증여재산 합산',
    value: priorGifts,
    formula: `배우자(${priorGiftToSpouse}) + 기타상속인(${priorGiftToHeirs}) + 비상속인(${priorGiftToOthers})`,
    lawRef: '상증법 §13',
  });

  // ── (6) 상속세 과세가액
  const taxableAmount = Math.max(totalProperty - liabilities + priorGifts, 0);
  breakdown.push({
    step: 4, label: '상속세 과세가액',
    value: taxableAmount,
    formula: '총상속재산 − 채무·공과금·장례비 + 사전증여재산',
    lawRef: '상증법 §13·14',
  });

  // ── (7) 상속공제 산정
  const basicPersonal = calcBasicAndPersonalDeduct({
    children, minorYears, seniors, disabledYears,
  });
  const netInheritedForSpouse = realProperty + deemedProperty - debts - publicCharges;
  const spouseDeduct = calcSpouseDeduct({
    netInheritedProperty: Math.max(netInheritedForSpouse, 0),
    children, priorGiftToSpouse, spouseExists,
  });
  const cohabitationDeduct = calcCohabitationDeduct(cohabHouseValue, cohabHouseDebt);
  const financialDeduct = calcFinancialDeduct(netFinancialAssets);
  const totalDeduction = basicPersonal.chosen + spouseDeduct + cohabitationDeduct + financialDeduct;
  breakdown.push({
    step: 5, label: '상속공제 합계',
    value: totalDeduction,
    formula: `기초/일괄·인적(${basicPersonal.chosen}) + 배우자(${spouseDeduct}) + 동거주택(${cohabitationDeduct}) + 금융(${financialDeduct})`,
    lawRef: '상증법 §18·19·20·22·23의2',
  });

  // ── (8) 감정평가수수료
  const appraisalApplied = Math.min(appraisalFee, APPRAISAL_FEE_MAX);
  breakdown.push({
    step: 6, label: '감정평가수수료',
    value: appraisalApplied,
    formula: `min(입력값, ${APPRAISAL_FEE_MAX})`,
    lawRef: '상증법 시행령 §20의3',
  });

  // ── (9) 과세표준
  const taxBase = Math.max(taxableAmount - totalDeduction - appraisalApplied, 0);
  breakdown.push({
    step: 7, label: '상속세 과세표준',
    value: taxBase,
    formula: '과세가액 − 상속공제 − 감정평가수수료',
    lawRef: '상증법 §25',
  });

  // ── (10) 산출세액 (누진세율표)
  const { rawTax, taxRate, accDeduct } = calcInheritTariff(taxBase);
  breakdown.push({
    step: 8, label: '산출세액',
    value: Math.floor(rawTax),
    formula: `과세표준 × ${taxRate * 100}% − ${accDeduct}`,
    lawRef: '상증법 §26',
  });

  // ── (11) 세대생략 할증 (§27)
  let skipSurcharge = 0;
  if (skipGeneration) {
    const skipRate = skipMinorLarge && taxableAmount > INHERIT_SKIP_LARGE_THRESHOLD
      ? INHERIT_SKIP_RATE_MINOR_LARGE
      : INHERIT_SKIP_RATE_DEFAULT;
    skipSurcharge = rawTax * skipRate;
    breakdown.push({
      step: 9, label: '세대생략 할증',
      value: Math.floor(skipSurcharge),
      formula: `산출세액 × ${skipRate * 100}%`,
      lawRef: '상증법 §27',
    });
  }
  const taxAfterSurcharge = rawTax + skipSurcharge;

  // ── (12) 증여세액공제 (§28) — 사전증여 시 기납부 증여세
  const giftTaxCredit = paidGiftTax;

  // ── (13) 단기재상속 세액공제 (§30)
  const shortTermRate = shortTermReinheritRate(shortTermPriorYears);
  const shortTermCredit = shortTermPriorTax * shortTermRate;
  if (shortTermCredit > 0) {
    breakdown.push({
      step: 10, label: '단기재상속 세액공제',
      value: Math.floor(shortTermCredit),
      formula: `직전상속세 × ${(shortTermRate * 100).toFixed(0)}% (경과 ${shortTermPriorYears}년)`,
      lawRef: '상증법 §30',
    });
  }

  // ── (14) 신고세액공제 3% (§69)
  // 산출세액에서 증여세액공제·단기재상속공제를 차감한 후의 잔액에 3% 적용
  const taxAfterCredits = Math.max(taxAfterSurcharge - giftTaxCredit - shortTermCredit, 0);
  const faithfulReportCredit = taxAfterCredits * INHERIT_FAITHFUL_REPORT_DISCOUNT;
  breakdown.push({
    step: 11, label: '세액공제 합계',
    value: Math.floor(giftTaxCredit + shortTermCredit + faithfulReportCredit),
    formula: `증여세액공제(${giftTaxCredit}) + 단기재상속(${Math.floor(shortTermCredit)}) + 신고세액공제 3%(${Math.floor(faithfulReportCredit)})`,
    lawRef: '상증법 §28·30·69',
  });

  // ── (15) 자진납부할세액
  const payableTaxRaw = taxAfterCredits - faithfulReportCredit;
  const payableTax = Math.max(0, Math.floor(payableTaxRaw / 10) * 10);  // 10원 미만 절사
  breakdown.push({
    step: 12, label: '자진납부할세액',
    value: payableTax,
    formula: '산출세액(+할증) − 세액공제',
    lawRef: '상증법 §67',
  });

  return {
    tax: payableTax,
    breakdown,
    lawRef: LAW_REF,
    detail: {
      totalProperty, realProperty, deemedProperty, presumed,
      liabilities, funeralDeduct, priorGifts, taxableAmount,
      basicPersonal, spouseDeduct, cohabitationDeduct, financialDeduct,
      totalDeduction, appraisalApplied, taxBase,
      taxRate, accDeduct, rawTax: Math.floor(rawTax),
      skipSurcharge: Math.floor(skipSurcharge),
      giftTaxCredit, shortTermCredit: Math.floor(shortTermCredit),
      faithfulReportCredit: Math.floor(faithfulReportCredit),
    },
  };
}
