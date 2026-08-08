import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { api, formatDateTime } from '../../api/client';
import AdminSidebar from '../../components/admin/AdminSidebar';
import { useAuth } from '../../context/AuthContext';
import { useSidebarCollapse } from '../../hooks/useSidebarCollapse';

export default function CustomersPage() {
  const { facilityCode } = useParams();
  const { facilityUser, logoutFacility } = useAuth();
  const navigate = useNavigate();
  const { collapsed, toggle } = useSidebarCollapse('tb_admin_sidebar');
  const [data, setData] = useState({ items: [], total: 0 });

  useEffect(() => {
    if (!facilityUser || facilityUser.facilityCode !== facilityCode) return;
    api(`/admin/${facilityCode}/customers`)
      .then(setData)
      .catch(() => setData({ items: [], total: 0 }));
  }, [facilityCode, facilityUser]);

  if (!facilityUser || facilityUser.facilityCode !== facilityCode) {
    return <Navigate to={`/admin/${facilityCode}/login`} replace />;
  }

  return (
    <div className={`admin-layout ${collapsed ? 'sidebar-collapsed' : ''}`}>
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
              {data.items.map((item) => (
                <tr key={item.id}>
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
