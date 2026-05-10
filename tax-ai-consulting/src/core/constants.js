/**
 * 세금 계산 공통 상수
 * 기준일: 2026.5.10 시행분
 */

// 증여 관계 코드
export const CHILD = 1;    // 직계비속(자녀)
export const SPOUSE = 2;   // 배우자
export const PARENTS = 3;  // 직계존속(부모)
export const EXT_REL = 4;  // 기타 친족 (자녀의 배우자 등 6촌 이내 혈족·4촌 이내 인척)
export const ETC = 5;      // 타인 (기타)

// 세대생략 여부
export const SKIP_T = 1;   // 세대생략 있음 (손자녀 등)
export const SKIP_F = 2;   // 세대생략 없음

// 양도세 중과 관련
export const LANDTRADE_DEADLINE_OLD_ADJ = "2026-09-09";  // 기존 조정지역 토허 양도 마감일
export const LANDTRADE_DEADLINE_NEW_ADJ = "2026-11-09";  // 신규 조정지역 토허 양도 마감일
export const HEAVY_RESUME_DATE = "2026-05-10";           // 다주택 중과 부활일

// 1세대1주택 비과세 고가주택 기준 (2022.1.1 이후 12억)
export const SINGLE_HH_NONTAX_THRESHOLD = 1_200_000_000;

// 종부세 공제금액
export const AGGR_DEDUCT_SINGLE = 1_200_000_000;  // 1세대1주택
export const AGGR_DEDUCT_OTHERS = 900_000_000;    // 다주택·기타
export const AGGR_FAIR_MARKET_RATE = 0.6;         // 공정시장가액비율 60% (2026)

// 증여세 공제한도
export const GIVE_DEDUCT = {
  CHILD_ADULT: 50_000_000,    // 성년 자녀
  CHILD_MINOR: 20_000_000,    // 미성년 자녀
  SPOUSE: 600_000_000,        // 배우자
  PARENTS: 50_000_000,        // 직계존속
  EXT_REL: 10_000_000,        // 기타친족
  ETC: 0,                     // 타인
};

// 성년 기준 나이
export const ADULT_AGE = 19;

// 세대독립 판정 나이 (30세 이상이면 별도세대로 간주하는 시나리오 전제)
export const INDEPENDENT_HH_AGE = 30;
