import { describe, it, expect } from 'vitest';
import {
  calcTools, toolByName, toolSchemas, executeToolUse,
} from '../../src/ai/tools/calc-tools.js';

describe('calc-tools 등록 상태', () => {
  it('7개 계산 도구 + run_scenario 등록', () => {
    const names = toolSchemas.map(t => t.name);
    expect(names).toEqual(expect.arrayContaining([
      'calc_gift_tax', 'calc_acquisition_tax', 'calc_property_tax',
      'calc_aggregate_tax', 'calc_transfer_tax', 'calc_inherit_tax',
      'run_scenario',
    ]));
  });

  it('모든 도구는 name·description·input_schema를 가진다', () => {
    for (const t of calcTools) {
      expect(t.schema.name).toBeTruthy();
      expect(t.schema.description).toBeTruthy();
      expect(t.schema.input_schema?.type).toBe('object');
      expect(typeof t.run).toBe('function');
    }
  });
});

describe('executeToolUse — Claude tool_use 처리', () => {
  it('정상 호출: 결과 JSON 문자열 반환', () => {
    const result = executeToolUse({
      id: 'tu_1', name: 'calc_property_tax',
      input: { oneOOne: '다주택', gongsi: 500_000_000 },
    });
    expect(result.type).toBe('tool_result');
    expect(result.tool_use_id).toBe('tu_1');
    expect(result.is_error).toBeUndefined();
    const parsed = JSON.parse(result.content);
    expect(parsed.total).toBeGreaterThan(0);
  });

  it('상속세 도구 호출', () => {
    const result = executeToolUse({
      id: 'tu_2', name: 'calc_inherit_tax',
      input: { houseValue: 2_000_000_000, children: 1, spouseExists: true },
    });
    const parsed = JSON.parse(result.content);
    expect(parsed.breakdown).toBeDefined();
    expect(parsed.lawRef.length).toBeGreaterThan(0);
  });

  it('시나리오 11 호출 (상속 종합)', () => {
    const result = executeToolUse({
      id: 'tu_3', name: 'run_scenario',
      input: {
        scenarioId: 11,
        inputs: {
          inheritance: { houseValue: 1_500_000_000, children: 2, spouseExists: true },
          acquisition: { houseValue: 1_500_000_000, householdAllNoHouse: false, houseSpace: 85 },
          holding: { gongsiBefore: 700_000_000, gongsiInherited: 800_000_000,
                     ownedHousesBefore: 1, age: 65, period: 10, inheritExclusion5y: true },
        },
      },
    });
    const parsed = JSON.parse(result.content);
    expect(parsed.scenarioId).toBe(11);
  });

  it('미정의 도구: 에러 결과', () => {
    const result = executeToolUse({ id: 'tu_x', name: 'nonexistent', input: {} });
    expect(result.is_error).toBe(true);
    expect(result.content).toMatch(/Unknown tool/);
  });

  it('toolByName 빠른 조회', () => {
    expect(toolByName.calc_gift_tax).toBeDefined();
    expect(toolByName.run_scenario).toBeDefined();
  });
});
