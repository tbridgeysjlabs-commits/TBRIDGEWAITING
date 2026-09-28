/**
 * 비즈뿌리오(api.bizppurio.com) 알림톡 클라이언트
 * 문서: https://bizppurio.github.io/
 *
 * - POST {base}/v1/token   Basic(계정:암호) → { accesstoken, type, expired }
 * - POST {base}/v3/message Bearer → type=at 알림톡
 *
 * 시설사 계정(facility_kakao_alimtalk_settings) 값으로 호출한다.
 * PROXY_HOST 설정 시 undici ProxyAgent 경유 (로컬은 직접 호출).
 */

import { ProxyAgent, fetch as undiciFetch } from 'undici';
import { TEMPLATE } from './ppurioTemplates.js';

const DEFAULT_BIZPPURIO_API_BASE = 'https://api.bizppurio.com';

/** 문서/콘솔 등 API가 아닌 호스트 → 운영 API로 치환 */
const NON_API_HOST_RE =
  /^(?:www\.)?(?:bizppurio\.github\.io|biztech\.gitbook\.io|bizppurio\.com|www\.bizppurio\.com)$/i;

/**
 * 시설사 설정에 문서 URL·엔드포인트 전체 경로가 들어와도
 * https://api.bizppurio.com 형태로 정규화한다.
 */
function normalizeBaseUrl(raw) {
  let url = String(raw || '').trim();
  if (!url) return DEFAULT_BIZPPURIO_API_BASE;

  // 스킴 없으면 https
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return DEFAULT_BIZPPURIO_API_BASE;
  }

  const host = parsed.hostname.replace(/^www\./i, '');
  // 개발자 문서·웹 콘솔 URL은 API 호스트가 아님
  if (
    NON_API_HOST_RE.test(parsed.hostname) ||
    host === 'bizppurio.github.io' ||
    host === 'biztech.gitbook.io' ||
    host === 'bizppurio.com'
  ) {
    console.warn(
      `[bizppurio] API 링크가 문서/웹 주소입니다 (${parsed.origin}). ${DEFAULT_BIZPPURIO_API_BASE} 로 대체합니다.`
    );
    return DEFAULT_BIZPPURIO_API_BASE;
  }

  // 사용자가 .../v1/token 또는 .../v3/message 까지 붙여 넣은 경우 strip
  let path = parsed.pathname.replace(/\/$/, '');
  path = path.replace(/\/v[0-9]+\/(token|message|kakao)(?:\/.*)?$/i, '');
  path = path.replace(/\/+$/, '');

  const base = `${parsed.protocol}//${parsed.host}${path}`;
  return base.replace(/\/$/, '') || DEFAULT_BIZPPURIO_API_BASE;
}

/** account → { token, type, expiresAt, provider, base } */
const tokenCacheByAccount = new Map();

const PPURIO_API_BASE = 'https://message.ppurio.com';

/**
 * 발송 대상 API 후보.
 * - message.ppurio.com 명시 → 뿌리오만
 * - 그 외(문서 URL·비즈뿌리오 포함) → 비즈뿌리오 후 뿌리오 폴백
 */
function resolveApiTargets(settings) {
  const raw = String(settings.resellerApiUrl || '').trim().toLowerCase();
  const isExplicitPpurio =
    /message\.ppurio\.com/.test(raw) ||
    (/\bppurio\.com\b/.test(raw) && !/bizppurio/.test(raw) && !/github\.io/.test(raw));

  if (isExplicitPpurio) {
    return [{ provider: 'ppurio', base: PPURIO_API_BASE }];
  }

  const isExplicitBizOnly =
    /api\.bizppurio\.com|dev-api\.bizppurio\.com/.test(raw) &&
    process.env.BIZPPURIO_NO_PPURIO_FALLBACK === '1';

  const bizBase = normalizeBaseUrl(settings.resellerApiUrl);
  const targets = [{ provider: 'bizppurio', base: bizBase }];
  if (!isExplicitBizOnly) {
    targets.push({ provider: 'ppurio', base: PPURIO_API_BASE });
  }
  return targets;
}

/** Basic 인증 후보 — 비즈: 암호 우선 / 뿌리오: 연동인증키 우선 */
function authSecretCandidates(settings, provider = 'bizppurio') {
  const pw = String(settings.resellerPw || '').trim();
  const key = String(settings.resellerApiKey || '').trim();
  const list = [];
  if (provider === 'ppurio') {
    if (key) list.push({ kind: 'apiKey', secret: key });
    if (pw && pw !== key) list.push({ kind: 'pw', secret: pw });
  } else {
    if (pw) list.push({ kind: 'pw', secret: pw });
    if (key && key !== pw) list.push({ kind: 'apiKey', secret: key });
  }
  return list;
}

