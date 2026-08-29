import { formatDateTimeKst } from '../utils/datetime.js';

/**
 * 뿌리오 알림톡 템플릿 코드 / changeWord(var1~) 매핑
 * 본문의 [*n*] ↔ changeWord.varn (번호 건너뛰기 허용 — APPROACHING의 var4·var5 없음)
 */

export const TEMPLATE = {
  REGISTERED: 'REGISTERED',
  APPROACHING: 'APPROACHING',
  CALL_ENTRY: 'CALL_ENTRY',
  TIMEOUT_CANCEL: 'TIMEOUT_CANCEL',
  POSTPONE_DONE: 'POSTPONE_DONE',
  CANCEL: 'CANCEL',
  REFUND: 'REFUND',
  CHARGE: 'CHARGE',
  // 하위 호환 별칭 → REGISTERED
  LAST_ORDER: 'REGISTERED',
  CHOSEN_ORDER: 'REGISTERED',
  NO_POSTPONE: 'REGISTERED',
};

const ENV_KEYS = {
  [TEMPLATE.REGISTERED]: 'PPURIO_TEMPLATE_REGISTERED',
  [TEMPLATE.APPROACHING]: 'PPURIO_TEMPLATE_APPROACHING',
  [TEMPLATE.CALL_ENTRY]: 'PPURIO_TEMPLATE_CALL_ENTRY',
  [TEMPLATE.TIMEOUT_CANCEL]: 'PPURIO_TEMPLATE_TIMEOUT_CANCEL',
  [TEMPLATE.POSTPONE_DONE]: 'PPURIO_TEMPLATE_POSTPONE_DONE',
  [TEMPLATE.CANCEL]: 'PPURIO_TEMPLATE_CANCEL',
  [TEMPLATE.REFUND]: 'PPURIO_TEMPLATE_REFUND',
  [TEMPLATE.CHARGE]: 'PPURIO_TEMPLATE_CHARGE',
};

const DEFAULT_CODES = {
  [TEMPLATE.REGISTERED]: 'ppur_2026081911072324417655171',
  [TEMPLATE.APPROACHING]: 'ppur_2026081911054024417231502',
  [TEMPLATE.CALL_ENTRY]: 'ppur_2026081911043647407558286',
  [TEMPLATE.TIMEOUT_CANCEL]: 'ppur_2026081911024547407465933',
  [TEMPLATE.POSTPONE_DONE]: 'ppur_2026081911012247407706584',
  [TEMPLATE.CANCEL]: 'ppur_2026081910595547407136242',
  [TEMPLATE.REFUND]: 'ppur_2026081812234847407727731',
  [TEMPLATE.CHARGE]: 'ppur_2026081812114047407778284',
};

export function getTemplateCode(templateKey) {
  const key = templateKey === 'LAST_ORDER' || templateKey === 'CHOSEN_ORDER' || templateKey === 'NO_POSTPONE'
    ? TEMPLATE.REGISTERED
    : templateKey;
  const envName = ENV_KEYS[key];
  const fromEnv = envName ? process.env[envName] : '';
  return (fromEnv && String(fromEnv).trim()) || DEFAULT_CODES[key] || '';
}

/** 등록 완료는 미루기 정책과 무관하게 단일 템플릿 */
export function registrationTemplateKey() {
  return TEMPLATE.REGISTERED;
}

function formatDt(date, withSeconds = false) {
  return formatDateTimeKst(date, withSeconds);
}

/**
 * ctx fields used across templates:
 * facilityName, facilityCode, waitingId, dailySeq, totalCount, waitOrder,
 * remainingOrder / notificationOrder, entryWaitMinutes, postponeLimit,
 * cancelledAt, eventAt, amount, balanceAfter
 */
