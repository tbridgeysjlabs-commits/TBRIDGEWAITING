import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api, formatDateTime } from '../../api/client';
import AdminCloseIcon from '../../components/admin/AdminCloseIcon';
import SystemSidebar from '../../components/system/SystemSidebar';
import Toast from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';
import { useSidebarCollapse } from '../../hooks/useSidebarCollapse';
import PaymentReceiptModal from '../../components/billing/PaymentReceiptModal';

const PAGE_SIZES = [10, 30, 50, 100, 200];

function formatPhone(phone) {
  const p = String(phone || '').replace(/\D/g, '');
  if (p.length === 11) return `${p.slice(0, 3)}-${p.slice(3, 7)}-${p.slice(7)}`;
  return phone || '-';
}

/** 취소완료(YY.MM.DD hh:mm:ss) */
function formatCancelDone(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `취소완료(${yy}.${mm}.${dd} ${hh}:${mi}:${ss})`;
}

export default function SystemBillingPage() {
  const { systemUser, logoutSystem } = useAuth();
  const navigate = useNavigate();
  const { collapsed, toggle } = useSidebarCollapse('tb_system_sidebar');
  const [tab, setTab] = useState('summary');
  const [facilityName, setFacilityName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [sends, setSends] = useState({ items: [], total: 0, sendCount: 0, totalCost: 0 });
  const [charges, setCharges] = useState({ items: [], total: 0 });
  const [toast, setToast] = useState('');
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelAmount, setCancelAmount] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [receiptItem, setReceiptItem] = useState(null);
  const [chargeOpen, setChargeOpen] = useState(false);
  const [facilities, setFacilities] = useState([]);
  const [chargeFacilityCode, setChargeFacilityCode] = useState('');
  const [chargeAmount, setChargeAmount] = useState('');
  const [charging, setCharging] = useState(false);

  const loadSends = async () => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });
    if (facilityName.trim()) params.set('facilityName', facilityName.trim());
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    setSends(await api(`/system-admin/billing/sends?${params}`, {}, 'system'));
  };

  const loadCharges = async () => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });
    if (facilityName.trim()) params.set('facilityName', facilityName.trim());
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    setCharges(await api(`/system-admin/billing/charges?${params}`, {}, 'system'));
  };

  useEffect(() => {
    if (!systemUser) return;
    const run = tab === 'summary' ? loadSends : loadCharges;
    run().catch((e) => setToast(e.message));
  }, [systemUser, tab, page, pageSize]);

  if (!systemUser) return <Navigate to="/system-admin/login" replace />;

  const search = () => {
    setPage(1);
    const run = tab === 'summary' ? loadSends : loadCharges;
    run().catch((e) => setToast(e.message));
  };

  const openCharge = async () => {
    try {
      const list = await api('/system-admin/facilities', {}, 'system');
      setFacilities(Array.isArray(list) ? list : []);
      setChargeFacilityCode('');
      setChargeAmount('');
      setChargeOpen(true);
    } catch (e) {
      setToast(e.message);
      setTimeout(() => setToast(''), 2500);
    }
  };

  const closeCharge = () => {
    setChargeOpen(false);
    setChargeFacilityCode('');
    setChargeAmount('');
  };

  const canCharge =
    !!chargeFacilityCode && Number(chargeAmount) > 0 && !charging;

  const submitCharge = async () => {
    if (!canCharge) return;
    setCharging(true);
    try {
      await api(
        '/system-admin/billing/charge',
        {
          method: 'POST',
          body: JSON.stringify({
            facilityCode: chargeFacilityCode,
            amount: Number(chargeAmount),
          }),
        },
        'system'
      );
      closeCharge();
      setToast('충전이 완료되었습니다.');
      setTimeout(() => setToast(''), 2500);
      setPage(1);
      await loadCharges();
    } catch (e) {
      setToast(e.message);
      setTimeout(() => setToast(''), 2500);
    } finally {
      setCharging(false);
    }
  };

  const openCancel = (item) => {
    const chargeAmt = Number(item.amount || 0);
    const balance =
      item.facilityBalance != null ? Number(item.facilityBalance) : chargeAmt;
    const defaultAmt = Math.max(0, Math.min(chargeAmt, balance));
    setCancelTarget(item);
    setCancelAmount(String(defaultAmt));
  };

  const submitCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await api(
        `/system-admin/billing/charges/${cancelTarget.id}/cancel`,
        {
          method: 'POST',
          body: JSON.stringify({ amount: Number(cancelAmount) }),
        },
        'system'
      );
      setCancelTarget(null);
      setToast('결제가 취소되었습니다.');
      setTimeout(() => setToast(''), 2500);
      await loadCharges();
    } catch (e) {
      setToast(e.message);
      setTimeout(() => setToast(''), 2500);
    } finally {
      setCancelling(false);
    }
  };

  const total = tab === 'summary' ? sends.total : charges.total;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className={`admin-layout ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <Toast message={toast} visible={!!toast} />
      <SystemSidebar
        collapsed={collapsed}
        onToggle={toggle}
        onLogout={() => {
          logoutSystem();
          navigate('/system-admin/login');
        }}
      />
      <main className="admin-main">
        <div className="page-title-row">
          <h1>알림톡</h1>
          <div className="tab-switch">
            <button
              type="button"
              className={`chip ${tab === 'summary' ? 'active' : ''}`}
              onClick={() => {
                setTab('summary');
                setPage(1);
              }}
            >
              집계 / 충전
            </button>
            <button
              type="button"
              className={`chip ${tab === 'charges' ? 'active' : ''}`}
              onClick={() => {
                setTab('charges');
                setPage(1);
              }}
            >
              충전 내역
            </button>
          </div>
        </div>

        <div className="filter-row" style={{ marginBottom: 16 }}>
          <input
            placeholder="시설사명"
            value={facilityName}
            onChange={(e) => setFacilityName(e.target.value)}
          />
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <span>~</span>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          <button type="button" className="btn-search" onClick={search}>
            조회
          </button>
        </div>

        {tab === 'summary' && (
          <>
            <div className="list-toolbar">
              <span>
                {sends.sendCount || sends.total} 건 /{' '}
                {Number(sends.totalCost || 0).toLocaleString()} 원
              </span>
              <label>
                페이지당 리스트 수
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                >
                  {PAGE_SIZES.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>발송일시</th>
                    <th>시설사명</th>
                    <th>템플릿명</th>
                    <th>수신번호</th>
                    <th>발송 성공 여부</th>
                    <th>충전금</th>
                  </tr>
                </thead>
                <tbody>
                  {sends.items.map((item) => (
                    <tr key={item.id}>
                      <td>{formatDateTime(item.createdAt)}</td>
                      <td>{item.facilityName}</td>
                      <td>{item.templateName || '웨이팅 등록 완료'}</td>
                      <td>{formatPhone(item.recipientPhone)}</td>
                      <td>{item.sendStatus === 'fail' ? '실패' : '성공'}</td>
                      <td>
                        {item.sendStatus === 'fail'
                          ? '0'
                          : `-${Number(item.amount || item.unitCost || 0)}`}
                      </td>
                    </tr>
                  ))}
                  {!sends.items.length && (
                    <tr>
                      <td colSpan={6}>발송 내역이 없습니다.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === 'charges' && (
          <>
            <div className="list-toolbar">
              <button type="button" className="btn-primary" onClick={openCharge}>
                충전하기
              </button>
              <label>
                페이지당 리스트 수
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                >
                  {PAGE_SIZES.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>시설사명</th>
                    <th>충전일시</th>
                    <th>충전수단</th>
                    <th>충전금액</th>
                    <th>잔액</th>
                    <th>결제확인증</th>
                    <th>취소</th>
                  </tr>
                </thead>
                <tbody>
                  {charges.items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.facilityName}</td>
                      <td>{formatDateTime(item.createdAt)}</td>
                      <td>{item.paymentMethod || '-'}</td>
                      <td>{Number(item.amount).toLocaleString()}원</td>
                      <td>
                        {item.balanceAfter != null
                          ? `${Number(item.balanceAfter).toLocaleString()}원`
                          : '-'}
                      </td>
                      <td>
                        {item.pgTid || item.receiptUrl ? (
                          <button
                            type="button"
                            className="btn-primary mini"
                            onClick={() => setReceiptItem(item)}
                          >
                            결제확인증
                          </button>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td>
                        {item.cancelledAt ? (
                          <span className="cancel-done-text">
                            {formatCancelDone(item.cancelledAt)}
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="btn-ghost mini"
                            onClick={() => openCancel(item)}
                          >
                            취소하기
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!charges.items.length && (
                    <tr>
                      <td colSpan={7}>충전 내역이 없습니다.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="pagination">
          <span>
            {total || 0}개 중 {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)}
          </span>
          <div className="page-btns">
            <button type="button" disabled={page <= 1} onClick={() => setPage(1)}>
              |◀
            </button>
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              ◀
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              ▶
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage(totalPages)}
            >
              ▶|
            </button>
          </div>
        </div>
      </main>

      {chargeOpen && (
        <div className="modal-backdrop" onClick={() => !charging && closeCharge()}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="close-btn abs"
              disabled={charging}
              onClick={closeCharge}
              aria-label="닫기"
            >
              <AdminCloseIcon />
            </button>
            <h2>충전하기</h2>
            <label>
              시설사
              <select
                value={chargeFacilityCode}
                onChange={(e) => setChargeFacilityCode(e.target.value)}
              >
                <option value="">시설사를 선택해 주세요</option>
                {facilities.map((f) => (
                  <option key={f.id || f.facilityCode} value={f.facilityCode}>
                    {f.name} ({f.facilityCode})
                  </option>
                ))}
              </select>
            </label>
            <label>
              충전 금액
              <div className="inline-unit">
                <input
                  type="number"
                  min="1"
                  step="1"
                  inputMode="numeric"
                  placeholder="금액 입력"
                  value={chargeAmount}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^\d]/g, '');
                    setChargeAmount(v);
                  }}
                />
                <span>원</span>
              </div>
            </label>
            <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
              <button
                type="button"
                className="btn-ghost"
                disabled={charging}
                onClick={closeCharge}
              >
                취소하기
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={!canCharge}
                onClick={submitCharge}
              >
                {charging ? '처리 중...' : '충전하기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {cancelTarget && (
        <div className="modal-backdrop" onClick={() => !cancelling && setCancelTarget(null)}>
          <div className="modal charge-modal" onClick={(e) => e.stopPropagation()}>
            <h2>결제 취소</h2>
            <p style={{ marginBottom: 12, color: '#555' }}>
              {cancelTarget.facilityName} · 충전금액{' '}
              {Number(cancelTarget.amount).toLocaleString()}원
              {cancelTarget.facilityBalance != null && (
                <>
                  {' '}
                  · 현재 잔액 {Number(cancelTarget.facilityBalance).toLocaleString()}원
                </>
              )}
            </p>
            <label>
              취소 금액
              <input
                type="number"
                min="1"
                step="1"
                value={cancelAmount}
                onChange={(e) => setCancelAmount(e.target.value)}
              />
            </label>
            <p style={{ marginTop: 8, fontSize: 13, color: '#777' }}>
              부분 취소가 가능합니다. 취소 금액만큼 시설사 알림톡 잔액에서 차감됩니다.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn-ghost"
                disabled={cancelling}
                onClick={() => setCancelTarget(null)}
              >
                닫기
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={cancelling || !(Number(cancelAmount) > 0)}
                onClick={submitCancel}
              >
                {cancelling ? '처리 중...' : '취소 확정'}
              </button>
            </div>
          </div>
        </div>
      )}

      {receiptItem && (
        <PaymentReceiptModal item={receiptItem} onClose={() => setReceiptItem(null)} />
      )}
    </div>
  );
}