/** @type {import('undici').ProxyAgent | null} */
let proxyAgent = null;
let proxyLogged = false;

function getProxyUrl() {
  const host = String(process.env.PROXY_HOST || '').trim();
  if (!host) return null;
  const portRaw = String(process.env.PROXY_PORT || '3128').trim();
  const port = /^\d+$/.test(portRaw) ? portRaw : '3128';
  return `http://${host}:${port}`;
}

function getProxyDispatcher() {
  const proxyUrl = getProxyUrl();
  if (!proxyUrl) return undefined;
  if (!proxyAgent) proxyAgent = new ProxyAgent(proxyUrl);
  if (!proxyLogged) {
    proxyLogged = true;
    console.log(`[bizppurio] HTTP proxy enabled → ${proxyUrl}`);
  }
  return proxyAgent;
}

async function httpFetch(url, options = {}) {
  const dispatcher = getProxyDispatcher();
  if (dispatcher) return undiciFetch(url, { ...options, dispatcher });
  return undiciFetch(url, options);
}

function parseExpired(expired) {
  const s = String(expired || '');
  if (!/^\d{14}$/.test(s)) return Date.now() + 20 * 60 * 60 * 1000;
  const y = Number(s.slice(0, 4));
  const m = Number(s.slice(4, 6)) - 1;
  const d = Number(s.slice(6, 8));
  const hh = Number(s.slice(8, 10));
  const mi = Number(s.slice(10, 12));
  const ss = Number(s.slice(12, 14));
  return new Date(y, m, d, hh, mi, ss).getTime();
}

function clientOrigin() {
  return (process.env.CLIENT_ORIGIN || 'http://localhost:5173').replace(/\/$/, '');
}

function completePageUrl(facilityCode, waitingId) {
  if (!facilityCode || !waitingId) return '';
  return `${clientOrigin()}/w/${encodeURIComponent(facilityCode)}/complete/${waitingId}`;
}

/**
 * 비즈뿌리오 AT 본문 — 승인 템플릿 고정문구와 일치해야 함.
 * 시설사 템플릿이 다르면 본문 불일치로 거절될 수 있음(로그로 확인).
 */
export function buildBizppurioMessage(templateKey, changeWord = {}) {
  const v = (n) => String(changeWord[`var${n}`] ?? '');
  const key =
    templateKey === 'LAST_ORDER' ||
    templateKey === 'CHOSEN_ORDER' ||
    templateKey === 'NO_POSTPONE'
      ? TEMPLATE.REGISTERED
      : templateKey;

  switch (key) {
    case TEMPLATE.REGISTERED:
      return [
        `[${v(1)}]`,
        '웨이팅이 등록되었습니다.',
        '',
        `■ 입장대기순서: ${v(2)}번째`,
        `■ 대기번호: ${v(3)}번`,
        `■ 인원: ${v(4)}명`,
        '',
        '웨이팅 현황은 아래 버튼을 통해 확인해주세요.',
      ].join('\n');
    case TEMPLATE.APPROACHING:
      return [
        `[${v(1)}]`,
        '입장이 임박했습니다.',
        '',
        `■ 현재 내 순서: ${v(2)}번째`,
        '',
        '매장 안내에 따라 준비해 주세요.',
      ].join('\n');
    case TEMPLATE.CALL_ENTRY:
      return [
        `[${v(2)}]`,
        `${v(1)}번 팀 입장을 안내드립니다.`,
        '',
        `■ 입장 대기 시간: ${v(3)}분`,
        '',
        '시간 내 미입장 시 순번이 조정될 수 있습니다.',
      ].join('\n');
    case TEMPLATE.TIMEOUT_CANCEL:
      return [
        `[${v(2)}]`,
        '미입장으로 웨이팅이 취소되었습니다.',
        '',
        `■ 입장 대기 시간: ${v(1)}분`,
        `■ 취소 시각: ${v(3)}`,
      ].join('\n');
    case TEMPLATE.POSTPONE_DONE:
      return [
        `[${v(1)}]`,
        '웨이팅 순서가 변경되었습니다.',
        '',
        `■ 변경된 순서: ${v(2)}번째`,
        `■ 대기번호: ${v(3)}번`,
        `■ 인원: ${v(4)}명`,
        `■ 미루기 허용 횟수: ${v(5)}회`,
      ].join('\n');
    case TEMPLATE.CANCEL:
      return [
        `[${v(1)}]`,
        '웨이팅이 취소되었습니다.',
        '',
        `■ 취소 시각: ${v(2)}`,
      ].join('\n');
    case TEMPLATE.CHARGE:
      return [
        `[${v(1)}]`,
        '알림톡 충전금이 충전되었습니다.',
        '',
        `■ 시각: ${v(2)}`,
        `■ 충전 금액: ${v(3)}원`,
        `■ 잔액: ${v(4)}원`,
      ].join('\n');
    case TEMPLATE.REFUND:
      return [
        `[${v(1)}]`,
        '알림톡 충전금이 환불(취소)되었습니다.',
        '',
        `■ 시각: ${v(2)}`,
        `■ 환불 금액: ${v(3)}원`,
        `■ 잔액: ${v(4)}원`,
      ].join('\n');
    default:
      return Object.values(changeWord).filter(Boolean).join(' / ') || '알림톡';
  }
}

