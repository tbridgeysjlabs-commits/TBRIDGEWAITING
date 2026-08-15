/**
 * 뿌리오 알림톡 템플릿 코드 / changeWord(var1~) 매핑
 *
 * 템플릿 본문·버튼의 [*1*]~[*8*] ↔ changeWord.var1~var8
 *
 * ─── 등록 템플릿(미루기없음 ppur_202608101036…) 실측 기반 ───
 * 증상: var4/var5에 URL을 넣자 "대기번호"/"인원" 자리에 URL이 출력됨
 *  → [*4*] = 대기번호(당일 순번, 숫자), [*5*] = 인원(숫자)
 *  → 본문 숫자 슬롯에 URL을 넣지 말 것
 *
 * 버튼 URL:
 *  - 뿌리오 `/v1/kakao` 요청에는 버튼 URL 전용 필드가 없음 (targets[].changeWord 만 사용)
 *  - 버튼 웹링크에 `[*n*]`(또는 동일 변수)를 넣어 템플릿 등록한 경우에만 changeWord로 치환됨
 *  - 아래 var6~var8 에 절대 URL을 넣음. 템플릿 버튼이 [*6*]~[*8*] 을 쓰는지
 *    뿌리오 콘솔에서 반드시 재확인 필요. 고정 URL로 등록됐다면 템플릿 재심사 필요.
 *
 * [사람 확인] 뿌리오 > 카카오톡 > 알림톡 템플릿 관리에서
 * 본문 [*1*]~[*5*] 위치와 버튼 Mobile/PC URL 변수 슬롯을 캡처해 알려주시면 재조정합니다.
 */

export const TEMPLATE = {
  /** 등록 — 미루기: 마지막 순서 */
  LAST_ORDER: 'LAST_ORDER',
  /** 등록 — 미루기: 선택 순서 */
  CHOSEN_ORDER: 'CHOSEN_ORDER',
  /** 등록 — 미루기 없음 */
  NO_POSTPONE: 'NO_POSTPONE',
  /** 입장 임박 */
  APPROACHING: 'APPROACHING',
  /** 입장 호출 */
  CALL_ENTRY: 'CALL_ENTRY',
  /** 대기 취소 */
  CANCEL: 'CANCEL',
  /** 미루기 완료 */
  POSTPONE_DONE: 'POSTPONE_DONE',
  /** 호출 시간 초과 취소 */
  TIMEOUT_CANCEL: 'TIMEOUT_CANCEL',
};

const ENV_KEYS = {
  [TEMPLATE.LAST_ORDER]: 'PPURIO_TEMPLATE_LAST_ORDER',
  [TEMPLATE.CHOSEN_ORDER]: 'PPURIO_TEMPLATE_CHOSEN_ORDER',
  [TEMPLATE.NO_POSTPONE]: 'PPURIO_TEMPLATE_NO_POSTPONE',
  [TEMPLATE.APPROACHING]: 'PPURIO_TEMPLATE_APPROACHING',
  [TEMPLATE.CALL_ENTRY]: 'PPURIO_TEMPLATE_CALL_ENTRY',
  [TEMPLATE.CANCEL]: 'PPURIO_TEMPLATE_CANCEL',
  [TEMPLATE.POSTPONE_DONE]: 'PPURIO_TEMPLATE_POSTPONE_DONE',
  [TEMPLATE.TIMEOUT_CANCEL]: 'PPURIO_TEMPLATE_TIMEOUT_CANCEL',
};

const DEFAULT_CODES = {
  [TEMPLATE.LAST_ORDER]: 'ppur_2026081011012424417461220',
  [TEMPLATE.CHOSEN_ORDER]: 'ppur_2026081010513547407847827',
  [TEMPLATE.NO_POSTPONE]: 'ppur_2026081010363124417778583',
  [TEMPLATE.APPROACHING]: 'ppur_2026081011524724417352840',
  [TEMPLATE.CALL_ENTRY]: 'ppur_2026081011564824417569750',
  [TEMPLATE.CANCEL]: 'ppur_2026081011575247407264007',
  [TEMPLATE.POSTPONE_DONE]: 'ppur_2026081012040224417995230',
  [TEMPLATE.TIMEOUT_CANCEL]: 'ppur_2026081012005647407878148',
};

