const API_BASE = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL}/api`
  : '/api';

function getToken(scope = 'facility') {
  if (scope === 'system') return localStorage.getItem('tb_system_token');
  return localStorage.getItem('tb_facility_token');
}

export async function api(path, options = {}, scope = 'facility') {
  const headers = {
    ...(options.headers || {}),
  };
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  const token = getToken(scope);
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (options.raw) return res;

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || '요청에 실패했습니다.');
  }
  return data;
}

export function formatPhoneDisplay(digits) {
  const d = String(digits || '').replace(/\D/g, '').slice(0, 11);
  // 항상 010 접두사를 유지한 채 이어서 표시
  const withPrefix = d.startsWith('010') ? d : `010${d}`.slice(0, 11);
  if (withPrefix.length <= 3) return '010 - ';
  if (withPrefix.length <= 7) {
    return `${withPrefix.slice(0, 3)} - ${withPrefix.slice(3)}`;
  }
  return `${withPrefix.slice(0, 3)} - ${withPrefix.slice(3, 7)} - ${withPrefix.slice(7)}`;
}

export function formatNow() {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mi = String(now.getMinutes()).padStart(2, '0');
  return `${yy}.${mm}/${dd} ${hh}:${mi}`;
}

export function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mi}`;
}

export function formatDateYYMMDD(value) {
  if (!value) return '';
  const d = new Date(value);
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}.${mm}.${dd}`;
}

export function formatDateTime(value) {
  if (!value) return '';
  const d = new Date(value);
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${yy}.${mm}.${dd} ${hh}:${mi}:${ss}`;
}

export function formatDuration(seconds) {
  const s = Math.max(0, Math.floor(Number(seconds) || 0));
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}
