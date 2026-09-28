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

/** account → { token, type, expiresAt } */
const tokenCacheByAccount = new Map();

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
  const secret = String(settings.resellerApiKey || settings.resellerPw || '').trim();
  const senderkey = String(settings.senderProfile || '').trim();
  const from = String(settings.senderPhone || '').replace(/\D/g, '');
  return Boolean(account && secret && senderkey && from.length >= 8);
}

async function fetchAccessToken(settings) {
  const base = normalizeBaseUrl(settings.resellerApiUrl);
  const account = String(settings.resellerId || '').trim();
  const secret = String(settings.resellerApiKey || settings.resellerPw || '').trim();
  if (!account || !secret) {
    throw new Error('[bizppurio] 계정(ID) 또는 인증키/비밀번호가 없습니다.');
  }

  const tokenUrl = `${base}/v1/token`;
  const basic = Buffer.from(`${account}:${secret}`, 'utf8').toString('base64');
  // 문서: Headers만 설정 (Body 없음). 빈 JSON body 도 허용되나 생략이 안전.
  const res = await httpFetch(tokenUrl, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/json; charset=utf-8',
      Accept: 'application/json',
    },
  });
  const data = await res.json().catch(() => ({}));
  const token = data.accesstoken || data.token || data.access_token;
  const type = data.type || 'Bearer';
  if (!res.ok || !token) {
    const msg = data.description || data.message || `token HTTP ${res.status}`;
    console.error('[bizppurio] token failed', {
      url: tokenUrl,
      http: res.status,
      code: data.code,
      description: msg,
      account,
    });
    throw new Error(`[bizppurio] 토큰 발급 실패: ${msg}`);
  }

  const entry = {
    token,
    type,
    expiresAt: parseExpired(data.expired),
  };
  tokenCacheByAccount.set(account, entry);
  console.log('[bizppurio] token ok', { url: tokenUrl, account, expired: data.expired });
  return entry;
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

/**
 * @param {object} opts
 * @param {object} opts.settings facility_kakao_alimtalk_settings (복호화된 값)
 * @param {string} opts.to 수신 번호
 * @param {string} opts.templateCode
 * @param {string} opts.templateKey REGISTERED 등
 * @param {Record<string,string>} opts.changeWord
 * @param {string} [opts.refKey]
 * @param {string} [opts.message] 미지정 시 buildBizppurioMessage 사용
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

  const base = normalizeBaseUrl(settings.resellerApiUrl);
  const account = String(settings.resellerId).trim();
  const from = String(settings.senderPhone || '').replace(/\D/g, '');
  const senderkey = String(settings.senderProfile || '').trim();
  const msg =
    message ||
    buildBizppurioMessage(templateKey, changeWord);
  // 템플릿에 WL 버튼이 있으면 포함. BIZPPURIO_INCLUDE_BUTTONS=0 이면 강제 생략
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

  const auth = await getAccessToken(settings);
  const res = await httpFetch(`${base}/v3/message`, {
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
    code: code || '1000',
    messagekey: data.messagekey || data.messageKey,
    raw: data,
    request: body,
  };
}

export function clearBizppurioTokenCache(account) {
  if (account) tokenCacheByAccount.delete(String(account));
  else tokenCacheByAccount.clear();
}
