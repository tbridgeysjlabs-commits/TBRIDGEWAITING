import crypto from 'crypto';
import { createError } from '../middleware/errorHandler.js';
import { formatEdiDateKst } from '../utils/datetime.js';

function sha256Hex(value) {
  return crypto.createHash('sha256').update(String(value), 'utf8').digest('hex');
}

function ediDateNow() {
  return formatEdiDateKst(new Date());
}

/** env 값 공백·따옴표 제거 (Render/쉘에서 따옴표 포함 저장되는 경우 대비) */
function envStr(name, fallback = '') {
  const raw = process.env[name];
  if (raw == null || raw === '') return fallback;
  return String(raw)
    .trim()
    .replace(/^['"]|['"]$/g, '')
    .trim();
}

function isMockAllowed() {
  return envStr('NICEPAY_ALLOW_MOCK', '0') === '1';
}

function getConfig() {
  const mid = envStr('NICEPAY_MID');
  const merchantKey = envStr('NICEPAY_MERCHANT_KEY');
  const cancelPwd = envStr('NICEPAY_CANCEL_PWD');
  const buyerEmail = envStr('NICEPAY_BUYER_EMAIL', '');
  const apiPublicUrl = (
    envStr('API_PUBLIC_URL') ||
    `http://localhost:${process.env.PORT || 4000}`
  ).replace(/\/$/, '');
  // CLIENT_ORIGINS 우선(첫 URL), 없으면 CLIENT_ORIGIN
  const origins = [envStr('CLIENT_ORIGINS'), envStr('CLIENT_ORIGIN')]
    .join(',')
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean);
  const clientOrigin = origins[0] || 'http://localhost:5173';
  return { mid, merchantKey, cancelPwd, buyerEmail, apiPublicUrl, clientOrigin };
}

/** API/로그용 — 비밀키 제외 */
function getPublicConfig() {
  const { mid, buyerEmail, apiPublicUrl, clientOrigin, cancelPwd } = getConfig();
  const configured = isNicepayConfigured();
  return {
    mid: mid ? `${mid.slice(0, 4)}****` : '',
    buyerEmail,
    apiPublicUrl,
    clientOrigin,
    configured,
    hasCancelPwd: Boolean(cancelPwd),
    allowMock: isMockAllowed(),
    /** live = 실결제만, mock = NICEPAY_ALLOW_MOCK=1 또는 키 미설정 */
    mode: configured && !isMockAllowed() ? 'live' : 'mock',
  };
}

function sanitizePgLog(payload = {}) {
  const clone = { ...payload };
  delete clone.SignData;
  delete clone.CancelPwd;
  delete clone.Signature;
  return clone;
}

export function isNicepayConfigured() {
  const { mid, merchantKey } = getConfig();
  return Boolean(mid && merchantKey);
}

async function postForm(url, fields) {
  const body = new URLSearchParams();
  Object.entries(fields).forEach(([key, value]) => {
    if (value != null) body.set(key, String(value));
  });
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
      'User-Agent': 'tbridge-waiting/1.0',
    },
    body: body.toString(),
  });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    const parsed = {};
    text.split('&').forEach((pair) => {
      const [k, v] = pair.split('=');
      if (k) parsed[decodeURIComponent(k)] = decodeURIComponent(v || '');
    });
    return parsed;
  }
}

