import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { api, formatDateTime } from '../../api/client';
import AdminSidebar from '../../components/admin/AdminSidebar';
import Toast from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';
import { useSidebarCollapse } from '../../hooks/useSidebarCollapse';
import {
  SEARCH_PERIOD_PRESETS,
  resolveSearchRange,
} from '../../utils/searchPresets';
import { formatDateTimeShortKst } from '../../utils/datetime.js';

export default function CustomersPage() {
  const { facilityCode } = useParams();
  const { facilityUser, logoutFacility } = useAuth();
  const navigate = useNavigate();
  const { collapsed, toggle } = useSidebarCollapse('tb_admin_sidebar');
  const [data, setData] = useState({ items: [], total: 0 });
  const [toast, setToast] = useState('');

  const [preset, setPreset] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [agreed, setAgreed] = useState(true);
  const [notAgreed, setNotAgreed] = useState(true);
  const [phone, setPhone] = useState('');

  const marketingParam = useMemo(() => {
    const list = [];
    if (agreed) list.push('agreed');
    if (notAgreed) list.push('not_agreed');
    return list.join(',');
  }, [agreed, notAgreed]);

  const queryString = useCallback(() => {
    const range = resolveSearchRange(preset, startDate, endDate);
    const params = new URLSearchParams();
    if (range.startDate) params.set('startDate', range.startDate);
    if (range.endDate) params.set('endDate', range.endDate);
    if (marketingParam) params.set('marketing', marketingParam);
    if (phone) params.set('phone', phone);
    params.set('pageSize', '500');
    return params.toString();
  }, [preset, startDate, endDate, marketingParam, phone]);

  const load = useCallback(async () => {
    if (!facilityUser || facilityUser.facilityCode !== facilityCode) return;
    try {
      const result = await api(`/admin/${facilityCode}/customers?${queryString()}`);
      setData(result);
    } catch (e) {
      setData({ items: [], total: 0 });
      setToast(e.message);
      setTimeout(() => setToast(''), 2500);
    }
  }, [facilityCode, facilityUser, queryString]);

  useEffect(() => {
    const id = setTimeout(() => {
      load();
    }, 200);
    return () => clearTimeout(id);
  }, [load]);

  if (!facilityUser || facilityUser.facilityCode !== facilityCode) {
    return <Navigate to={`/admin/${facilityCode}/login`} replace />;
  }

  const applyPreset = (key) => {
    setPreset(key);
    setStartDate('');
    setEndDate('');
  };

  const onCustomDate = (which, value) => {
    setPreset('');
    if (which === 'start') setStartDate(value);
    else setEndDate(value);
  };

  const reset = () => {
    setPreset('all');
    setStartDate('');
    setEndDate('');
    setAgreed(true);
    setNotAgreed(true);
    setPhone('');
  };

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
        <h1>고객 관리</h1>

        <section className="filter-box">
          <div className="filter-row">
            <span className="filter-label">검색 기간</span>
            <div className="preset-group">
              {SEARCH_PERIOD_PRESETS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  className={`chip ${preset === p.key ? 'active' : ''}`}
                  onClick={() => applyPreset(p.key)}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <input
              type="date"
              value={startDate}
              onChange={(e) => onCustomDate('start', e.target.value)}
            />
            <span>~</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => onCustomDate('end', e.target.value)}
            />
          </div>

          <div className="filter-row">
            <span className="filter-label">마케팅 동의 여부</span>
            <label>
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
              />
              동의
            </label>
            <label>
              <input
                type="checkbox"
                checked={notAgreed}
                onChange={(e) => setNotAgreed(e.target.checked)}
              />
              미동의
            </label>
          </div>

          <div className="filter-row">
            <span className="filter-label">전화번호</span>
            <input
              type="tel"
              inputMode="numeric"
              placeholder="숫자만 입력"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
              style={{ minWidth: 220 }}
            />
          </div>

          <div className="filter-actions">
            <button type="button" className="btn-ghost" onClick={reset}>
              초기화
            </button>
          </div>
        </section>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>등록일시</th>
                <th>전화번호</th>
                <th>마케팅 동의 여부</th>
              </tr>
            </thead>
            <tbody>
              {data.items.length === 0 ? (
                <tr>
                  <td colSpan={3} className="empty-list">
                    검색 조건에 해당하는 고객이 없습니다.
                  </td>
                </tr>
              ) : (
                data.items.map((item) => (
                  <tr key={item.id}>
                    <td>{formatDateTime(item.registeredAt)}</td>
                    <td>{item.phoneDisplay}</td>
                    <td>
                      {item.marketingAgreed
                        ? `동의 (${formatDateTimeShortKst(item.marketingAgreedAt)})`
                        : '미동의'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
