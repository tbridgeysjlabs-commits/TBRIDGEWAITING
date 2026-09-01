import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api, formatDateTime } from '../../api/client';
import FacilitySearchInput from '../../components/admin/FacilitySearchInput';
import SystemSidebar from '../../components/system/SystemSidebar';
import Toast from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';
import { useSidebarCollapse } from '../../hooks/useSidebarCollapse';
import {
  SEARCH_PERIOD_PRESETS,
  resolveSearchRange,
} from '../../utils/searchPresets';
import { formatDateTimeShortKst } from '../../utils/datetime.js';

const DEFAULT_FILTERS = {
  preset: 'all',
  startDate: '',
  endDate: '',
  agreed: true,
  notAgreed: true,
  phone: '',
  facilityName: '',
};

function buildCustomerQs(filters) {
  const range = resolveSearchRange(filters.preset, filters.startDate, filters.endDate);
  const marketing = [];
  if (filters.agreed) marketing.push('agreed');
  if (filters.notAgreed) marketing.push('not_agreed');
  const params = new URLSearchParams();
  if (range.startDate) params.set('startDate', range.startDate);
  if (range.endDate) params.set('endDate', range.endDate);
  if (marketing.length) params.set('marketing', marketing.join(','));
  if (filters.phone) params.set('phone', filters.phone);
  if (filters.facilityName?.trim()) {
    params.set('facilityName', filters.facilityName.trim());
  }
  params.set('pageSize', '500');
  return params.toString();
}

async function downloadBlob(res, filename) {
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function SystemCustomersPage() {
  const { systemUser, logoutSystem } = useAuth();
  const navigate = useNavigate();
  const { collapsed, toggle } = useSidebarCollapse('tb_system_sidebar');
  const [data, setData] = useState({ items: [], total: 0 });
  const [selected, setSelected] = useState([]);
  const [toast, setToast] = useState('');
  const [draft, setDraft] = useState(DEFAULT_FILTERS);
  const [applied, setApplied] = useState(DEFAULT_FILTERS);

  const load = useCallback(async () => {
    if (!systemUser) return;
    try {
      const result = await api(
        `/system-admin/customers?${buildCustomerQs(applied)}`,
        {},
        'system'
      );
      setData(result);
      setSelected([]);
    } catch (e) {
      setData({ items: [], total: 0 });
      setSelected([]);
      setToast(e.message);
      setTimeout(() => setToast(''), 2500);
    }
  }, [systemUser, applied]);

  useEffect(() => {
    load();
  }, [load]);

  if (!systemUser) return <Navigate to="/system-admin/login" replace />;

  const applyPreset = (key) => {
    setDraft((d) => ({ ...d, preset: key, startDate: '', endDate: '' }));
  };

  const onCustomDate = (which, value) => {
    setDraft((d) => ({
      ...d,
      preset: '',
      startDate: which === 'start' ? value : d.startDate,
      endDate: which === 'end' ? value : d.endDate,
    }));
  };

  const search = () => setApplied({ ...draft });

  const reset = () => {
    setDraft(DEFAULT_FILTERS);
    setApplied(DEFAULT_FILTERS);
  };

  const pageIds = useMemo(() => data.items.map((i) => i.id), [data.items]);
  const allSelected = pageIds.length > 0 && pageIds.every((id) => selected.includes(id));

  const toggleAll = () => {
    if (allSelected) setSelected((s) => s.filter((id) => !pageIds.includes(id)));
    else setSelected((s) => [...new Set([...s, ...pageIds])]);
  };

  const exportExcel = async () => {
    if (!selected.length) {
      setToast('선택된 항목이 없습니다');
      setTimeout(() => setToast(''), 2500);
      return;
    }
    try {
      const params = new URLSearchParams();
      params.set('ids', selected.join(','));
      const res = await api(
        `/system-admin/customers/export?${params}`,
        { raw: true },
        'system'
      );
      await downloadBlob(res, 'system-customers.xlsx');
    } catch (e) {
      setToast(e.message);
      setTimeout(() => setToast(''), 2500);
    }
  };

  return (
    <div className={`admin-layout system-admin ${collapsed ? 'sidebar-collapsed' : ''}`}>
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
        <header className="admin-header-text">
          <h1>고객 관리 (전체 시설사)</h1>
          <p className="admin-page-desc">
            전체 시설사에 등록된 고객과 마케팅 동의 상태입니다
          </p>
        </header>

        <section className="filter-box">
          <div className="filter-row">
            <span className="filter-label">검색 기간</span>
            <div className="preset-group">
              {SEARCH_PERIOD_PRESETS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  className={`chip ${draft.preset === p.key ? 'active' : ''}`}
                  onClick={() => applyPreset(p.key)}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <input
              type="date"
              value={draft.startDate}
              onChange={(e) => onCustomDate('start', e.target.value)}
            />
            <span>~</span>
            <input
              type="date"
              value={draft.endDate}
              onChange={(e) => onCustomDate('end', e.target.value)}
            />
          </div>

          <div className="filter-row">
            <span className="filter-label">마케팅 동의 여부</span>
            <label>
              <input
                type="checkbox"
                checked={draft.agreed}
                onChange={(e) => setDraft({ ...draft, agreed: e.target.checked })}
              />
              동의
            </label>
            <label>
              <input
                type="checkbox"
                checked={draft.notAgreed}
                onChange={(e) => setDraft({ ...draft, notAgreed: e.target.checked })}
              />
              미동의
            </label>
          </div>

          <div className="filter-row">
            <span className="filter-label">시설사명</span>
            <FacilitySearchInput
              value={draft.facilityName}
              onChange={(v) => setDraft({ ...draft, facilityName: v })}
              placeholder="시설사명 검색"
              valueMode="name"
              style={{ minWidth: 280, flex: 1 }}
            />
          </div>

          <div className="filter-row">
            <span className="filter-label">전화번호</span>
            <input
              type="tel"
              inputMode="numeric"
              placeholder="숫자만 입력"
              value={draft.phone}
              onChange={(e) =>
                setDraft({ ...draft, phone: e.target.value.replace(/\D/g, '') })
              }
              style={{ minWidth: 220 }}
            />
          </div>

          <div className="filter-actions">
            <button type="button" className="btn-dark" onClick={search}>
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
          <button
            type="button"
            className="btn-dark"
            onClick={exportExcel}
            disabled={!selected.length}
          >
            엑셀 다운로드
          </button>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    aria-label="전체 선택"
                  />
                </th>
                <th>시설사명</th>
                <th>등록일시</th>
                <th>전화번호</th>
                <th>마케팅 동의 여부</th>
              </tr>
            </thead>
            <tbody>
              {data.items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="empty-list">
                    검색 조건에 해당하는 고객이 없습니다.
                  </td>
                </tr>
              ) : (
                data.items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selected.includes(item.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelected((s) => [...s, item.id]);
                          } else {
                            setSelected((s) => s.filter((id) => id !== item.id));
                          }
                        }}
                      />
                    </td>
                    <td>{item.facilityName}</td>
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
