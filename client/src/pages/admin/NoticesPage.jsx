import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { api, formatDateTime } from '../../api/client';
import AdminSidebar from '../../components/admin/AdminSidebar';
import Toast from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';
import { useSidebarCollapse } from '../../hooks/useSidebarCollapse';

export default function NoticesPage() {
  const { facilityCode } = useParams();
  const { facilityUser, logoutFacility } = useAuth();
  const navigate = useNavigate();
  const { collapsed, toggle } = useSidebarCollapse('tb_admin_sidebar');
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!facilityUser || facilityUser.facilityCode !== facilityCode) return;
    api(`/admin/${facilityCode}/notices`)
      .then(setItems)
      .catch((e) => setToast(e.message));
  }, [facilityCode, facilityUser]);

  if (!facilityUser || facilityUser.facilityCode !== facilityCode) {
    return <Navigate to={`/admin/${facilityCode}/login`} replace />;
  }

  return (
    <div className={`admin-layout facility-admin ${collapsed ? 'sidebar-collapsed' : ''}`}>
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
        <header className="admin-header-text">
          <h1>공지사항</h1>
          <p className="admin-page-desc">서비스 업데이트 및 안내사항입니다</p>
        </header>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>제목</th>
                <th>등록일</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id}>
                  <td>
                    <button type="button" className="linkish" onClick={() => setSelected(row)}>
                      {row.title}
                    </button>
                  </td>
                  <td>{formatDateTime(row.createdAt)}</td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={2} style={{ textAlign: 'center', color: '#888' }}>
                    등록된 공지사항이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {selected && (
          <div className="modal-backdrop" onClick={() => setSelected(null)}>
            <div className="modal-card modal-card-wide" onClick={(e) => e.stopPropagation()}>
              <h2>{selected.title}</h2>
              <p style={{ color: '#888', marginTop: -8 }}>
                {formatDateTime(selected.createdAt)}
              </p>
              <div
                className="notice-content"
                dangerouslySetInnerHTML={{ __html: selected.contentHtml || '' }}
              />
              <div className="modal-actions">
                <button type="button" className="btn-primary" onClick={() => setSelected(null)}>
                  닫기
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
