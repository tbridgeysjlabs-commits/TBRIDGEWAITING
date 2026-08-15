const SCRIPT_ID = 'nicepay-pgweb-js';

function loadNicepayScript(src) {
  return new Promise((resolve, reject) => {
    if (window.goPay) {
      resolve();
      return;
    }
    const existing = document.getElementById(SCRIPT_ID);
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('나이스페이 스크립트 로드 실패')), {
        once: true,
      });
      return;
    }
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('나이스페이 스크립트 로드 실패'));
    document.body.appendChild(script);
  });
}

function isMobile() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

/**
 * @param {object} pay prepare API의 pay 객체
 */
export async function launchNicepay(pay) {
  if (!pay?.mid || !pay?.signData) {
    throw new Error('결제 준비 정보가 올바르지 않습니다.');
  }

  await loadNicepayScript(pay.jsUrl);

  const form = document.createElement('form');
  form.name = 'nicepay_pay_form';
  form.method = 'POST';
  form.acceptCharset = 'euc-kr';
  form.style.display = 'none';

  const fields = {
    GoodsName: pay.goodsName,
    Amt: pay.amt,
    MID: pay.mid,
    EdiDate: pay.ediDate,
    Moid: pay.moid,
    SignData: pay.signData,
    PayMethod: pay.payMethod || 'CARD',
    ReturnURL: pay.returnUrl,
    BuyerName: pay.buyerName || '',
    BuyerTel: pay.buyerTel || '',
    BuyerEmail: pay.buyerEmail || '',
    GoodsCl: pay.goodsCl || '1',
    TransType: pay.transType || '0',
    CharSet: pay.charSet || 'utf-8',
    ReqReserved: pay.reqReserved || '',
  };

  Object.entries(fields).forEach(([name, value]) => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value == null ? '' : String(value);
    form.appendChild(input);
  });

  document.body.appendChild(form);

  window.nicepaySubmit = () => {
    form.submit();
  };
  window.nicepayClose = () => {
    form.remove();
  };

  if (isMobile()) {
    form.action = pay.mobileAction || 'https://web.nicepay.co.kr/v3/v3Payment.jsp';
    form.submit();
    return;
  }

  form.action = pay.returnUrl;
  if (typeof window.goPay !== 'function') {
    form.remove();
    throw new Error('나이스페이 결제창을 열 수 없습니다.');
  }
  window.goPay(form);
}
