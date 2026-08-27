/**
 * 모든 화면 시각 표시는 Asia/Seoul(KST) 기준으로 통일.
 * DB는 timestamptz(UTC 저장)을 유지하고, 표시할 때만 KST로 변환한다.
 */

const KST = 'Asia/Seoul';

/**
 * @param {string|Date|number|null|undefined} value
 * @returns {{ yy: string, mm: string, dd: string, hh: string, mi: string, ss: string } | null}
 */
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

/** hh:mm */
export function formatTimeKst(value) {
  const p = toKstParts(value);
  if (!p) return '';
  return `${p.hh}:${p.mi}`;
}

/** yy.mm.dd */
export function formatDateKst(value) {
  const p = toKstParts(value);
  if (!p) return '';
  return `${p.yy}.${p.mm}.${p.dd}`;
}

/** yy.mm.dd hh:mm:ss */
export function formatDateTimeKst(value) {
  const p = toKstParts(value);
  if (!p) return '';
  return `${p.yy}.${p.mm}.${p.dd} ${p.hh}:${p.mi}:${p.ss}`;
}

/** yy.mm.dd hh:mm */
export function formatDateTimeShortKst(value) {
  const p = toKstParts(value);
  if (!p) return '';
  return `${p.yy}.${p.mm}.${p.dd} ${p.hh}:${p.mi}`;
}

/** "18시 30분" (24시간제, 시 앞 0 없음) */
export function formatHourMinuteLabelKst(value) {
  const p = toKstParts(value);
  if (!p) return null;
  return `${Number(p.hh)}시 ${p.mi}분`;
}

/** 현재 시각 yy.mm/dd hh:mm (기존 formatNow 호환) */
export function formatNowKst() {
  const p = toKstParts(new Date());
  if (!p) return '';
  return `${p.yy}.${p.mm}/${p.dd} ${p.hh}:${p.mi}`;
}

/** 대기 등록 시각: "대기 등록 2026.08.28 오전 01:07" */
export function formatRegisteredAtKst(value) {
  const p = toKstParts(value);
  if (!p) return '';
  const hour24 = Number(p.hh);
  const ampm = hour24 < 12 ? '오전' : '오후';
  const h12 = hour24 % 12 || 12;
  return `대기 등록 20${p.yy}.${p.mm}.${p.dd} ${ampm} ${String(h12).padStart(2, '0')}:${p.mi}`;
}

/**
 * 시계 UI용 KST 파츠 (요일 인덱스 0=일 … 6=토 포함)
 * @returns {{ yy: string, mm: string, dd: string, hh: string, mi: string, ss: string, weekday: number } | null}
 */
export function toKstClockParts(value = new Date()) {
  const p = toKstParts(value);
  if (!p) return null;
  const d = value instanceof Date ? value : new Date(value);
  const weekdayName = new Intl.DateTimeFormat('en-US', {
    timeZone: KST,
    weekday: 'short',
  }).format(d);
  const map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { ...p, weekday: map[weekdayName] ?? 0 };
}
