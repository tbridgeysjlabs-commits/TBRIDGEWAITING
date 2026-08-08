import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  api,
  formatDateTime,
  formatDateYYMMDD,
  formatDuration,
} from '../../api/client';
import AdminSidebar from '../../components/admin/AdminSidebar';
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

export default function HistoryPage() {
  const { facilityCode } = useParams();
  const { facilityUser, logoutFacility } = useAuth();
  const navigate = useNavigate();
  const { collapsed, toggle } = useSidebarCollapse('tb_admin_sidebar');
  const [preset, setPreset] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
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
    if (phone) params.set('phone', phone.replace(/\D/g, ''));
    if (totalCount) params.set('totalCount', totalCount);
    if (dailySeq) params.set('dailySeq', dailySeq);
    params.set('statuses', statuses.join(','));
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));
    return params.toString();
  };

  const search = async () => {
    if (!facilityUser || facilityUser.facilityCode !== facilityCode) return;
    try {
      const result = await api(`/admin/${facilityCode}/history?${queryString()}`);
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
  }, [page, pageSize, facilityCode, facilityUser]);

  if (!facilityUser || facilityUser.facilityCode !== facilityCode) {
    return <Navigate to={`/admin/${facilityCode}/login`} replace />;
  }

  const applyPreset = (key) => {
    setPreset(key);
    const range = rangeFromPreset(key);
    setStartDate(range.startDate);
    setEndDate(range.endDate);
  };

  const reset = () => {
    setPreset('all');
    setStartDate('');
    setEndDate('');
    setCompleted(true);
    setCancelled(true);
    setPhone('');
    setTotalCount('');
    setDailySeq('');
    setPage(1);
  };

  const toggleAll = () => {
    if (selected.length === data.items.length) setSelected([]);
    else setSelected(data.items.map((i) => i.id));
  };

  const exportExcel = async () => {
    try {
      const res = await api(
        `/admin/${facilityCode}/history/export?${queryString()}`,
        { raw: true }
      );
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'waiting-history.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setToast(e.message);
    }
  };

  const totalPages = Math.max(1, Math.ceil(data.total / pageSize));

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
        <h1>대기자 내역</h1>
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
            <span className="filter-label">상태</span>
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
          </div>
          <div className="filter-row">
            <label>
              연락처
              <input
                placeholder="숫자만 검색 ('-' 제외)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </label>
            <label>
              인원 수
              <input
                value={totalCount}
                onChange={(e) => setTotalCount(e.target.value)}
                style={{ width: 70 }}
              />
              명
            </label>
            <label>
              등록 번호
              <input
                value={dailySeq}
                onChange={(e) => setDailySeq(e.target.value)}
                style={{ width: 70 }}
              />
              번
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
            <button type="button" className="btn-ghost" onClick={reset}>
              초기화
            </button>
          </div>
        </section>

        <div className="list-toolbar">
          <span>
            총 {data.total} / 선택 {selected.length}
          </span>
          <button type="button" className="btn-ghost" onClick={toggleAll}>
            전체 선택
          </button>
          <button type="button" className="btn-dark" onClick={exportExcel}>
            엑셀 다운로드
          </button>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>선택</th>
                <th>입장일</th>
                <th>연락처</th>
                <th>인원 수</th>
                <th>등록 번호</th>
                <th>링크</th>
                <th>상태</th>
                <th>대기 시작 시간</th>
                <th>대기 종료 시간</th>
                <th>총 대기 시간</th>
                <th>카카오알림톡 발송시간</th>
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
                  <td>{formatDateYYMMDD(item.entryDate || item.registeredAt)}</td>
                  <td>{item.phoneDisplay}</td>
                  <td>{item.totalCount}명</td>
                  <td>{item.dailySeq}</td>
                  <td>
                    {item.completePageLink ? (
                      <a href={item.completePageLink} target="_blank" rel="noreferrer">
                        {item.completePageLink}
                      </a>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td>{item.statusLabel}</td>
                  <td>{formatDateTime(item.registeredAt)}</td>
                  <td>{formatDateTime(item.completedAt || item.cancelledAt)}</td>
                  <td>{formatDuration(item.totalWaitSeconds)}</td>
                  <td>{item.kakaoSentAt ? formatDateTime(item.kakaoSentAt) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="pagination">
          <label>
            페이지당 리스트 수
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
            >
              {[10, 20, 50].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <span>
            {data.total}개 중 {(page - 1) * pageSize + 1}-
            {Math.min(page * pageSize, data.total || 0)}
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