function buildButtons(templateKey, changeWord = {}) {
  const key =
    templateKey === 'LAST_ORDER' ||
    templateKey === 'CHOSEN_ORDER' ||
    templateKey === 'NO_POSTPONE'
      ? TEMPLATE.REGISTERED
      : templateKey;

  // REGISTERED: var5=code, var6=waitingId
  // APPROACHING: var3=code, var4=waitingId
  // CALL_ENTRY: var4=code, var5=waitingId
  // POSTPONE_DONE: var6=code, var7=waitingId
  let facilityCode = '';
  let waitingId = '';
  if (key === TEMPLATE.REGISTERED) {
    facilityCode = changeWord.var5;
    waitingId = changeWord.var6;
  } else if (key === TEMPLATE.APPROACHING) {
    facilityCode = changeWord.var3;
    waitingId = changeWord.var4 || changeWord.var6;
  } else if (key === TEMPLATE.CALL_ENTRY) {
    facilityCode = changeWord.var4;
    waitingId = changeWord.var5;
  } else if (key === TEMPLATE.POSTPONE_DONE) {
    facilityCode = changeWord.var6;
    waitingId = changeWord.var7;
  }

  const url = completePageUrl(facilityCode, waitingId);
  if (!url) return undefined;

  if (
    key === TEMPLATE.REGISTERED ||
    key === TEMPLATE.APPROACHING ||
    key === TEMPLATE.CALL_ENTRY ||
    key === TEMPLATE.POSTPONE_DONE
  ) {
    return [
      {
        name: '웨이팅 확인',
        type: 'WL',
        url_mobile: url,
        url_pc: url,
      },
    ];
  }
  return undefined;
}

export function isBizppurioSettingsReady(settings) {
  if (!settings) return false;
  const account = String(settings.resellerId || '').trim();
  const secret = String(settings.resellerPw || settings.resellerApiKey || '').trim();
  const senderkey = String(settings.senderProfile || '').trim();
  const from = String(settings.senderPhone || '').replace(/\D/g, '');
  return Boolean(account && secret && senderkey && from.length >= 8);
}

async function requestToken(base, account, secret) {
  const tokenUrl = `${base}/v1/token`;
  const basic = Buffer.from(`${account}:${secret}`, 'utf8').toString('base64');
  // 문서: Headers만 설정 (Body 없음)
  const res = await httpFetch(tokenUrl, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/json; charset=utf-8',
      Accept: 'application/json',
    },
  });
  const data = await res.json().catch(() => ({}));
  return { tokenUrl, res, data };
}