export const nicepayService = {
  // 비밀키 포함 설정은 서비스 내부에서만 사용
  getPublicConfig,
  isConfigured: isNicepayConfigured,
  isMockAllowed,
  sha256Hex,
  ediDateNow,

  buildAuthSign(ediDate, mid, amt, merchantKey) {
    return sha256Hex(`${ediDate}${mid}${amt}${merchantKey}`);
  },

  buildAuthResponseSign(authToken, mid, amt, merchantKey) {
    return sha256Hex(`${authToken}${mid}${amt}${merchantKey}`);
  },

  buildApproveSign(authToken, mid, amt, ediDate, merchantKey) {
    return sha256Hex(`${authToken}${mid}${amt}${ediDate}${merchantKey}`);
  },

  buildApproveResponseSign(tid, mid, amt, merchantKey) {
    return sha256Hex(`${tid}${mid}${amt}${merchantKey}`);
  },

  buildCancelSign(mid, cancelAmt, ediDate, merchantKey) {
    return sha256Hex(`${mid}${cancelAmt}${ediDate}${merchantKey}`);
  },

  verifyAuthResponseSignature(authToken, mid, amt, signature) {
    if (!signature) return true;
    const { merchantKey } = getConfig();
    return signature === this.buildAuthResponseSign(authToken, mid, amt, merchantKey);
  },

  verifyApproveResponseSignature(tid, mid, amt, signature) {
    if (!signature) return true;
    const { merchantKey } = getConfig();
    const a = this.buildApproveResponseSign(tid, mid, String(Number(amt)), merchantKey);
    const b = this.buildApproveResponseSign(tid, mid, String(amt), merchantKey);
    return signature === a || signature === b;
  },

  createPreparePayload({ amount, moid, facilityCode, facilityName, buyerName, buyerTel }) {
    if (!isNicepayConfigured()) {
      throw createError(500, '나이스페이 설정이 되어 있지 않습니다.');
    }
    const { mid, merchantKey, apiPublicUrl } = getConfig();
    const amt = String(Math.trunc(Number(amount)));
    const ediDate = ediDateNow();
    const signData = this.buildAuthSign(ediDate, mid, amt, merchantKey);
    const goodsName = `알림톡충전 ${facilityName || facilityCode}`
      .replace(/["[\]]/g, '')
      .slice(0, 40);

    return {
      mid,
      amt,
      moid,
      ediDate,
      signData,
      goodsName,
      payMethod: 'CARD',
      buyerName: (buyerName || facilityName || '시설사관리자').slice(0, 30),
      buyerTel: String(buyerTel || '01000000000').replace(/\D/g, '').slice(0, 20) || '01000000000',
      // 결제창 이메일 입력란 — 기본 공백 (사용자가 직접 입력)
      buyerEmail: '',
      charSet: 'utf-8',
      goodsCl: '1',
      transType: '0',
      reqReserved: facilityCode,
      returnUrl: `${apiPublicUrl}/api/billing/nicepay/return`,
      jsUrl: 'https://pg-web.nicepay.co.kr/v3/common/js/nicepay-pgweb.js',
      mobileAction: 'https://web.nicepay.co.kr/v3/v3Payment.jsp',
    };
  },

  async approve({
    tid,
    authToken,
    mid,
    amt,
    nextAppURL,
    netCancelURL,
  }) {
    const { merchantKey } = getConfig();
    const ediDate = ediDateNow();
    const signData = this.buildApproveSign(authToken, mid, amt, ediDate, merchantKey);
    const fields = {
      TID: tid,
      AuthToken: authToken,
      MID: mid,
      Amt: amt,
      EdiDate: ediDate,
      SignData: signData,
      CharSet: 'utf-8',
      EdiType: 'JSON',
    };

    try {
      const result = await postForm(nextAppURL, fields);
      return { ok: true, result, ediDate, signData };
    } catch (err) {
      if (netCancelURL) {
        try {
          await postForm(netCancelURL, { ...fields, NetCancel: '1' });
        } catch {
          /* ignore net-cancel failure */
        }
      }
      throw createError(502, `나이스페이 승인 요청 실패: ${err.message}`);
    }
  },

  isApproveSuccess(result) {
    const code = String(result?.ResultCode || '');
    return ['3001', '4000', 'A000'].includes(code);
  },

  async cancelPayment({
    tid,
    moid,
    cancelAmt,
    partial = false,
    cancelMsg = '관리자 취소',
  }) {
    if (!isNicepayConfigured()) {
      throw createError(500, '나이스페이 설정이 되어 있지 않습니다.');
    }
    if (!tid) {
      throw createError(400, 'PG 거래번호(TID)가 없어 결제 취소를 할 수 없습니다.');
    }

    const { mid, merchantKey, cancelPwd } = getConfig();
    const ediDate = ediDateNow();
    const amt = String(Math.trunc(Number(cancelAmt)));
    const signData = this.buildCancelSign(mid, amt, ediDate, merchantKey);
    const fields = {
      TID: tid,
      MID: mid,
      Moid: moid || tid,
      CancelAmt: amt,
      CancelMsg: cancelMsg,
      PartialCancelCode: partial ? '1' : '0',
      EdiDate: ediDate,
      SignData: signData,
      CharSet: 'utf-8',
      EdiType: 'JSON',
    };
    // 가맹점 설정에 따라 필요할 수 있음 (미설정이면 생략)
    if (cancelPwd) fields.CancelPwd = cancelPwd;

    // 공식 취소 API
    const result = await postForm(
      'https://pg-api.nicepay.co.kr/webapi/cancel_process.jsp',
      fields
    );

    const code = String(result?.ResultCode || '');
    // 2001: 취소 성공, 2211: 환불 성공
    // 이미 취소된 거래도 성공으로 간주해 DB 상태와 맞춤
    const alreadyCancelled =
      code === '2002' || /이미\s*취소|취소된\s*거래|canceled|cancelled/i.test(result?.ResultMsg || '');
    const ok = ['2001', '2015', '2211'].includes(code) || alreadyCancelled;
    if (!ok) {
      console.error('[NicePay cancel failed]', {
        tid,
        moid,
        code,
        result: sanitizePgLog(result),
      });
    } else {
      console.log('[NicePay cancel ok]', {
        tid,
        moid,
        code,
        msg: result?.ResultMsg,
      });
    }
    return { skipped: false, ok, alreadyCancelled, result };
  },

  clientResultUrl(facilityCode, { status, message, moid } = {}) {
    const { clientOrigin } = getConfig();
    const params = new URLSearchParams({
      status: status || 'fail',
    });
    if (message) params.set('message', message);
    if (moid) params.set('moid', moid);
    return `${clientOrigin}/admin/${facilityCode}/billing/result?${params.toString()}`;
  },
};
