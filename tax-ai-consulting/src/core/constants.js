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

// ──────────────────────────────────────────────────────────────
// 상속세 (상속세 및 증여세법, 2024년 정부개정안 부결 → 2026.5 현재 종전 유지)
// 검증 출처: docs/tax-law-2026.md §1
// ──────────────────────────────────────────────────────────────

// 기초공제·일괄공제·인적공제 단가 (상증법 §18~§20)
export const INHERIT_BASIC_DEDUCT = 200_000_000;       // 기초공제 2억
export const INHERIT_LUMP_DEDUCT  = 500_000_000;       // 일괄공제 5억
export const INHERIT_CHILD_DEDUCT_UNIT  = 50_000_000;  // 자녀공제 1인당 5천만
export const INHERIT_MINOR_DEDUCT_UNIT  = 10_000_000;  // 미성년자 1년당 1천만
export const INHERIT_SENIOR_DEDUCT_UNIT = 50_000_000;  // 65세 이상 1인당 5천만
export const INHERIT_DISABLED_DEDUCT_UNIT = 10_000_000; // 장애인 1년당 1천만 (기대여명)
export const INHERIT_MINOR_AGE_THRESHOLD = 19;

// 배우자상속공제 (상증법 §19)
export const INHERIT_SPOUSE_MIN = 500_000_000;          // 최소 5억
export const INHERIT_SPOUSE_MAX = 3_000_000_000;        // 최대 30억
export const SPOUSE_LEGAL_SHARE_RATIO = 1.5;            // 배우자 법정상속분 가중치

// 동거주택상속공제 (상증법 §23의2)
export const INHERIT_COHABITATION_MAX = 600_000_000;    // 6억 한도

// 금융재산상속공제 (상증법 §22)
export const INHERIT_FINANCIAL_FULL_BELOW = 20_000_000; // 2천만 이하 전액
export const INHERIT_FINANCIAL_RATE = 0.20;             // 초과 시 20%
export const INHERIT_FINANCIAL_MIN  = 20_000_000;       // 최소 2천만
export const INHERIT_FINANCIAL_MAX  = 200_000_000;      // 최대 2억

// 장례비 공제 (상증법 §14①2, 시행령 §9의2)
export const FUNERAL_MIN = 5_000_000;                   // 최소 500만 일률공제
export const FUNERAL_GENERAL_MAX = 10_000_000;          // 일반장례비 1천만 한도
export const FUNERAL_SUPPLEMENTAL_MAX = 5_000_000;      // 봉안시설 별도 500만 한도

// 감정평가수수료 (상증법 시행령 §20의3)
export const APPRAISAL_FEE_MAX = 5_000_000;             // 500만 한도

// 세대생략 할증과세 (상증법 §27)
export const INHERIT_SKIP_RATE_DEFAULT = 0.30;          // 30%
export const INHERIT_SKIP_RATE_MINOR_LARGE = 0.40;      // 미성년 + 20억 초과 40%
export const INHERIT_SKIP_LARGE_THRESHOLD = 2_000_000_000;

// 신고세액공제 (상증법 §69)
export const INHERIT_FAITHFUL_REPORT_DISCOUNT = 0.03;   // 3%

// 추정상속재산 임계값 (상증법 §15)
export const PRESUMED_1Y_THRESHOLD = 200_000_000;       // 1년 2억
export const PRESUMED_2Y_THRESHOLD = 500_000_000;       // 2년 5억

// 상속주택 주택수 제외 특례 기간 (종부세법 §15의2, 지방세법 §111의2)
export const INHERIT_HOUSE_EXCLUSION_YEARS = 5;

// 상속 취득세 (지방세법 §11①4)
export const INHERIT_ACQ_HOUSE_SINGLE = 0.008;          // 1세대1주택 0.8%
export const INHERIT_ACQ_HOUSE_MULTI  = 0.028;          // 다주택·일반 2.8%
export const INHERIT_ACQ_FARMLAND     = 0.023;          // 농지 2.3%
export const INHERIT_ACQ_OTHER        = 0.028;          // 건물·일반토지 2.8%
export const INHERIT_ACQ_FARMLAND_EDU = 0.0006;         // 농지 교육세 0.06%
export const INHERIT_ACQ_DEFAULT_EDU  = 0.0016;         // 일반 교육세 0.16%
export const INHERIT_ACQ_AG_RATE      = 0.002;          // 농특세 0.2% (85㎡ 초과)