export function getTemplateCode(templateKey) {
  const envName = ENV_KEYS[templateKey];
  const fromEnv = envName ? process.env[envName] : '';
  return (fromEnv && String(fromEnv).trim()) || DEFAULT_CODES[templateKey] || '';
}

/**
 * 등록 알림톡 템플릿 키 — 시설 미루기 정책에 따라 분기
 */
export function registrationTemplateKey(postponePolicy) {
  if (postponePolicy === 'select_position') return TEMPLATE.CHOSEN_ORDER;
  if (postponePolicy === 'last_position') return TEMPLATE.LAST_ORDER;
  return TEMPLATE.NO_POSTPONE;
}

/**
 * 컨텍스트 → changeWord
 *
 * ctx: {
 *   facilityName, dailySeq, totalCount, waitOrder,
 *   remainingOrder, aheadCount, newOrder, entryWaitMinutes,
 *   completeLink, cancelLink, postponeLink
 * }
 */
export function buildChangeWord(templateKey, ctx = {}) {
  const s = (v) => (v === undefined || v === null ? '' : String(v));
  const waitOrder = s(ctx.waitOrder || ctx.remainingOrder || ctx.dailySeq);
  const dailySeq = s(ctx.dailySeq);
  const totalCount = s(ctx.totalCount);
  const links = {
    var6: s(ctx.completeLink),
    var7: s(ctx.postponeLink),
    var8: s(ctx.cancelLink),
  };

  switch (templateKey) {
    case TEMPLATE.LAST_ORDER:
    case TEMPLATE.CHOSEN_ORDER:
    case TEMPLATE.NO_POSTPONE:
      // 실측: [*4*]=대기번호(숫자), [*5*]=인원(숫자) — URL 금지
      // [*1*]시설명 [*2*]현재입장대기순서 [*3*]대기번호(보조) [*4*]대기번호 [*5*]인원
      // [*6*]확인URL [*7*]미루기URL [*8*]취소URL (버튼이 이 슬롯을 쓸 때)
      return {
        var1: s(ctx.facilityName),
        var2: waitOrder,
        var3: dailySeq,
        var4: dailySeq,
        var5: totalCount,
        ...links,
      };

    case TEMPLATE.APPROACHING:
      // 본문 숫자만 — URL은 var6 (이전 var5=URL 은 동일 버그 가능)
      return {
        var1: s(ctx.facilityName),
        var2: dailySeq,
        var3: s(ctx.remainingOrder),
        var4: s(ctx.aheadCount),
        var5: s(ctx.remainingOrder),
        ...links,
      };

    case TEMPLATE.CALL_ENTRY:
      return {
        var1: s(ctx.facilityName),
        var2: dailySeq,
        var3: s(ctx.entryWaitMinutes),
        var4: dailySeq,
        var5: totalCount,
        ...links,
      };

    case TEMPLATE.CANCEL:
    case TEMPLATE.TIMEOUT_CANCEL:
      return {
        var1: s(ctx.facilityName),
        var2: dailySeq,
        var3: totalCount,
        ...links,
      };

    case TEMPLATE.POSTPONE_DONE:
      return {
        var1: s(ctx.facilityName),
        var2: dailySeq,
        var3: s(ctx.newOrder),
        var4: dailySeq,
        var5: totalCount,
        ...links,
      };

    default:
      return {
        var1: s(ctx.facilityName),
        var2: dailySeq,
        var3: totalCount,
        ...links,
      };
  }
}

export function templateDisplayName(templateKey) {
  const names = {
    [TEMPLATE.LAST_ORDER]: '웨이팅등록(마지막순번)',
    [TEMPLATE.CHOSEN_ORDER]: '웨이팅등록(선택순번)',
    [TEMPLATE.NO_POSTPONE]: '웨이팅등록(미루기없음)',
    [TEMPLATE.APPROACHING]: '웨이팅입장 임박안내',
    [TEMPLATE.CALL_ENTRY]: '입장 호출',
    [TEMPLATE.CANCEL]: '대기 취소',
    [TEMPLATE.POSTPONE_DONE]: '미루기 완료',
    [TEMPLATE.TIMEOUT_CANCEL]: '시간초과 취소',
  };
  return names[templateKey] || templateKey;
}
