/**
 * AI 도구 정의 — Claude가 호출할 수 있는 계산기 래퍼
 *
 * 각 도구는:
 *  - schema:  Claude에 전달할 도구 정의 (name, description, input_schema)
 *  - run(input): Claude가 보낸 입력으로 실제 계산을 수행하고 표준 결과 반환
 *
 * 모든 입력은 원 단위. 금액은 number.
 */

import { calcGiveTax } from '../../core/gift-tax.js';
import { calcTakingTax } from '../../core/acquisition-tax.js';
import { calcPropertyTax } from '../../core/property-tax.js';
import { calcAggrTax } from '../../core/comprehensive-tax.js';
import { calcSaleIncomeTax } from '../../core/transfer-tax.js';
import { calcInheritTax } from '../../core/inheritance-tax.js';
import * as scenarios from '../../scenario/index.js';

const moneyDesc = '금액 (원 단위 정수)';

export const calcTools = [
  // ── 증여세 ──────────────────────────────────────────────
  {
    schema: {
      name: 'calc_gift_tax',
      description: '증여세 계산. 상증법 §53·56·57·69 적용.',
      input_schema: {
        type: 'object',
        properties: {
          giveRel: { type: 'integer', enum: [1,2,3,4,5],
            description: '수증자 관계: 1=자녀,2=배우자,3=직계존속,4=기타친족,5=타인' },
          isSkip:  { type: 'integer', enum: [1,2], description: '세대생략: 1=있음, 2=없음' },
          giftPrice:    { type: 'integer', description: moneyDesc },
          recipientAge: { type: 'integer', description: '수증자 만 나이' },
        },
        required: ['giveRel', 'isSkip', 'giftPrice', 'recipientAge'],
      },
    },
    run: ({ giveRel, isSkip, giftPrice, recipientAge }) =>
      calcGiveTax(giveRel, isSkip, giftPrice, recipientAge),
  },

  // ── 취득세 ──────────────────────────────────────────────
  {
    schema: {
      name: 'calc_acquisition_tax',
      description: '취득세 계산. 매매·상속·증여·분양 유형별.',
      input_schema: {
        type: 'object',
        properties: {
          type:  { type: 'string', enum: ['normal','inherit','give','give1s1h','pre'],
            description: '취득 유형 (normal=매매, inherit=상속, give=증여, give1s1h=1세대1주택 배우자/직계 증여, pre=분양권)' },
          price: { type: 'integer', description: moneyDesc },
          newHouse:     { type: 'integer', description: '신규분양 코드 (0=기존, 1/3/8/12=분양세율%)', default: 0 },
          inheritHouse: { type: 'integer', description: '상속주택수 (0=1주택, 1=다주택)', default: 0 },
          space: { type: 'integer', enum: [85, 86], description: '85=국민주택규모 이하, 86=초과' },
          heavy: { type: 'integer', enum: [0, 1], description: '0=비조정, 1=조정지역' },
        },
        required: ['type', 'price', 'space', 'heavy'],
      },
    },
    run: ({ type, price, newHouse=0, inheritHouse=0, space, heavy }) =>
      calcTakingTax(type, price, newHouse, inheritHouse, space, heavy),
  },

  // ── 재산세 ──────────────────────────────────────────────
  {
    schema: {
      name: 'calc_property_tax',
      description: '재산세 계산 (지방세법 §111).',
      input_schema: {
        type: 'object',
        properties: {
          oneOOne: { type: 'string', enum: ['1세대1주택','공동명의1주택','다주택'] },
          gongsi:  { type: 'integer', description: '공시가격 (원)' },
        },
        required: ['oneOOne', 'gongsi'],
      },
    },
    run: ({ oneOOne, gongsi }) => calcPropertyTax(oneOOne, gongsi),
  },

  // ── 종부세 ──────────────────────────────────────────────
  {
    schema: {
      name: 'calc_aggregate_tax',
      description: '종합부동산세 계산. 재산세액 입력 필요(이중과세 조정).',
      input_schema: {
        type: 'object',
        properties: {
          oneOOne: { type: 'string', enum: ['1세대1주택','공동명의1주택','다주택'] },
          heavy:   { type: 'string', enum: ['조정지역','비조정지역'] },
          gongsi:  { type: 'integer', description: '공시가격 합계' },
          period:  { type: 'integer', description: '보유기간(년)' },
          age:     { type: 'integer', description: '소유자 만 나이' },
          propertyTax: { type: 'integer', description: '재산세액(공제용)' },
        },
        required: ['oneOOne', 'heavy', 'gongsi', 'period', 'age', 'propertyTax'],
      },
    },
    run: ({ oneOOne, heavy, gongsi, period, age, propertyTax }) =>
      calcAggrTax(oneOOne, heavy, gongsi, period, age, propertyTax),
  },

  // ── 양도세 ──────────────────────────────────────────────
  {
    schema: {
      name: 'calc_transfer_tax',
      description: '양도소득세 계산. 1세대1주택 비과세·다주택 중과·비사업용토지 등 반영.',
      input_schema: {
        type: 'object',
        properties: {
          marketPrice: { type: 'integer', description: '양도가액' },
          basePrice:   { type: 'integer', description: '취득가액(필요경비)' },
          holdPeriod:  { type: 'number', description: '보유기간(년, 소수 가능)' },
          stayPeriod:  { type: 'number', description: '거주기간(년)' },
          isWvr: { type: 'string', enum: ['1세대1주택','다주택','기타'] },
          type:  { type: 'string', enum: ['주택','토지','건물','비사업토지'] },
          ownCount: { type: 'integer', description: '보유 주택수 (다주택 중과 판정)', default: 0 },
          isAdj:    { type: 'integer', enum: [0,1], description: '조정대상지역(0/1)', default: 0 },
          isLandtradeApply: { type: 'integer', enum: [0,1], description: '토지거래허가 신청분', default: 0 },
          saleDate:  { type: 'string', description: '양도일 YYYY-MM-DD (마감일 체크용)', default: '' },
          isNewAdj:  { type: 'integer', enum: [0,1], description: '2025.10.16 신규 조정지역', default: 0 },
        },
        required: ['marketPrice','basePrice','holdPeriod','stayPeriod','isWvr','type'],
      },
    },
    run: (i) => calcSaleIncomeTax(
      i.marketPrice, i.basePrice, i.holdPeriod, i.stayPeriod, i.isWvr, i.type,
      i.ownCount ?? 0, i.isAdj ?? 0, i.isLandtradeApply ?? 0, i.saleDate ?? '', i.isNewAdj ?? 0,
    ),
  },

  // ── 상속세 ──────────────────────────────────────────────
  {
    schema: {
      name: 'calc_inherit_tax',
      description: '상속세 본세 계산 (상증법 §7~§69). 모든 입력은 선택적이며 미입력 시 0 처리.',
      input_schema: {
        type: 'object',
        properties: {
          houseValue: { type: 'integer' }, buildingValue: { type: 'integer' },
          agriculturalLandValue: { type: 'integer' }, forestLandValue: { type: 'integer' },
          otherProperty: { type: 'integer' },
          insuranceProceeds: { type: 'integer', description: '간주상속재산: 보험금' },
          retirementBenefit: { type: 'integer', description: '간주상속재산: 퇴직금' },
          trustAssets: { type: 'integer' },
          presumedAssets: { type: 'integer', description: '추정상속재산 (§15)' },
          debts: { type: 'integer' }, publicCharges: { type: 'integer' },
          generalFuneral: { type: 'integer' }, supplementalFuneral: { type: 'integer' },
          priorGiftToSpouse: { type: 'integer' },
          priorGiftToHeirs:  { type: 'integer' },
          priorGiftToOthers: { type: 'integer' },
          paidGiftTax: { type: 'integer' },
          spouseExists: { type: 'boolean' },
          children: { type: 'integer' },
          minorYears: { type: 'integer' }, seniors: { type: 'integer' },
          disabledYears: { type: 'integer' },
          cohabHouseValue: { type: 'integer' }, cohabHouseDebt: { type: 'integer' },
          netFinancialAssets: { type: 'integer' },
          appraisalFee: { type: 'integer' },
          skipGeneration: { type: 'boolean' },
          skipMinorLarge: { type: 'boolean' },
          shortTermPriorYears: { type: 'integer' },
          shortTermPriorTax: { type: 'integer' },
        },
      },
    },
    run: (input) => calcInheritTax(input),
  },

  // ── 시나리오 ────────────────────────────────────────────
  {
    schema: {
      name: 'run_scenario',
      description: '시나리오 1~11 실행. 각 시나리오는 여러 세금을 묶어 비교 분석한다.',
      input_schema: {
        type: 'object',
        properties: {
          scenarioId: { type: 'integer', minimum: 1, maximum: 11 },
          inputs: { type: 'object', description: '시나리오별 입력 객체' },
        },
        required: ['scenarioId', 'inputs'],
      },
    },
    run: ({ scenarioId, inputs }) => {
      const fn = scenarios[`runScenario${scenarioId}`];
      if (!fn) throw new Error(`Unknown scenarioId: ${scenarioId}`);
      return fn(inputs);
    },
  },
];

/** name → tool 빠른 조회 */
export const toolByName = Object.fromEntries(
  calcTools.map(t => [t.schema.name, t])
);

/** Anthropic API에 보낼 tools 배열 (schema만 추출) */
export const toolSchemas = calcTools.map(t => t.schema);

/**
 * Claude의 tool_use 블록을 받아 실제 계산 실행
 * @returns {{ type:'tool_result', tool_use_id:string, content:string, is_error?:boolean }}
 */
export function executeToolUse(toolUseBlock) {
  const { id, name, input } = toolUseBlock;
  try {
    const tool = toolByName[name];
    if (!tool) throw new Error(`Unknown tool: ${name}`);
    const result = tool.run(input ?? {});
    return {
      type: 'tool_result',
      tool_use_id: id,
      content: JSON.stringify(result),
    };
  } catch (err) {
    return {
      type: 'tool_result',
      tool_use_id: id,
      content: `Error: ${err.message}`,
      is_error: true,
    };
  }
}