async function fetchAccessToken(settings) {
  const account = String(settings.resellerId || '').trim();
  if (!account) {
    throw new Error('[bizppurio] 계정(ID)가 없습니다.');
  }

  const targets = resolveApiTargets(settings);
  let last = null;
  const tried = [];
  /** @type {{ provider: string, code: string, desc: string }[]} */
  const failures = [];
  let bizppurioPasswordWrong = false;

  for (const target of targets) {
    // 비즈뿌리오에서 계정은 있는데 암호만 틀린 경우(3007) → 뿌리오 폴백 불필요
    if (target.provider === 'ppurio' && bizppurioPasswordWrong) {
      continue;
    }

    const candidates = authSecretCandidates(settings, target.provider);
    if (!candidates.length) continue;

    for (const { kind, secret } of candidates) {
      tried.push(`${target.provider}/${kind}@${target.base}`);
      const { tokenUrl, res, data } = await requestToken(target.base, account, secret);
      const token = data.accesstoken || data.token || data.access_token;
      const type = data.type || 'Bearer';
      if (res.ok && token) {
        const entry = {
          token,
          type,
          expiresAt: parseExpired(data.expired),
          provider: target.provider,
          base: target.base,
        };
        tokenCacheByAccount.set(account, entry);
        console.log('[facility-kakao] token ok', {
          url: tokenUrl,
          account,
          provider: target.provider,
          auth: kind,
          expired: data.expired,
        });
        return entry;
      }
      const code = String(data.code ?? '');
      const desc = data.description || data.message || `HTTP ${res.status}`;
      last = { tokenUrl, res, data, kind, provider: target.provider, code, desc };
      failures.push({ provider: target.provider, code, desc, auth: kind });
      console.warn('[facility-kakao] auth failed', {
        provider: target.provider,
        base: target.base,
        auth: kind,
        http: res.status,
        code,
        desc,
        secretLen: secret.length,
      });
      if (target.provider === 'bizppurio' && code === '3007') {
        bizppurioPasswordWrong = true;
      }
    }
  }

  if (!tried.length) {
    throw new Error('[bizppurio] 딜러사 PW 또는 API 인증키가 없습니다.');
  }

  console.error('[facility-kakao] token failed', {
    url: last?.tokenUrl,
    account,
    authTried: tried,
    failures,
  });

  if (bizppurioPasswordWrong) {
    throw new Error(
      `[facility-kakao] 비즈뿌리오 계정(${account})은 있으나 암호가 틀립니다(3007). ` +
        `비즈뿌리오 사이트에서 로그인되는 «딜러사 PW»를 다시 저장하세요. API 인증키·발신프로필 Key를 암호란에 넣지 마세요.`
    );
  }

  const bizFail = failures.find((f) => f.provider === 'bizppurio');
  const ppurioFail = failures.find((f) => f.provider === 'ppurio');
  if (bizFail?.code === '3004' && ppurioFail?.code === '3004') {
    throw new Error(
      `[facility-kakao] 계정(${account})을 비즈뿌리오·뿌리오 모두에서 찾지 못했습니다(3004). 딜러사 ID를 확인하세요.`
    );
  }

  const msg = last?.desc || '토큰 발급 실패';
  throw new Error(
    `[facility-kakao] 토큰 발급 실패: ${msg} (시도: ${tried.join(', ')})`
  );
}

async function getAccessToken(settings) {
  const account = String(settings.resellerId || '').trim();
  const cached = tokenCacheByAccount.get(account);
  const skewMs = 2 * 60 * 1000;
  if (cached?.token && Date.now() < cached.expiresAt - skewMs) {
    return cached;
  }
  return fetchAccessToken(settings);
}

