import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { api, formatDateTime } from '../../api/client';
import AdminSidebar from '../../components/admin/AdminSidebar';
import Toast from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';
import { useSidebarCollapse } from '../../hooks/useSidebarCollapse';

const PAGE_SIZES = [10, 30, 50, 100, 200];
const PRESETS = [10000, 50000, 100000, 1000000];

function formatPhone(phone) {
  const p = String(phone || '').replace(/\D/g, '');
  if (p.length === 11) return `${p.slice(0, 3)}-${p.slice(3, 7)}-${p.slice(7)}`;
  return phone || '-';
}

export default function BillingPage() {
  const { facilityCode } = useParams();
  const { facilityUser, logoutFacility } = useAuth();
  const navigate = useNavigate();
  const { collapsed, toggle } = useSidebarCollapse('tb_admin_sidebar');
  const [tab, setTab] = useState('summary');
  const [billing, setBilling] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [sends, setSends] = useState({ items: [], total: 0, sendCount: 0, totalCost: 0 });
  const [charges, setCharges] = useState({ items: [], total: 0 });
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [toast, setToast] = useState('');

  const loadBilling = async () => {
    const b = await api(`/admin/${facilityCode}/billing`);
    setBilling(b);
    return b;
  };

  const loadSends = async () => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    setSends(await api(`/admin/${facilityCode}/billing/sends?${params}`));
  };

  const loadCharges = async () => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    setCharges(await api(`/admin/${facilityCode}/billing/charges?${params}`));
  };

  useEffect(() => {
    if (!facilityUser || facilityUser.facilityCode !== facilityCode) return;
    loadBilling()
      .then((b) => {
        if (b.insufficientBalance) {
          if (window.confirm('충전금액이 소진되어 카카오 알림톡 발송이 불가합니다.')) {
            setTab('summary');
            setOpen(true);
          }
        } else if (b.lowBalanceWarning) {
          if (
            window.confirm(
              `현재 충전금 잔액은 ${Number(b.balance).toLocaleString()}원 입니다. 충전하시겠습니까?`
            )
          ) {
            setOpen(true);
          }
        }
      })
      .catch((e) => setToast(e.message));
  }, [facilityCode, facilityUser]);

  useEffect(() => {
    if (!facilityUser || facilityUser.facilityCode !== facilityCode) return;
    if (tab === 'summary') loadSends().catch((e) => setToast(e.message));
    else loadCharges().catch((e) => setToast(e.message));
  }, [facilityCode, facilityUser, tab, page, pageSize]);

  if (!facilityUser || facilityUser.facilityCode !== facilityCode) {
    return <Navigate to={`/admin/${facilityCode}/login`} replace />;
  }

  const search = () => {
    setPage(1);
    if (tab === 'summary') loadSends();
    else loadCharges();
  };

  const charge = async (e) => {
    e.preventDefault();
    try {
      const result = await api(`/admin/${facilityCode}/billing/charge`, {
        method: 'POST',
        body: JSON.stringify({
          amount: Number(amount),
          paymentMethod: '카드(MOCK)',
        }),
      });
      setBilling(result);
      setOpen(false);
      setAmount('');
      setToast('충전이 완료되었습니다.');
      setTimeout(() => setToast(''), 2500);
      if (tab === 'charges') await loadCharges();
      else await loadBilling();
    } catch (err) {
      setToast(err.message);
    }
  };

  const totalPages = Math.max(
    1,
    Math.ceil((tab === 'summary' ? sends.total : charges.total) / pageSize)
  );

  return (
    <div className={`admin-layout ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <Toast message={toast} visible={!!toast} />
      <AdminSidebar
        facilityCode={facilityCode}
        collapsed={collapsed}
        onToggle={toggle}
        onLogout={() => {
          logoutFacility();
          navigate(`/admin/${facilityCode}/login`);
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

        {tab === 'summary' && (
          <>
            <div className="billing-balance-bar">
              <div>
                잔액: <strong>{Number(billing?.balance || 0).toLocaleString()}</strong>원
              </div>
              <div>
                건당 비용: <strong>{Number(billing?.unitCost || 0).toLocaleString()}</strong>원
              </div>
              <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
                충전하기
              </button>
            </div>

            <div className="filter-row" style={{ marginBottom: 16 }}>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              <span>~</span>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              <button type="button" className="btn-search" onClick={search}>
                조회
              </button>
            </div>

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
                      <td colSpan={5}>발송 내역이 없습니다.</td>
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
              <span />
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
                    <th>충전일시</th>
                    <th>충전수단</th>
                    <th>충전금액</th>
                    <th>결제확인증</th>
                  </tr>
                </thead>
                <tbody>
                  {charges.items.map((item) => (
                    <tr key={item.id}>
                      <td>{formatDateTime(item.createdAt)}</td>
                      <td>{item.paymentMethod || '-'}</td>
                      <td>{Number(item.amount).toLocaleString()}원</td>
                      <td>
                        {item.receiptUrl ? (
                          <a
                            className="btn-primary mini"
                            href={item.receiptUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            결제확인증
                          </a>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  ))}
                  {!charges.items.length && (
                    <tr>
                      <td colSpan={4}>충전 내역이 없습니다.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="pagination">
          <span>
            {(tab === 'summary' ? sends.total : charges.total) || 0}개 중{' '}
            {(page - 1) * pageSize + 1}-
            {Math.min(page * pageSize, tab === 'summary' ? sends.total : charges.total)}
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

        {open && (
          <div className="modal-backdrop" onClick={() => setOpen(false)}>
            <form className="modal-card charge-modal" onClick={(e) => e.stopPropagation()} onSubmit={charge}>
              <button type="button" className="close-btn abs" onClick={() => setOpen(false)}>
                X
              </button>
              <h2>알림톡 충전</h2>
              <div className="charge-amount-row">
                <input
                  type="number"
                  min="1"
                  placeholder="금액 입력"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
                <span>원</span>
              </div>
              <div className="charge-presets">
                {PRESETS.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setAmount(String(v))}
                  >
                    + {v >= 10000 ? `${v / 10000}만원` : `${v}원`}
                  </button>
                ))}
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
                  취소
                </button>
                <button type="submit" className="btn-primary">
                  충전하기
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
