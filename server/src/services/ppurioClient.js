/**
 * 뿌리오(ppurio.com) 연동 API 클라이언트
 *
 * 규격:
 * - POST {PPURIO_API_BASE_URL}/v1/token   Basic(계정:연동인증키) → { token, type, expired }
 * - POST {PPURIO_API_BASE_URL}/v1/kakao   Bearer → 알림톡(ALT)
 *
 * Base URL 기본값: https://message.ppurio.com (뿌리오 문자/카카오톡 연동 API)
 * 문서 도메인이 다르면 PPURIO_API_BASE_URL 로만 덮어쓰면 됩니다. (보통은 env 생략 가능)
 *
 * 참고: 발신프로필/템플릿(ppur_…)이 다른 계정에만 등록돼 있었다면
 * 뿌리오 계정에서 발신프로필 등록 + 템플릿 재심사가 필요할 수 있습니다.
 * Render 배포 시 [연동신청관리]에 운영 서버 IP 등록이 필요할 수 있습니다.
 */

/** 뿌리오 연동 API 기본 도메인 — 대부분 프로젝트에서 이 값을 고정 사용 */
const DEFAULT_PPURIO_API_BASE_URL = 'https://message.ppurio.com';

let tokenCache = {
  token: null,
  /** epoch ms */
  expiresAt: 0,
};

function apiBase() {
  return (process.env.PPURIO_API_BASE_URL || DEFAULT_PPURIO_API_BASE_URL)
    .trim()
    .replace(/\/$/, '');
}

export function isPpurioConfigured() {
  if (process.env.PPURIO_ENABLED === '0' || process.env.PPURIO_MOCK === '1') {
    return false;
  }
  return Boolean(
    process.env.PPURIO_ACCOUNT &&
      process.env.PPURIO_AUTH_KEY &&
      process.env.PPURIO_SENDER_PROFILE
  );
}

function parseExpired(expired) {
  const s = String(expired || '');
  if (!/^\d{14}$/.test(s)) return Date.now() + 12 * 60 * 60 * 1000;
  const y = Number(s.slice(0, 4));
  const m = Number(s.slice(4, 6)) - 1;
  const d = Number(s.slice(6, 8));
  const hh = Number(s.slice(8, 10));
  const mi = Number(s.slice(10, 12));
  const ss = Number(s.slice(12, 14));
  return new Date(y, m, d, hh, mi, ss).getTime();
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJson(url, options, { retries = 2 } = {}) {
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const res = await fetch(url, options);
    if (res.status === 429 && attempt < retries) {
      const backoff = 400 * 2 ** attempt;
      console.warn(`[ppurio] rate limit 429 — retry in ${backoff}ms`);
      await sleep(backoff);
      attempt += 1;
      continue;
    }
    const data = await res.json().catch(() => ({}));
    return { res, data };
  }
}

async function fetchAccessToken() {
  const base = apiBase();
  if (!base) throw new Error('[ppurio] PPURIO_API_BASE_URL 이 비어 있습니다.');

  const account = process.env.PPURIO_ACCOUNT;
  const authKey = process.env.PPURIO_AUTH_KEY;
  const basic = Buffer.from(`${account}:${authKey}`, 'utf8').toString('base64');

  const { res, data } = await fetchJson(`${base}/v1/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: '{}',
  });

  const token = data.token || data.accesstoken;
  if (!res.ok || !token) {
    const msg = data.description || data.message || `token HTTP ${res.status}`;
    throw new Error(`[ppurio] 토큰 발급 실패: ${msg}`);
  }

  tokenCache = {
    token,
    expiresAt: parseExpired(data.expired),
  };
  return tokenCache.token;
}

async function getAccessToken() {
  const skewMs = 2 * 60 * 1000;
  if (tokenCache.token && Date.now() < tokenCache.expiresAt - skewMs) {
    return tokenCache.token;
  }
  return fetchAccessToken();
}

export function normalizePhoneDigits(phone) {
  return String(phone || '').replace(/\D/g, '');
}

/**
 * @param {object} opts
 * @param {string} opts.to
 * @param {string} opts.templateCode
 * @param {Record<string,string|number>} opts.changeWord
 * @param {string} [opts.refKey]
 * @param {'Y'|'N'} [opts.isResend='N']
 * @param {object} [opts.resend]
 */
export async function sendAlimtalk({
  to,
  templateCode,
  changeWord = {},
  refKey,
  isResend = 'N',
  resend,
}) {
  const base = apiBase();
  if (!base) throw new Error('[ppurio] PPURIO_API_BASE_URL 이 비어 있습니다.');

  const account = process.env.PPURIO_ACCOUNT;
  const senderProfile = process.env.PPURIO_SENDER_PROFILE;
  const toDigits = normalizePhoneDigits(to);

  if (!toDigits || toDigits.length < 10) {
    throw new Error('[ppurio] 수신 번호가 올바르지 않습니다.');
  }
  if (!templateCode) {
    throw new Error('[ppurio] templateCode 가 비어 있습니다.');
  }

  const cleanedChangeWord = {};
  for (const [k, v] of Object.entries(changeWord || {})) {
    if (v === undefined || v === null || v === '') continue;
    cleanedChangeWord[k] = String(v);
  }

  const body = {
    account,
    messageType: 'ALT',
    senderProfile,
    templateCode,
    duplicateFlag: 'Y',
    targetCount: 1,
    targets: [
      {
        to: toDigits,
        changeWord: cleanedChangeWord,
      },
    ],
    refKey: String(refKey || `tb_${Date.now()}`).slice(0, 32),
    isResend: isResend === 'Y' ? 'Y' : 'N',
  };

  if (body.isResend === 'Y' && resend) {
    body.resend = resend;
  }

  const token = await getAccessToken();
  const { res, data } = await fetchJson(`${base}/v1/kakao`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json; charset=utf-8',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });

  const code = String(data.code ?? data.resultcode ?? '');
  const ok = code === '1000' || code === '0';

  if (!ok) {
    console.error('[ppurio] kakao send failed', {
      http: res.status,
      code,
      description: data.description || data.message,
      templateCode,
      to: toDigits,
    });
    return {
      ok: false,
      code: code || `HTTP_${res.status}`,
      message:
        data.description ||
        data.message ||
        `알림톡 발송 실패 (code=${code || res.status})`,
      raw: data,
      request: {
        to: toDigits,
        templateCode,
        refKey: body.refKey,
        changeWord: cleanedChangeWord,
      },
    };
  }

  console.log('[ppurio] kakao accepted', {
    code,
    messagekey: data.messagekey || data.messageKey,
    refKey: body.refKey,
    templateCode,
  });

  return {
    ok: true,
    code: code || '1000',
    messagekey: data.messagekey || data.messageKey,
    raw: data,
    request: body,
  };
}

export function clearPpurioTokenCache() {
  tokenCache = { token: null, expiresAt: 0 };
}
