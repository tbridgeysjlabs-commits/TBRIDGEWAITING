/**
 * 뿌리오 알림톡 템플릿 코드 / changeWord(var1~) 매핑
 *
 * 템플릿 본문의 [*1*]~[*8*] ↔ changeWord.var1~var8
 * 실제 승인 템플릿 문구에 맞게 변수 순서를 조정하세요.
 *
 * env 기본값(지시서):
 * - PPURIO_TEMPLATE_LAST_ORDER
 * - PPURIO_TEMPLATE_CHOSEN_ORDER
 * - PPURIO_TEMPLATE_NO_POSTPONE
 * - PPURIO_TEMPLATE_APPROACHING
 * - PPURIO_TEMPLATE_CALL_ENTRY
 * - PPURIO_TEMPLATE_CANCEL
 * - PPURIO_TEMPLATE_POSTPONE_DONE
 * - PPURIO_TEMPLATE_TIMEOUT_CANCEL
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
 * 컨텍스트 → changeWord (뿌리오 [*1*]~[*n*] ↔ var1~varn)
 *
 * [사람 확인] 아래 순서는 추정 기본값입니다.
 * 뿌리오 템플릿 승인 본문의 [*1*]~[*n*] 순서와 다르면 여기만 수정하세요.
 *
 * ctx: { facilityName, dailySeq, totalCount, remainingOrder, aheadCount,
 *        newOrder, entryWaitMinutes, completeLink, cancelLink, postponeLink }
 */
export function buildChangeWord(templateKey, ctx = {}) {
  const s = (v) => (v === undefined || v === null ? '' : String(v));

  switch (templateKey) {
    case TEMPLATE.LAST_ORDER:
    case TEMPLATE.CHOSEN_ORDER:
    case TEMPLATE.NO_POSTPONE:
      // TODO: 승인 본문 기준 재확인 — 시설명/순번/인원/확인링크/취소링크
      return {
        var1: s(ctx.facilityName),
        var2: s(ctx.dailySeq),
        var3: s(ctx.totalCount),
        var4: s(ctx.completeLink),
        var5: s(ctx.cancelLink),
      };

    case TEMPLATE.APPROACHING:
      // TODO: 승인 본문 기준 재확인 — 시설명/순번/남은순번/앞대기/확인링크
      return {
        var1: s(ctx.facilityName),
        var2: s(ctx.dailySeq),
        var3: s(ctx.remainingOrder),
        var4: s(ctx.aheadCount),
        var5: s(ctx.completeLink),
      };

    case TEMPLATE.CALL_ENTRY:
      // TODO: 승인 본문 기준 재확인 — 시설명/순번/입장대기분/확인링크
      return {
        var1: s(ctx.facilityName),
        var2: s(ctx.dailySeq),
        var3: s(ctx.entryWaitMinutes),
        var4: s(ctx.completeLink),
      };

    case TEMPLATE.CANCEL:
    case TEMPLATE.TIMEOUT_CANCEL:
      // TODO: 승인 본문 기준 재확인 — 시설명/순번
      return {
        var1: s(ctx.facilityName),
        var2: s(ctx.dailySeq),
      };

    case TEMPLATE.POSTPONE_DONE:
      // TODO: 승인 본문 기준 재확인 — 시설명/순번/변경후순번/확인링크
      return {
        var1: s(ctx.facilityName),
        var2: s(ctx.dailySeq),
        var3: s(ctx.newOrder),
        var4: s(ctx.completeLink),
      };

    default:
      return {
        var1: s(ctx.facilityName),
        var2: s(ctx.dailySeq),
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
