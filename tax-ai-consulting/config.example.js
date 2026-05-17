/**
 * Claude API 설정
 *
 * ⚠️ 사용 방법:
 *   1. 이 파일을 config.js 로 복사
 *   2. ANTHROPIC_API_KEY 에 실제 키를 채워넣음
 *   3. config.js 는 .gitignore 에 등록되어 절대 푸시되지 않음
 *
 * 키 발급: https://console.anthropic.com/settings/keys
 */

export const ANTHROPIC_API_KEY = '';

// 권장 모델
//   - 'claude-sonnet-4-6'  : 빠르고 비용 효율적 (기본)
//   - 'claude-opus-4-7'    : 복잡한 시나리오·국세청 검토용
//   - 'claude-haiku-4-5'   : 단순 분류·요약용
export const NARRATOR_MODEL = 'claude-sonnet-4-6';
export const REVIEWER_MODEL = 'claude-opus-4-7';

// 응답 최대 토큰
export const MAX_TOKENS = 4096;
