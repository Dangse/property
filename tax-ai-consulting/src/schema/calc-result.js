/**
 * 표준 계산 결과 스키마 — 모든 계산 함수가 따라야 할 반환 형태
 *
 * AI는 절대 세액을 직접 계산하지 않고, 본 스키마를 통해 받은 값만 인용한다.
 * 모든 step에 lawRef(법조문 출처)가 부착되어 있어야 한다.
 *
 * @typedef {object} CalcStep
 * @property {number} step
 * @property {string} label           예: "장기보유특별공제"
 * @property {number} value           해당 단계 금액
 * @property {string} formula         산식 (사람이 읽는 형태)
 * @property {string} lawRef          법조문 (예: "소득세법 §95② 표1")
 *
 * @typedef {object} CalcResult
 * @property {number}     tax         최종 자진납부세액
 * @property {CalcStep[]} breakdown   단계별 세부내역
 * @property {string[]}   lawRef      참조 법령 목록
 * @property {object}     [detail]    원시 계산값 (디버깅/리포트용)
 */

/**
 * 시나리오 결과 표준 스키마
 * @typedef {object} ScenarioResult
 * @property {number}   scenarioId
 * @property {string}   title
 * @property {object}   inputs
 * @property {object}   summary       핵심 요약값 (모든 값 number)
 * @property {string[]} lawRef
 */

export const CALC_RESULT_VERSION = '1.0.0';

/**
 * 계산 결과가 표준 스키마를 따르는지 런타임 검증 (개발용)
 */
export function validateCalcResult(result, { strict = false } = {}) {
  const errors = [];
  if (typeof result?.tax !== 'number') errors.push('tax must be number');
  if (!Array.isArray(result?.breakdown)) errors.push('breakdown must be array');
  if (!Array.isArray(result?.lawRef)) errors.push('lawRef must be array');
  if (Array.isArray(result?.breakdown)) {
    for (const [i, step] of result.breakdown.entries()) {
      if (typeof step?.step !== 'number') errors.push(`breakdown[${i}].step`);
      if (typeof step?.label !== 'string') errors.push(`breakdown[${i}].label`);
      if (typeof step?.value !== 'number') errors.push(`breakdown[${i}].value`);
      if (typeof step?.lawRef !== 'string') errors.push(`breakdown[${i}].lawRef`);
    }
  }
  if (strict && errors.length) throw new Error(`Invalid CalcResult: ${errors.join(', ')}`);
  return { ok: errors.length === 0, errors };
}
