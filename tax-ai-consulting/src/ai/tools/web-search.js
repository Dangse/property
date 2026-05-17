/**
 * Web Search 도구 — Anthropic 서버측 빌트인 도구 사용
 *
 * Claude가 직접 검색을 수행하므로 클라이언트는 실행 코드를 가지지 않는다.
 * tool schema만 넘기면 Anthropic 서버가 검색→결과 인용까지 처리한다.
 *
 * 문서: https://docs.anthropic.com/ko/docs/build-with-claude/tool-use/web-search-tool
 */

export const webSearchTool = {
  type: 'web_search_20250305',
  name: 'web_search',
  max_uses: 5,
  // 신뢰성 있는 출처 우선
  allowed_domains: [
    'law.go.kr',           // 국가법령정보센터
    'nts.go.kr',           // 국세청
    'easylaw.go.kr',       // 찾기쉬운 생활법령정보
    'moleg.go.kr',         // 법제처
    'korea.kr',            // 대한민국 정책브리핑
    'mois.go.kr',          // 행정안전부
    'molit.go.kr',         // 국토교통부
    'taxtimes.co.kr',      // 한국세정신문
    'casenote.kr',         // 판례
    'lbox.kr',             // 법령
  ],
};
