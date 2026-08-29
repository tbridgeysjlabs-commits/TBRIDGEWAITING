import {
  formatDateKst,
  formatDateTimeKst,
  formatNowKst,
  formatTimeKst,
} from '../utils/datetime.js';

const API_BASE = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL}/api`
  : '/api';

function getToken(scope = 'facility') {
  if (scope === 'system') return localStorage.getItem('tb_system_token');
  return localStorage.getItem('tb_facility_token');
}

function clearAuth(scope = 'facility') {
  if (scope === 'system') {
    localStorage.removeItem('tb_system_token');
    localStorage.removeItem('tb_system_user');
  } else {
    localStorage.removeItem('tb_facility_token');
    localStorage.removeItem('tb_facility_user');
  }
  window.dispatchEvent(new CustomEvent('tb:auth-expired', { detail: { scope } }));
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
    if (res.status === 401) {
      clearAuth(scope);
    }
    throw new Error(data.message || '요청에 실패했습니다.');
  }
  return data;
}

export function formatPhoneDisplay(digits) {
  const d = String(digits || '').replace(/\D/g, '').slice(0, 11);
  // 항상 010 접두사를 유지한 채 이어서 표시
  const withPrefix = d.startsWith('010') ? d : `010${d}`.slice(0, 11);
  if (withPrefix.length <= 3) return '010-';
  if (withPrefix.length <= 7) {
    return `${withPrefix.slice(0, 3)}-${withPrefix.slice(3)}`;
  }
  return `${withPrefix.slice(0, 3)}-${withPrefix.slice(3, 7)}-${withPrefix.slice(7)}`;
}

export function formatNow() {
  return formatNowKst();
}

export function formatTime(iso) {
  return formatTimeKst(iso);
}

export function formatDateYYMMDD(value) {
  return formatDateKst(value);
}

export function formatDateTime(value) {
  return formatDateTimeKst(value);
}

export function formatDuration(seconds) {
  const s = Math.max(0, Math.floor(Number(seconds) || 0));
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}
