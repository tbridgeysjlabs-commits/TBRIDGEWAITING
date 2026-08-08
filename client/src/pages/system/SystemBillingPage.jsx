import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api, formatDateTime } from '../../api/client';
import SystemSidebar from '../../components/system/SystemSidebar';
import Toast from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';
import { useSidebarCollapse } from '../../hooks/useSidebarCollapse';

const PAGE_SIZES = [10, 30, 50, 100, 200];

function formatPhone(phone) {
  const p = String(phone || '').replace(/\D/g, '');
  if (p.length === 11) return `${p.slice(0, 3)}-${p.slice(3, 7)}-${p.slice(7)}`;
  return phone || '-';
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
                    <th>시설사명</th>
                    <th>충전일시</th>
                    <th>충전수단</th>
                    <th>충전금액</th>
                    <th>결제확인증</th>
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
                      <td colSpan={5}>충전 내역이 없습니다.</td>
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
    </div>
  );
}
