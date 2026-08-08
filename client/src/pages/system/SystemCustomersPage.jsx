import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api, formatDateTime } from '../../api/client';
import SystemSidebar from '../../components/system/SystemSidebar';
import { useAuth } from '../../context/AuthContext';
import { useSidebarCollapse } from '../../hooks/useSidebarCollapse';

export default function SystemCustomersPage() {
  const { systemUser, logoutSystem } = useAuth();
  const navigate = useNavigate();
  const { collapsed, toggle } = useSidebarCollapse('tb_system_sidebar');
  const [facilityName, setFacilityName] = useState('');
  const [data, setData] = useState({ items: [], total: 0 });

  const load = () => {
    const qs = facilityName ? `?facilityName=${encodeURIComponent(facilityName)}` : '';
    return api(`/system-admin/customers${qs}`, {}, 'system').then(setData);
  };

  useEffect(() => {
    if (!systemUser) return;
    load().catch(() => setData({ items: [], total: 0 }));
  }, [systemUser]);

  if (!systemUser) return <Navigate to="/system-admin/login" replace />;

  return (
    <div className={`admin-layout ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <SystemSidebar
        collapsed={collapsed}
        onToggle={toggle}
        onLogout={() => {
          logoutSystem();
          navigate('/system-admin/login');
        }}
      />
      <main className="admin-main">
        <h1>고객 관리 (전체 시설사)</h1>
        <div className="filter-row" style={{ marginBottom: 16 }}>
          <input
            placeholder="시설사명 검색"
            value={facilityName}
            onChange={(e) => setFacilityName(e.target.value)}
          />
          <button type="button" className="btn-dark" onClick={load}>
            검색
          </button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>시설사명</th>
                <th>등록일시</th>
                <th>전화번호</th>
                <th>마케팅 동의 여부</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.id}>
                  <td>{item.facilityName}</td>
                  <td>{formatDateTime(item.registeredAt)}</td>
                  <td>{item.phoneDisplay}</td>
                  <td>
                    {item.marketingAgreed
                      ? `동의 (${formatDateTime(item.marketingAgreedAt)})`
                      : '미동의'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