export function buildChangeWord(templateKey, ctx = {}) {
  const s = (v) => (v === undefined || v === null ? '' : String(v));
  const key =
    templateKey === 'LAST_ORDER' ||
    templateKey === 'CHOSEN_ORDER' ||
    templateKey === 'NO_POSTPONE'
      ? TEMPLATE.REGISTERED
      : templateKey;

  const facilityName = s(ctx.facilityName);
  const facilityCode = s(ctx.facilityCode);
  const waitingId = s(ctx.waitingId);
  const waitOrder = s(ctx.waitOrder || ctx.remainingOrder || ctx.dailySeq);
  const dailySeq = s(ctx.dailySeq);
  const totalCount = s(ctx.totalCount);
  const entryWaitMinutes = s(ctx.entryWaitMinutes);
  const notificationOrder = s(
    ctx.notificationOrder ?? ctx.remainingOrder ?? ctx.waitOrder
  );

  switch (key) {
    case TEMPLATE.REGISTERED:
      // [*1*]시설명 [*2*]입장대기순서 [*3*]당일순번 [*4*]인원 [*5*]facilityCode [*6*]waitingId
      return {
        var1: facilityName,
        var2: waitOrder,
        var3: dailySeq,
        var4: totalCount,
        var5: facilityCode,
        var6: waitingId,
      };

    case TEMPLATE.APPROACHING:
      // [*1*]시설명 [*2*]입장대기알림순번 [*3*]facilityCode [*4*]waitingId
      // 템플릿에 [*6*]이 있는 경우도 동일 값으로 호환
      return {
        var1: facilityName,
        var2: s(ctx.notificationOrder ?? ctx.remainingOrder),
        var3: facilityCode,
        var4: waitingId,
        var6: waitingId,
      };

    case TEMPLATE.CALL_ENTRY:
      // [*1*]당일순번 [*2*]시설명 [*3*]입장대기시간 [*4*]facilityCode [*5*]waitingId
      return {
        var1: dailySeq,
        var2: facilityName,
        var3: entryWaitMinutes,
        var4: facilityCode,
        var5: waitingId,
      };

    case TEMPLATE.TIMEOUT_CANCEL:
      // [*1*]입장대기시간 [*2*]시설명 [*3*]취소시각 YY.MM.DD hh:mm
      return {
        var1: entryWaitMinutes,
        var2: facilityName,
        var3: formatDt(ctx.cancelledAt || ctx.eventAt, false),
      };

    case TEMPLATE.POSTPONE_DONE:
      // [*1*]시설명 [*2*]변경순서 [*3*]당일순번 [*4*]인원 [*5*]미루기허용횟수 [*6*]facilityCode [*7*]waitingId
      return {
        var1: facilityName,
        var2: s(ctx.newOrder ?? ctx.waitOrder),
        var3: dailySeq,
        var4: totalCount,
        var5: s(ctx.postponeLimit),
        var6: facilityCode,
        var7: waitingId,
      };

    case TEMPLATE.CANCEL:
      // [*1*]시설명 [*2*]취소시각 YY.MM.DD hh:mm
      return {
        var1: facilityName,
        var2: formatDt(ctx.cancelledAt || ctx.eventAt, false),
      };

    case TEMPLATE.REFUND:
    case TEMPLATE.CHARGE:
      // [*1*]시설명 [*2*]시각 YY.MM.DD hh:mm:ss [*3*]금액 [*4*]잔액
      return {
        var1: facilityName,
        var2: formatDt(ctx.eventAt, true),
        var3: s(ctx.amount),
        var4: s(ctx.balanceAfter),
      };

    default:
      return {
        var1: facilityName,
        var2: waitOrder,
        var3: dailySeq,
        var4: totalCount,
        var5: facilityCode,
        var6: waitingId,
      };
  }
}

export function templateDisplayName(templateKey) {
  const key =
    templateKey === 'LAST_ORDER' ||
    templateKey === 'CHOSEN_ORDER' ||
    templateKey === 'NO_POSTPONE'
      ? TEMPLATE.REGISTERED
      : templateKey;
  const names = {
    [TEMPLATE.REGISTERED]: '웨이팅 등록 완료 안내',
    [TEMPLATE.APPROACHING]: '입장 임박 안내',
    [TEMPLATE.CALL_ENTRY]: '입장 안내',
    [TEMPLATE.TIMEOUT_CANCEL]: '미입장 웨이팅 취소 안내',
    [TEMPLATE.POSTPONE_DONE]: '웨이팅 순서 변경 완료 안내',
    [TEMPLATE.CANCEL]: '웨이팅 취소 완료 안내',
    [TEMPLATE.REFUND]: '티브리지 웨이팅 환불 안내',
    [TEMPLATE.CHARGE]: '티브리지 웨이팅 충전 안내',
  };
  return names[key] || key;
}
