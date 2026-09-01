/**
 * 관리자 목록 검색 — 기간 프리셋 공통 유틸
 */

export const SEARCH_PERIOD_PRESETS = [
  { key: 'today', label: '오늘' },
  { key: '1w', label: '1주일' },
  { key: '1m', label: '1개월' },
  { key: '3m', label: '3개월' },
  { key: '6m', label: '6개월' },
  { key: '1y', label: '1년' },
  { key: 'all', label: '전체' },
];

function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 프리셋 → { startDate, endDate } (YYYY-MM-DD). all 은 빈 문자열 */
export function rangeFromPreset(key) {
  const end = new Date();
  const start = new Date();
  if (!key || key === 'all') return { startDate: '', endDate: '' };
  if (key === 'today') return { startDate: toISODate(start), endDate: toISODate(end) };
  const map = { '1w': 7, '1m': 30, '3m': 90, '6m': 180, '1y': 365 };
  start.setDate(start.getDate() - (map[key] || 0));
  return { startDate: toISODate(start), endDate: toISODate(end) };
}

/** 프리셋 또는 커스텀 날짜로 실제 조회 기간 산출 */
export function resolveSearchRange(preset, startDate, endDate) {
  if (preset) return rangeFromPreset(preset);
  return {
    startDate: startDate || '',
    endDate: endDate || '',
  };
}
