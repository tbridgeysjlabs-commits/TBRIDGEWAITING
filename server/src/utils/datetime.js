/**
 * 서버 측 시각 포맷 — 항상 Asia/Seoul(KST).
 * DB timestamptz(UTC) 값은 표시 시에만 KST로 변환한다.
 */

const KST = 'Asia/Seoul';

export function toKstParts(value) {
  if (value == null || value === '') return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;

  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: KST,
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(d).filter((p) => p.type !== 'literal').map((p) => [p.type, p.value])
  );

  let hh = parts.hour || '00';
  if (hh === '24') hh = '00';

  return {
    yy: parts.year,
    mm: parts.month,
    dd: parts.day,
    hh,
    mi: parts.minute || '00',
    ss: parts.second || '00',
  };
}

/** yy.mm.dd hh:mm 또는 yy.mm.dd hh:mm:ss (알림톡 변수용) */
export function formatDateTimeKst(value, withSeconds = false) {
  const p = toKstParts(value);
  if (!p) return '';
  return withSeconds
    ? `${p.yy}.${p.mm}.${p.dd} ${p.hh}:${p.mi}:${p.ss}`
    : `${p.yy}.${p.mm}.${p.dd} ${p.hh}:${p.mi}`;
}

/** "18시 30분" */
export function formatHourMinuteLabelKst(value) {
  const p = toKstParts(value);
  if (!p) return null;
  return `${Number(p.hh)}시 ${p.mi}분`;
}

/** NicePay EDIDate 등: YYYYMMDDhhmmss (KST) */
export function formatEdiDateKst(value = new Date()) {
  const p = toKstParts(value);
  if (!p) return '';
  return `20${p.yy}${p.mm}${p.dd}${p.hh}${p.mi}${p.ss}`;
}
