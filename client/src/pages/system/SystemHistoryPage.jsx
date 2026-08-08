import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  api,
  formatDateTime,
  formatDateYYMMDD,
  formatDuration,
} from '../../api/client';
import SystemSidebar from '../../components/system/SystemSidebar';
import Toast from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';
import { useSidebarCollapse } from '../../hooks/useSidebarCollapse';

const PRESETS = [
  { key: 'today', label: '오늘' },
  { key: '1w', label: '1주일' },
  { key: '1m', label: '1개월' },
  { key: '3m', label: '3개월' },
  { key: '6m', label: '6개월' },
  { key: '1y', label: '1년' },
  { key: 'all', label: '전체' },
];

function toISODate(d) {
  return d.toISOString().slice(0, 10);
}

function rangeFromPreset(key) {
  const end = new Date();
  const start = new Date();
  if (key === 'all') return { startDate: '', endDate: '' };
  if (key === 'today') return { startDate: toISODate(start), endDate: toISODate(end) };
  const map = { '1w': 7, '1m': 30, '3m': 90, '6m': 180, '1y': 365 };
  start.setDate(start.getDate() - (map[key] || 0));
  return { startDate: toISODate(start), endDate: toISODate(end) };
}

export default function SystemHistoryPage() {
  const { systemUser, logoutSystem } = useAuth();
  const navigate = useNavigate();
  const { collapsed, toggle } = useSidebarCollapse('tb_system_sidebar');
  const [preset, setPreset] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [facilityName, setFacilityName] = useState('');
  const [completed, setCompleted] = useState(true);
  const [cancelled, setCancelled] = useState(true);
  const [phone, setPhone] = useState('');
  const [totalCount, setTotalCount] = useState('');
  const [dailySeq, setDailySeq] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [data, setData] = useState({ items: [], total: 0 });
  const [selected, setSelected] = useState([]);
  const [toast, setToast] = useState('');

  const statuses = useMemo(() => {
    const list = [];
    if (completed) list.push('completed');
    if (cancelled) list.push('cancelled');
    return list;
  }, [completed, cancelled]);

  const queryString = () => {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    if (facilityName) params.set('facilityName', facilityName);
    if (phone) params.set('phone', phone.replace(/\D/g, ''));
    if (totalCount) params.set('totalCount', totalCount);
    if (dailySeq) params.set('dailySeq', dailySeq);
    params.set('statuses', statuses.join(','));
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));
    return params.toString();
  };

  const search = async () => {
    if (!systemUser) return;
    try {
      const result = await api(`/system-admin/history?${queryString()}`, {}, 'system');
      setData(result);
      setSelected([]);
    } catch (e) {
      setToast(e.message);
      setTimeout(() => setToast(''), 2500);
    }
  };

  useEffect(() => {
    search();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, systemUser]);

  if (!systemUser) return <Navigate to="/system-admin/login" replace />;

  const applyPreset = (key) => {
    setPreset(key);
    const range = rangeFromPreset(key);
    setStartDate(range.startDate);
    setEndDate(range.endDate);
  };

  const exportExcel = async () => {
    try {
      const res = await api(
        `/system-admin/history/export?${queryString()}`,
        { raw: true },
        'system'
      );
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'system-waiting-history.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setToast(e.message);
    }
  };

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
        <h1>대기자 내역 (전체 시설사)</h1>
        <section className="filter-box">
          <div className="filter-row">
            <span className="filter-label">검색 기간</span>
            <div className="preset-group">
              {PRESETS.map((p) => (
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
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <span>~</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <div className="filter-row">
            <label>
              시설사
              <input
                value={facilityName}
                onChange={(e) => setFacilityName(e.target.value)}
                placeholder="시설사명 검색"
              />
            </label>
            <label>
              <input
                type="checkbox"
                checked={completed}
                onChange={(e) => setCompleted(e.target.checked)}
              />
              대기완료
            </label>
            <label>
              <input
                type="checkbox"
                checked={cancelled}
                onChange={(e) => setCancelled(e.target.checked)}
              />
              대기 취소
            </label>
            <label>
              연락처
              <input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </label>
            <label>
              인원
              <input
                value={totalCount}
                onChange={(e) => setTotalCount(e.target.value)}
                style={{ width: 70 }}
              />
            </label>
            <label>
              등록번호
              <input
                value={dailySeq}
                onChange={(e) => setDailySeq(e.target.value)}
                style={{ width: 70 }}
              />
            </label>
            <button
              type="button"
              className="btn-dark"
              onClick={() => {
                setPage(1);
                search();
              }}
            >
              검색
            </button>
            <button type="button" className="btn-ghost" onClick={exportExcel}>
              엑셀 다운로드
            </button>
          </div>
        </section>

        <div className="list-toolbar">
          <span>
            총 {data.total} / 선택 {selected.length}
          </span>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>선택</th>
                <th>시설사명</th>
                <th>입장일</th>
                <th>연락처</th>
                <th>인원 수</th>
                <th>등록 번호</th>
                <th>상태</th>
                <th>대기 시작</th>
                <th>대기 종료</th>
                <th>총 대기시간</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.includes(item.id)}
                      onChange={(e) => {
                        if (e.target.checked) setSelected((s) => [...s, item.id]);
                        else setSelected((s) => s.filter((id) => id !== item.id));
                      }}
                    />
                  </td>
                  <td>{item.facilityName}</td>
                  <td>{formatDateYYMMDD(item.entryDate || item.registeredAt)}</td>
                  <td>{item.phoneDisplay}</td>
                  <td>{item.totalCount}명</td>
                  <td>{item.dailySeq}</td>
                  <td>{item.statusLabel}</td>
                  <td>{formatDateTime(item.registeredAt)}</td>
                  <td>{formatDateTime(item.completedAt || item.cancelledAt)}</td>
                  <td>{formatDuration(item.totalWaitSeconds)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
