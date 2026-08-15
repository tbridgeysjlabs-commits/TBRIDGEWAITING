import { formatDateTime } from '../../api/client';

function formatAuthDate(value) {
  if (!value) return '-';
  const s = String(value);
  // YYMMDDHHMMSS
  if (s.length >= 12) {
    return `20${s.slice(0, 2)}.${s.slice(2, 4)}.${s.slice(4, 6)} ${s.slice(6, 8)}:${s.slice(8, 10)}:${s.slice(10, 12)}`;
  }
  return s;
}

export default function PaymentReceiptModal({ item, onClose }) {
  if (!item) return null;

  const rows = [
    { label: '시설사', value: item.facilityName || '-' },
    { label: '충전일시', value: formatDateTime(item.createdAt) },
    { label: '승인일시', value: formatAuthDate(item.authDate) },
    { label: '결제수단', value: item.paymentMethod || '-' },
    { label: '상품명', value: item.goodsName || '알림톡 충전' },
    { label: '충전금액', value: `${Number(item.amount || 0).toLocaleString()}원` },
    { label: '카드사', value: item.cardName || '-' },
    { label: '카드번호', value: item.cardNo || '-' },
    { label: '승인번호', value: item.authCode || '-' },
    { label: '주문번호', value: item.pgMoid || '-' },
    { label: '거래번호(TID)', value: item.pgTid || '-' },
    { label: '결제확인 이메일', value: item.buyerEmail || 'test@abc.com' },
    { label: '결과', value: item.resultMsg || (item.cancelledAt ? '취소됨' : '승인완료') },
  ];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card charge-modal"
        style={{ maxWidth: 520 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="close-btn abs" onClick={onClose}>
          X
        </button>
        <h2>결제확인증</h2>
        <p style={{ marginTop: 0, color: '#6b7280', fontSize: 14 }}>
          저장된 결제 정보로 바로 확인할 수 있습니다. (이메일 입력 불필요)
        </p>
        <dl className="receipt-dl">
          {rows.map((row) => (
            <div key={row.label} className="receipt-row">
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>
        <div className="modal-actions" style={{ marginTop: 16 }}>
          {item.receiptUrl ? (
            <a
              className="btn-ghost"
              href={item.receiptUrl}
              target="_blank"
              rel="noreferrer"
            >
              나이스페이 영수증
            </a>
          ) : null}
          <button type="button" className="btn-primary" onClick={onClose}>
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