async function sendViaBizppurio({
  auth,
  account,
  from,
  toDigits,
  senderkey,
  templateCode,
  templateKey,
  changeWord,
  refKey,
  message,
}) {
  const msg = message || buildBizppurioMessage(templateKey, changeWord);
  const button =
    process.env.BIZPPURIO_INCLUDE_BUTTONS === '0'
      ? undefined
      : buildButtons(templateKey, changeWord);
  const body = {
    account,
    refkey: String(refKey || `tb_${Date.now()}`).slice(0, 32),
    type: 'at',
    from,
    to: toDigits,
    content: {
      at: {
        senderkey,
        templatecode: String(templateCode).trim(),
        message: msg,
        ...(button?.length ? { button } : {}),
      },
    },
  };

  const res = await httpFetch(`${auth.base}/v3/message`, {
    method: 'POST',
    headers: {
      Authorization: `${auth.type} ${auth.token}`,
      'Content-Type': 'application/json; charset=utf-8',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  const code = String(data.code ?? data.resultcode ?? '');
  const ok = code === '1000' || code === '0';
  if (!ok) {
    console.error('[bizppurio] at send failed', {
      http: res.status,
      code,
      description: data.description || data.message,
      templateCode,
      to: toDigits,
      account,
    });
    return {
      ok: false,
      provider: 'bizppurio',
      code: code || `HTTP_${res.status}`,
      message:
        data.description ||
        data.message ||
        `비즈뿌리오 알림톡 발송 실패 (code=${code || res.status})`,
      raw: data,
      request: body,
    };
  }
  console.log('[bizppurio] at accepted', {
    code: code || '1000',
    messagekey: data.messagekey || data.messageKey,
    refkey: body.refkey,
    templateCode,
  });
  return {
    ok: true,
    provider: 'bizppurio',
    code: code || '1000',
    messagekey: data.messagekey || data.messageKey,
    raw: data,
    request: body,
  };
}

async function sendViaPpurio({
  auth,
  account,
  toDigits,
  senderProfile,
  templateCode,
  changeWord,
  refKey,
}) {
  const cleanedChangeWord = {};
  for (const [k, v] of Object.entries(changeWord || {})) {
    if (v === undefined || v === null || v === '') continue;
    cleanedChangeWord[k] = String(v);
  }
  const body = {
    account,
    messageType: 'ALT',
    senderProfile,
    templateCode: String(templateCode).trim(),
    duplicateFlag: 'Y',
    targetCount: 1,
    targets: [{ to: toDigits, changeWord: cleanedChangeWord }],
    refKey: String(refKey || `tb_${Date.now()}`).slice(0, 32),
    isResend: 'N',
  };

  const res = await httpFetch(`${auth.base}/v1/kakao`, {
    method: 'POST',
    headers: {
      Authorization: `${auth.type} ${auth.token}`,
      'Content-Type': 'application/json; charset=utf-8',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  const code = String(data.code ?? data.resultcode ?? '');
  const ok = code === '1000' || code === '0';
  if (!ok) {
    console.error('[ppurio/facility] kakao send failed', {
      http: res.status,
      code,
      description: data.description || data.message,
      templateCode,
      to: toDigits,
      account,
    });
    return {
      ok: false,
      provider: 'ppurio',
      code: code || `HTTP_${res.status}`,
      message:
        data.description ||
        data.message ||
        `뿌리오 알림톡 발송 실패 (code=${code || res.status})`,
      raw: data,
      request: body,
    };
  }
  console.log('[ppurio/facility] kakao accepted', {
    code,
    messagekey: data.messagekey || data.messageKey,
    refKey: body.refKey,
    templateCode,
  });
  return {
    ok: true,
    provider: 'ppurio',
    code: code || '1000',
    messagekey: data.messagekey || data.messageKey,
    raw: data,
    request: body,
  };
}

/**
 * 시설사 중계사 알림톡 발송 (비즈뿌리오 AT 또는 뿌리오 ALT 자동 선택)
 */
export async function sendBizppurioAlimtalk({
  settings,
  to,
  templateCode,
  templateKey,
  changeWord = {},
  refKey,
  message,
}) {
  if (!isBizppurioSettingsReady(settings)) {
    throw new Error(
      '[bizppurio] 시설사 계정 설정이 불완전합니다. (ID/인증키·PW/발신번호/발신프로필)'
    );
  }
  const toDigits = String(to || '').replace(/\D/g, '');
  if (toDigits.length < 10) {
    throw new Error('[bizppurio] 수신 번호가 올바르지 않습니다.');
  }
  if (!templateCode) {
    throw new Error('[bizppurio] templateCode 가 비어 있습니다.');
  }

  const account = String(settings.resellerId).trim();
  const from = String(settings.senderPhone || '').replace(/\D/g, '');
  const senderkey = String(settings.senderProfile || '').trim();
  const auth = await getAccessToken(settings);

  if (auth.provider === 'ppurio') {
    return sendViaPpurio({
      auth,
      account,
      toDigits,
      senderProfile: senderkey,
      templateCode,
      changeWord,
      refKey,
    });
  }

  return sendViaBizppurio({
    auth,
    account,
    from,
    toDigits,
    senderkey,
    templateCode,
    templateKey,
    changeWord,
    refKey,
    message,
  });
}

export function clearBizppurioTokenCache(account) {
  if (account) tokenCacheByAccount.delete(String(account));
  else tokenCacheByAccount.clear();
}

/**
 * 시설사 설정으로 토큰 발급만 시험 (발송 없음).
 * @returns {Promise<{ ok: boolean, account: string, provider?: string, code?: string, message: string, pwLen: number, apiKeyLen: number }>}
 */
export async function testFacilityKakaoAuth(settings) {
  const account = String(settings?.resellerId || '').trim();
  const pwLen = String(settings?.resellerPw || '').trim().length;
  const apiKeyLen = String(settings?.resellerApiKey || '').trim().length;
  clearBizppurioTokenCache(account);
  try {
    const auth = await fetchAccessToken(settings);
    return {
      ok: true,
      account,
      provider: auth.provider,
      base: auth.base,
      message: `토큰 발급 성공 (${auth.provider})`,
      pwLen,
      apiKeyLen,
    };
  } catch (err) {
    return {
      ok: false,
      account,
      message: String(err?.message || err),
      pwLen,
      apiKeyLen,
    };
  }
}
